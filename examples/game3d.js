/**
 * game3d.js — Runtime MULTI-PERFIL Three.js del Protocolo GAME.
 *
 * No es un motor universal (imposible por diseño: el protocolo declara DATOS, la
 * semántica de ejecución es del motor — SPEC §8). Es un chasis común + un módulo de
 * runtime por perfil, despachado por la clave `profile` de la meta del artefacto.
 * Perfil nuevo => runtime nuevo, igual que perfil nuevo => descriptor nuevo.
 *
 * Runtimes incluidos: adventure, dungeon, monster-rpg, voxel.
 * Uso: game3d.html?game=<archivo>.generated.js
 */
import * as THREE from 'three';
// Lógica PURA (fórmulas de combate, visión, colisión): módulo aparte SIN THREE/DOM,
// verificado en Node por test/game3d-logic.js dentro de `npm test`.
import { typeMult, expandMoves, makeMon as makeMonPure, damage, catchProb,
         gainXP as gainXPPure, canStep, trainerInSight,
         shooterInit, shooterTick,
         sudokuInit, sudokuSet, sudokuHint,
         pegInit, pegMove, pegMoves,
         ppInit, ppDecide, ppEntrant,
         tdInit, tdBuild, tdSell, tdStartWave, tdTick, tdPath, tdPos, TD_COLS, TD_ROWS } from './game3d-logic.mjs';

// ---------------- registro de runtimes ----------------
export const runtimes = {};
export const register = (profile, fn) => { runtimes[profile] = fn; };

// ---------------- chasis común ----------------
export const rgb31 = c => 'rgb(' + Math.round(c[0]*255/31) + ',' + Math.round(c[1]*255/31) + ',' + Math.round(c[2]*255/31) + ')';
export function gridCanvas(grid, palette, t0) {
  const n = grid.length, s = 8, cv = document.createElement('canvas');
  cv.width = cv.height = n * s; const x = cv.getContext('2d');
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = grid[r][c]; if (t0 && i === 0) continue;
    x.fillStyle = rgb31((palette || [])[i] || [0, 0, 0]); x.fillRect(c*s, r*s, s, s);
  }
  return cv;
}
export function canvasTex(cv) {
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function billboard(cv, scale) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(cv), transparent: true }));
  sp.scale.set(scale, scale, 1); return sp;
}
export function humanCanvas(pal) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = rgb31((pal || [])[6] || [28, 24, 20]); x.fillRect(22, 6, 20, 18);
  x.fillStyle = rgb31((pal || [])[3] || [16, 14, 12]); x.fillRect(18, 24, 28, 22); x.fillRect(20, 46, 8, 12); x.fillRect(36, 46, 8, 12);
  return cv;
}
export function makeStage() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0e14); scene.fog = new THREE.Fog(0x0a0e14, 14, 32);
  const cam = new THREE.PerspectiveCamera(50, 16/9, .1, 200);
  const ren = new THREE.WebGLRenderer({ antialias: true });
  const size = () => { const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    cam.aspect = w/h; cam.updateProjectionMatrix(); ren.setSize(w, h); };
  size(); addEventListener('resize', size);
  document.body.appendChild(ren.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.2); sun.position.set(4, 10, 3); scene.add(sun);
  return { scene, cam, ren, THREE };
}
// Construye el grupo 3D de un tilemap: suelo por celda + caja para tiles sólidos.
export function tilemapGroup(G, tilemap, attrs, solidSet, heights) {
  const g = new THREE.Group(), cache = {};
  const tex = (id, p) => cache[id + '/' + p] || (cache[id + '/' + p] = canvasTex(gridCanvas(G.TILE_ART[id] || [[0]], G.PALETTES[p] || G.PALETTES[0], false)));
  for (let r = 0; r < tilemap.length; r++) for (let c = 0; c < tilemap[0].length; c++) {
    const id = tilemap[r][c], p = (attrs[r] || [])[c] || 0, mat = new THREE.MeshLambertMaterial({ map: tex(id, p) });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); f.rotation.x = -Math.PI/2; f.position.set(c, 0, r); g.add(f);
    if (solidSet.has(id)) { const h = (heights || {})[id] || .9;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), mat); b.position.set(c, h/2, r); g.add(b); }
  }
  return g;
}
export function sfxPlayer(G) {
  let ctx = null;
  return name => { try { const d = (G.SFX || {})[name]; if (!d) return; ctx = ctx || new AudioContext();
    const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'square'; o.frequency.value = d.freq;
    gn.gain.value = .04; o.connect(gn); gn.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d.dur); } catch (e) {} };
}
export const ui = {
  top: t => document.getElementById('g3d-top').innerHTML = t,
  side: t => document.getElementById('g3d-side').innerHTML = t,
  msg: (t, win) => { const m = document.getElementById('g3d-msg'); m.textContent = t || ''; m.className = win ? 'win' : ''; },
  panel: (html, on) => { const p = document.getElementById('g3d-panel'); p.innerHTML = html || ''; p.classList.toggle('on', !!on); },
  overlay: html => { const o = document.getElementById('g3d-overlay'); o.innerHTML = html || ''; o.classList.toggle('on', !!html); },
};

// ============================================================================
// RUNTIME adventure + dungeon (misma mecánica; adventure = una escena sin hp)
// ============================================================================
function tileRuntime(G, kind) {
  // normaliza adventure a la forma multi-escena de dungeon
  const SCENES = kind === 'adventure'
    ? { main: Object.assign({ npcs: (G.ENTITIES||{}).npcs || [], pickups: (G.ENTITIES||{}).pickups || [],
        warps: [], enemies: [], goal: (G.ENTITIES||{}).goal || null, entry: G.PLAYER.start }, G.SCENE) }
    : G.SCENES;
  const start = kind === 'adventure' ? { scene: 'main', col: G.PLAYER.start.col, row: G.PLAYER.start.row } : G.PLAYER.start;
  const SOLIDT = new Set(Object.entries(G.TILES || {}).filter(([, t]) => t.solid).map(([id]) => Number(id)));
  const { scene, cam, ren } = makeStage();
  const sfx = sfxPlayer(G);
  const S = { cur: start.scene, pos: { col: start.col, row: start.row }, face: 1, hp: G.PLAYER.hp || 3,
              inv: new Set(), collected: new Set(), won: false, enemies: {} };
  const sc = () => SCENES[S.cur];
  const enemiesOf = n => S.enemies[n] || (S.enemies[n] = (SCENES[n].enemies || []).map(e => ({ ...e, hp: e.hp || 1, dir: e.dir || 1, axis: e.axis || 'h', alive: true })));

  let world = null; const dyn = new THREE.Group(); scene.add(dyn);
  const playerSpr = billboard(gridCanvas(G.TILE_ART[G.PLAYER.tile] || [[0]], G.PALETTES[G.PLAYER.pal || 0], true), 1); scene.add(playerSpr);
  playerSpr.position.set(start.col, .6, start.row);
  function build() {
    if (world) scene.remove(world);
    const s = sc(); world = tilemapGroup(G, s.tilemap, s.attrs, SOLIDT, { 17: 1.0, 51: .25, 52: .9, 50: .7, 20: .25 }); scene.add(world);
    dyn.clear();
    for (const n of (s.npcs || [])) { const b = billboard(gridCanvas(G.TILE_ART[n.tile] || [[0]], G.PALETTES[n.pal || 0], true), .9); b.position.set(n.col, .55, n.row); dyn.add(b); }
    for (const w of (s.warps || [])) { const m = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, .9), new THREE.MeshBasicMaterial({ color: 0xffd479 })); m.position.set(w.col, .04, w.row); dyn.add(m); }
    if (s.goal) { const b = billboard(gridCanvas(G.TILE_ART[s.goal.tile] || [[0]], G.PALETTES[s.goal.pal || 0], true), .9); b.position.set(s.goal.col, .55, s.goal.row); dyn.add(b); }
    refreshDyn();
  }
  const pickSprs = {}, enemySprs = {};
  function refreshDyn() {
    for (const k of Object.keys(pickSprs)) { dyn.remove(pickSprs[k]); delete pickSprs[k]; }
    for (const k of Object.keys(enemySprs)) { dyn.remove(enemySprs[k]); delete enemySprs[k]; }
    const s = sc();
    (s.pickups || []).forEach((p, i) => { if (S.collected.has(S.cur + '/' + p.item)) return;
      const b = billboard(gridCanvas(G.TILE_ART[p.tile] || [[0]], G.PALETTES[p.pal || 0], true), .8); b.position.set(p.col, .5, p.row); dyn.add(b); pickSprs[i] = b; });
    enemiesOf(S.cur).forEach((e, i) => { if (!e.alive) return;
      const b = billboard(gridCanvas(G.TILE_ART[e.tile] || [[0]], G.PALETTES[e.pal || 0], true), .9); b.position.set(e.col, .55, e.row); dyn.add(b); enemySprs[i] = b; });
  }
  function hud() {
    ui.top('<b>' + (G.name || kind) + '</b> · Sala: ' + S.cur + (kind === 'dungeon' ? ' · Vida: ' + '♥'.repeat(Math.max(0, S.hp)) : ''));
    ui.side('Inventario: ' + ([...S.inv].join(', ') || '—'));
  }
  const solid = (c, r) => { const tm = sc().tilemap;
    if (c < 0 || r < 0 || r >= tm.length || c >= tm[0].length) return true;
    if ((sc().npcs || []).some(n => n.col === c && n.row === r)) return true;
    if ((sc().warps || []).some(w => w.col === c && w.row === r)) return false;
    if (sc().goal && sc().goal.col === c && sc().goal.row === r) return false;
    return SOLIDT.has(tm[r][c]); };
  function move(dc, dr) {
    if (S.won) return;
    if (dc) S.face = dc < 0 ? -1 : 1;
    const nc = S.pos.col + dc, nr = S.pos.row + dr, s = sc();
    const w = (s.warps || []).find(w => w.col === nc && w.row === nr);
    if (w) { if (w.locked && !S.inv.has(w.locked)) { ui.msg((G.TEXT || {}).locked || 'Cerrada.'); return; }
      S.cur = w.to; S.pos = { col: w.at.col, row: w.at.row }; build(); hud(); ui.msg('Entras en: ' + w.to); return; }
    if (solid(nc, nr)) return;
    S.pos = { col: nc, row: nr };
    for (const p of (s.pickups || [])) if (!S.collected.has(S.cur + '/' + p.item) && p.col === nc && p.row === nr) {
      S.collected.add(S.cur + '/' + p.item); S.inv.add(p.item); ui.msg((G.TEXT || {}).got_key || ('Recogido: ' + p.item)); hud(); refreshDyn(); }
    if (enemiesOf(S.cur).some(e => e.alive && e.col === nc && e.row === nr)) hurt();
    const g = s.goal;
    if (g && g.col === nc && g.row === nr) {
      if (g.locked && !S.inv.has(g.locked)) { ui.msg((G.TEXT || {}).locked || 'Cerrada.'); return; }
      S.won = true; sfx('win'); ui.msg((G.WIN && G.WIN.text) || '¡Ganaste!', true); }
  }
  function interact() {
    if (S.won) return; const s = sc();
    for (const e of enemiesOf(S.cur)) if (e.alive && Math.abs(e.col - S.pos.col) + Math.abs(e.row - S.pos.row) === 1) {
      e.hp--; sfx('hit'); if (e.hp <= 0) { e.alive = false; refreshDyn(); ui.msg((G.TEXT || {}).defeat || 'Enemigo derrotado.'); }
      else ui.msg('Golpeas al enemigo · ' + e.hp + ' HP'); return; }
    for (const n of (s.npcs || [])) if (Math.abs(n.col - S.pos.col) + Math.abs(n.row - S.pos.row) === 1) {
      ui.msg((G.TEXT || {})[n.dialogue] || n.dialogue || '...'); return; }
  }
  function hurt() { if (S.won) return; S.hp--; sfx('hit');
    if (S.hp <= 0) { S.hp = G.PLAYER.hp || 3; S.cur = start.scene; S.pos = { col: start.col, row: start.row }; build(); ui.msg((G.TEXT || {}).fallen || 'Has caido.'); }
    else { S.pos = { col: sc().entry.col, row: sc().entry.row }; ui.msg((G.TEXT || {}).hit || 'Te golpearon.'); } hud(); }
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') move(-1, 0); else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowUp') move(0, -1); else if (e.key === 'ArrowDown') move(0, 1);
    else if (e.key === ' ') interact(); else return; e.preventDefault(); });
  build(); hud(); ui.msg((G.TEXT || {}).intro || '');
  let frame = 0;
  (function loop() { requestAnimationFrame(loop); frame++;
    if (frame % 24 === 0 && !S.won) { for (const e of enemiesOf(S.cur)) { if (!e.alive) continue;
      const dx = e.axis === 'v' ? 0 : e.dir, dy = e.axis === 'v' ? e.dir : 0;
      const tm = sc().tilemap; const nc = e.col + dx, nr = e.row + dy;
      const bad = nc < 0 || nr < 0 || nr >= tm.length || nc >= tm[0].length || SOLIDT.has(tm[nr][nc]);
      if (bad) e.dir *= -1; else { e.col = nc; e.row = nr; if (e.col === S.pos.col && e.row === S.pos.row) hurt(); } }
      refreshDyn(); }
    // tween visual: el estado es instantaneo (logica/tests intactos), el sprite interpola
    playerSpr.position.lerp(new THREE.Vector3(S.pos.col, .6, S.pos.row), .25);
    playerSpr.scale.set(S.face, 1, 1);
    cam.position.lerp(new THREE.Vector3(S.pos.col, 7.5, S.pos.row + 7), .12);
    cam.lookAt(S.pos.col, .5, S.pos.row); ren.render(scene, cam); })();
  return { S, kind };
}
register('adventure', G => tileRuntime(G, 'adventure'));
register('dungeon', G => tileRuntime(G, 'dungeon'));

// ============================================================================
// RUNTIME voxel — el adaptador oficial elevado a runtime (órbita automática)
// ============================================================================
register('voxel', G => {
  const { scene, cam, ren } = makeStage();
  const names = Object.keys(G.VOXELS || {}); let total = 0, off = 0;
  for (const n of names) { const st = G.VOXELS[n], vox = st.voxels || []; total += vox.length;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .85 }), vox.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    vox.forEach((v, i) => { m4.makeTranslation(v.x + .5 + off, v.y + .5, v.z + .5); mesh.setMatrixAt(i, m4);
      const rgb = ((G.MATERIALS || {})[v.m] || {}).color || [255, 0, 255]; col.setRGB(rgb[0]/255, rgb[1]/255, rgb[2]/255); mesh.setColorAt(i, col); });
    scene.add(mesh); off += ((st.bounds || {}).max || [4])[0] + 4; }
  ui.top('<b>' + (G.name || 'voxel') + '</b> · ' + names.length + ' estructura(s) · ' + total + ' voxels');
  ui.msg('Runtime voxel: órbita automática.');
  let t = 0;
  (function loop() { requestAnimationFrame(loop); t += .005;
    cam.position.set(off/2 + Math.cos(t) * 10, 7, 4 + Math.sin(t) * 10); cam.lookAt(off/2 - 2, 1.5, 1); ren.render(scene, cam); })();
  return { total, names };
});

// ============================================================================
// RUNTIME monster-rpg — el motor Kaiju Island 3D, generalizado a cualquier GAME
// ============================================================================
register('monster-rpg', G => {
  const TILES = G.TILES || {}, BAL = G.BALANCE || {}, TEXTS = G.TEXT || {};
  const SOLID = new Set(G.SOLID_TILES || []);
  const COLS = (G.platform && G.platform.cols) || 12, ROWS = (G.platform && G.platform.rows) || 10;
  const { scene, cam, ren } = makeStage(); const sfx = sfxPlayer(G);
  const defeated = new Set();
  const monCanvas = (name, p) => gridCanvas((G.SPRITES || {})[name] || Object.values(G.SPRITES || { x: [[0]] })[0] || [[0]],
    (G.SPRITE_PALETTES || [[[0,0,0]]])[p % Math.max(1, (G.SPRITE_PALETTES || [1]).length)] || [[0,0,0]], true);
  function fallbackTerrain() { const tm = [], at = [];
    for (let r = 0; r < ROWS; r++) { const tr = [], ar = [];
      for (let c = 0; c < COLS; c++) { const ids = Object.keys(TILES).map(Number);
        const grass = ids.find(i => !TILES[i].solid) || ids[0] || 0;
        const enc = ids.find(i => TILES[String(i)].encounter);
        const wall = ids.find(i => TILES[String(i)].solid);
        let t = grass;
        if (r === 0 || r === ROWS-1 || c === 0 || c === COLS-1) t = wall != null ? wall : grass;
        else if (enc != null && (r + c) % 5 === 0) t = enc;
        tr.push(t); ar.push(0); } tm.push(tr); at.push(ar); }
    return { tilemap: tm, attrs: at }; }
  const terrainOf = a => (G.MAPS && G.MAPS[a]) ? G.MAPS[a] : fallbackTerrain();
  let world = null, terrain = null;
  const S = { mode: 'world', area: Object.keys(G.OVERWORLD || {})[0] || 'field', inside: null, returnTo: null,
              pos: { col: Math.min(COLS-2, Math.max(1, Math.round((G.PLAYER.start && G.PLAYER.start.x || 16) / 8))),
                     row: Math.min(ROWS-2, Math.max(1, Math.round((G.PLAYER.start && G.PLAYER.start.y || 16) / 8))) },
              face: 1, money: (G.ECONOMY || {}).startMoney || 0, bag: Object.assign({}, G.PLAYER.inventory || {}),
              party: [], battle: null, victory: false };
  const expand = l => expandMoves(l, G.MOVES);
  const makeMon = (src, lvl) => makeMonPure(src, lvl, G.SPECIES, G.MOVES);
  S.party.push(makeMon(G.PLAYER.starter || Object.keys(G.SPECIES || { X: 1 })[0], G.PLAYER.level || 5));
  const playerSpr = billboard(monCanvas(S.party[0].sprite || 'x', 0), 1); scene.add(playerSpr);
  function build(area) { if (world) scene.remove(world);
    terrain = S.inside ? G.MAPS[S.inside] : terrainOf(area);
    world = tilemapGroup(G, terrain.tilemap, terrain.attrs, SOLID, { 17: 1, 19: 1, 20: .25, 50: .7 });
    const ow = !S.inside && (G.OVERWORLD || {})[area];
    if (ow) { for (const n of (ow.npcs || [])) { const b = billboard(humanCanvas(G.PALETTES[n.pal || 1]), .9); b.position.set(n.col, .55, n.row); world.add(b); }
      for (const t of (ow.trainers || [])) if (!defeated.has(t.name)) { const b = billboard(humanCanvas(G.PALETTES[(G.TRAINERS[t.name] || {}).pal || 0]), .95); b.position.set(t.col, .55, t.row); world.add(b); }
      for (const w of (ow.warps || [])) { const m = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, .9), new THREE.MeshBasicMaterial({ color: 0xffd479 })); m.position.set(w.col, .04, w.row); world.add(m); } }
    scene.add(world); }
  function hud() { ui.top('<b>' + (G.name || 'monster-rpg') + '</b> · ' + (S.inside || S.area) + ' · <span style="color:#ffd479">' + S.money + ' ₲</span>');
    ui.side(S.party.map(m => '<div class="chip"><b>' + m.name + '</b> N' + m.lvl + ' · ' + m.hp + '/' + m.maxhp + '</div>').join('')); }
  const cell = (c, r) => (terrain.tilemap[r] || [])[c];
  const solidAt = (c, r) => !canStep(terrain.tilemap, SOLID, c, r);
  const mult = (a, d) => typeMult(G.TYPE_CHART, a, d);
  function bpaint() { const B = S.battle;
    const bar = m => '<span class="bar"><i style="width:' + Math.max(0, 100 * m.hp / m.maxhp) + '%"></i></span>';
    const menu = B.sub === 'moves' ? B.mine.moves.map((m, i) => '<b>' + (i+1) + '</b> ' + m.name).join(' · ') + ' · <b>0</b> volver'
      : B.sub === 'bag' ? Object.entries(S.bag).filter(([, q]) => q > 0).map(([it, q], i) => '<b>' + (i+1) + '</b> ' + it + '×' + q).join(' · ') + ' · <b>0</b> volver'
      : '<b>1</b> Luchar · <b>2</b> Mochila · <b>3</b> Huir';
    ui.panel('<div class="row"><span><b>' + B.foe.name + '</b> N' + B.foe.lvl + ' ' + bar(B.foe) + ' ' + B.foe.hp + '/' + B.foe.maxhp + '</span>' +
      '<span><b>' + B.mine.name + '</b> N' + B.mine.lvl + ' ' + bar(B.mine) + ' ' + B.mine.hp + '/' + B.mine.maxhp + '</span></div>' +
      '<div class="menu">' + menu + '</div><div class="blog">' + (B.log || []).slice(-3).join('<br>') + '</div>', true); }
  const blog = t => { S.battle.log = (S.battle.log || []).concat(t); };
  function startBattle(queue, meta) { S.mode = 'battle';
    S.battle = { queue, meta, foe: queue.shift(), mine: S.party.find(m => m.hp > 0), sub: 'menu', foeSkip: false, log: [] }; bpaint(); }
  function endBattle(t) { ui.panel('', false); S.battle = null; S.mode = 'world'; hud(); if (t) ui.msg(t); }
  function applyEffect(mv, from, to) {
    if (mv.effect === 'leech') { const h = Math.max(1, Math.round((mv.power || 4) / 2)); from.hp = Math.min(from.maxhp, from.hp + h); blog(from.name + ' drena ' + h); }
    else if (mv.effect === 'flinch') { if (to === S.battle.foe) S.battle.foeSkip = true; blog(to.name + ' retrocede'); }
    else if (['burn', 'paralyze', 'slow'].includes(mv.effect) && !to.status) { to.status = mv.effect; blog(to.name + ': ' + mv.effect); } }
  function foeTurn() { const B = S.battle; if (!B || B.foe.hp <= 0) return;
    if (B.foeSkip) { B.foeSkip = false; }
    else if (!(B.foe.status === 'paralyze' && Math.random() < .4)) {
      const mv = B.foe.moves[Math.floor(Math.random() * B.foe.moves.length)] || { name: 'golpe', power: 4, type: 'NORMAL' };
      const d = damage(mv, B.foe, B.mine, G.TYPE_CHART, Math.random());
      B.mine.hp = Math.max(0, B.mine.hp - d); sfx('hit'); blog(B.foe.name + ': ' + mv.name + ' -' + d);
      if (mv.effect && Math.random() < (mv.chance || 0)) applyEffect(mv, B.foe, B.mine); }
    if (B.mine.status === 'burn') B.mine.hp = Math.max(0, B.mine.hp - 1);
    if (B.foe.status === 'burn') B.foe.hp = Math.max(0, B.foe.hp - 1);
    if (B.mine.hp <= 0) { sfx('faint'); const nx = S.party.find(m => m.hp > 0);
      if (nx) { B.mine = nx; blog('¡Adelante, ' + nx.name + '!'); }
      else { for (const m of S.party) { m.hp = m.maxhp; m.status = null; }
        S.inside = null; S.area = Object.keys(G.OVERWORLD || { field: 1 })[0]; build(S.area);
        endBattle('Te has quedado sin criaturas... despiertas al inicio.'); return; } }
    if (B.foe.hp <= 0) { foeDown(); return; } bpaint(); }
  function gainXP(w, foe) {
    const log = gainXPPure(w, foe, BAL, G.EVOLUTIONS, G.MOVES);
    if (log.length) sfx('levelup');
    log.forEach(blog);
  }
  function foeDown() { const B = S.battle; sfx('win'); blog(B.foe.name + ' cae'); gainXP(B.mine, B.foe); hud();
    if (B.queue.length) { B.foe = B.queue.shift(); blog('Envía a ' + B.foe.name); bpaint(); return; }
    if (B.meta.trainer) { S.money += B.meta.prize || 0; defeated.add(B.meta.trainer);
      const champ = /CHAMPION/i.test(B.meta.trainer);
      endBattle('Vences a ' + B.meta.trainer + ' (+' + (B.meta.prize || 0) + ' ₲).');
      if (champ) { S.victory = true; ui.overlay('<div>🏆 ' + (TEXTS.victory || '¡Campeón!') + '</div>'); } return; }
    endBattle('Victoria salvaje.'); }
  function act(k) { const B = S.battle; if (!B) return;
    if (B.sub === 'menu') { if (k === '1') { B.sub = 'moves'; bpaint(); }
      else if (k === '2') { B.sub = 'bag'; bpaint(); }
      else if (k === '3') { if (!B.meta.wild) { blog('¡No puedes huir!'); foeTurn(); return; }
        if (Math.random() < (BAL.runChance || .5)) endBattle('Escapas.'); else { blog('No escapas'); foeTurn(); } } return; }
    if (k === '0') { B.sub = 'menu'; bpaint(); return; }
    const i = parseInt(k, 10) - 1; if (isNaN(i) || i < 0) return;
    if (B.sub === 'moves') { const mv = B.mine.moves[i]; if (!mv) return; B.sub = 'menu';
      const d = damage(mv, B.mine, B.foe, G.TYPE_CHART, Math.random());
      B.foe.hp = Math.max(0, B.foe.hp - d); sfx(mult(mv.type, B.foe.type) > 1 ? 'crit' : 'hit');
      blog(B.mine.name + ': ' + mv.name + ' -' + d);
      if (mv.effect && Math.random() < (mv.chance || 0)) applyEffect(mv, B.mine, B.foe);
      if (B.foe.hp <= 0) { foeDown(); return; } foeTurn(); return; }
    if (B.sub === 'bag') { const items = Object.entries(S.bag).filter(([, q]) => q > 0); const [it] = items[i] || []; if (!it) return; B.sub = 'menu';
      const def = (G.ITEMS || {})[it] || {};
      if (def.effect === 'heal') { S.bag[it]--; B.mine.hp = Math.min(B.mine.maxhp, B.mine.hp + (def.amount || 10)); blog(it + ' +' + (def.amount || 10)); }
      else if (def.effect === 'cure') { S.bag[it]--; B.mine.status = null; blog(it + ': curado'); }
      else if (def.effect === 'catch') { if (!B.meta.wild) { blog('¡Es de otro entrenador!'); foeTurn(); bpaint(); return; }
        S.bag[it]--; const p = catchProb(BAL, B.foe);
        if (Math.random() < p) { sfx('catch'); B.foe.status = null;
          if (S.party.length < 6) S.party.push(B.foe); endBattle('¡' + B.foe.name + ' capturado!'); hud(); return; }
        blog('¡Se libera!'); }
      foeTurn(); bpaint(); return; } }
  function trainerSight() { const ow = !S.inside && (G.OVERWORLD || {})[S.area]; if (!ow) return false;
    const t = trainerInSight(ow.trainers, defeated, S.pos, solidAt);
    if (!t) return false;
    const def = G.TRAINERS[t.name] || {}; ui.msg(t.name + ': "' + (def.dialogue || '...') + '"'); sfx('encounter');
    startBattle((def.team || []).map(m => makeMon(m, def.level || m.level || 5)), { trainer: t.name, prize: def.prize || 0 });
    return true; }
  function move(dc, dr) { if (S.mode !== 'world' || S.victory) return;
    if (dc) S.face = dc < 0 ? -1 : 1;
    const nc = S.pos.col + dc, nr = S.pos.row + dr;
    const ow = !S.inside && (G.OVERWORLD || {})[S.area];
    if (ow) { const w = (ow.warps || []).find(w => w.col === nc && w.row === nr);
      if (w) { if (G.MAPS && G.MAPS[w.target]) { S.inside = w.target; S.returnTo = S.area;
          S.pos = { col: (w.entry || {}).col || 1, row: (w.entry || {}).row || 1 }; build(S.area); hud(); ui.msg('Entras en: ' + w.target); }
        else { S.area = w.target; S.pos = { col: 1, row: Math.floor(ROWS / 2) }; build(w.target); hud(); ui.msg('Llegas a: ' + w.target); } return; }
      if ((ow.npcs || []).some(n => n.col === nc && n.row === nr)) return;
      if ((ow.trainers || []).some(t => !defeated.has(t.name) && t.col === nc && t.row === nr)) return; }
    if (solidAt(nc, nr)) return;
    S.pos = { col: nc, row: nr };
    if (S.inside) { const ex = (G.MAPS[S.inside] || {}).exit;
      if (ex && ex.col === nc && ex.row === nr) { const ret = (G.MAPS[S.inside] || {}).return || { col: 1, row: 1 };
        S.area = S.returnTo; S.inside = null; S.pos = { col: ret.col, row: ret.row }; build(S.area); hud(); ui.msg('Vuelves a: ' + S.area); return; } }
    if (trainerSight()) return;
    const t = cell(nc, nr);
    if (TILES[String(t)] && TILES[String(t)].encounter && Math.random() < (BAL.encounterRate || .15)) {
      const pool = (G.ENCOUNTERS || {})[S.area] || (G.WILD_LIST || []);
      if (pool.length) { const pick = pool[Math.floor(Math.random() * pool.length)];
        const lvl = Math.max(2, S.party[0].lvl + (Math.floor(Math.random() * 3) - 1));
        sfx('encounter'); ui.msg('¡Un ' + pick.name + ' salvaje!'); startBattle([makeMon(pick, lvl)], { wild: true }); } } }
  function talk() { const ow = !S.inside && (G.OVERWORLD || {})[S.area]; if (!ow) return;
    for (const n of (ow.npcs || [])) if (Math.abs(n.col - S.pos.col) + Math.abs(n.row - S.pos.row) === 1) { ui.msg(n.dialogue || '...'); return; } }
  addEventListener('keydown', e => { if (S.victory) return;
    if (S.mode === 'battle') { act(e.key); e.preventDefault(); return; }
    if (e.key === 'ArrowLeft') move(-1, 0); else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowUp') move(0, -1); else if (e.key === 'ArrowDown') move(0, 1);
    else if (e.key === ' ') talk(); else return; e.preventDefault(); });
  build(S.area); hud(); ui.msg(TEXTS.intro || (G.name || ''));
  playerSpr.position.set(S.pos.col, .6, S.pos.row);
  (function loop() { requestAnimationFrame(loop);
    // tween visual: el estado es instantaneo (logica/tests intactos), el sprite interpola
    playerSpr.position.lerp(new THREE.Vector3(S.pos.col, .6, S.pos.row), .25);
    playerSpr.scale.set(S.face, 1, 1);
    cam.position.lerp(new THREE.Vector3(S.pos.col, 7.5, S.pos.row + 7), .12);
    cam.lookAt(S.pos.col, .5, S.pos.row); ren.render(scene, cam); })();
  return { S, defeated };
});

// ============================================================================
// RUNTIME quiz — el perfil puro-datos, jugable: rondas, timer y puntuación
// ============================================================================
register('quiz', G => {
  const { scene, cam, ren } = makeStage();
  // fondo: un cubo giratorio por categoría
  const cats = Object.keys(G.CATEGORIES || {});
  cats.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / Math.max(1, cats.length), .55, .5) }));
    m.position.set(i * 2.4 - cats.length, 1.4, 0); m.userData.spin = .004 + i * .002; scene.add(m);
  });
  cam.position.set(0, 2.4, 7); cam.lookAt(0, 1.2, 0);
  const rounds = Object.keys(G.ROUNDS || {}).sort((a, b) => Number(a) - Number(b));
  const S = { round: 0, qIdx: 0, score: 0, aciertos: 0, total: 0, timer: 0, done: false };
  const qlist = () => (G.ROUNDS[rounds[S.round]] || {}).questions || [];
  const q = () => (G.QUESTIONS || {})[qlist()[S.qIdx]];
  function paint() {
    const Q = q(); if (!Q) return;
    ui.top('<b>' + (G.name || 'quiz') + '</b> · ronda ' + rounds[S.round] + '/' + rounds.length +
           ' · <span style="color:#ffd479">' + S.score + ' pts</span> · ' + S.aciertos + '/' + S.total + ' aciertos');
    ui.panel('<div class="row"><span><b>' + ((G.CATEGORIES[Q.category] || {}).name || Q.category) + '</b> · ' +
      Q.difficulty + ' · ' + (Q.points || 0) + ' pts · ⏱ <span id="g3d-qt">' + Math.ceil(S.timer / 60) + '</span>s</span></div>' +
      '<div class="menu" style="font-size:15px;margin-bottom:6px;color:#e6edf5">' + Q.text + '</div>' +
      '<div class="menu">' + (Q.options || []).map((o, i) => '<b>' + (i + 1) + '</b> ' + o).join(' · ') + '</div>', true);
  }
  function next(hit, why) {
    if (S.done) return;
    S.total++;
    if (hit) { S.score += (q().points || 0); S.aciertos++; sfx3(880); ui.msg((G.TEXT || {}).correct || '¡Correcto!'); }
    else { sfx3(196); ui.msg(why || (G.TEXT || {}).wrong || 'Fallo.'); }
    S.qIdx++;
    if (S.qIdx >= qlist().length) {
      const reward = (G.ROUNDS[rounds[S.round]] || {}).reward || 0; S.score += reward;
      ui.msg(((G.TEXT || {}).win || 'Ronda superada') + ' +' + reward + ' pts');
      S.round++; S.qIdx = 0;
      if (S.round >= rounds.length) {
        S.done = true; ui.panel('', false);
        ui.overlay('<div>🏆 ' + S.score + ' pts · ' + S.aciertos + '/' + S.total + ' aciertos<br>' +
          '<span style="font-size:13px;color:#7b8696">' + (G.name || '') + ' · perfil quiz (puro-datos) · game3d</span></div>');
        return;
      }
    }
    S.timer = ((q() || {}).seconds || 20) * 60; paint();
  }
  function sfx3(freq) { try { const A = sfx3.ctx || (sfx3.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = freq;
    g.gain.value = .04; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + .12); } catch (e) {} }
  addEventListener('keydown', e => {
    if (S.done) return;
    const i = parseInt(e.key, 10) - 1; if (isNaN(i) || i < 0) return;
    const Q = q(); if (!Q || !(Q.options || [])[i]) return;
    next(String(Q.options[i]) === String(Q.answer)); e.preventDefault();
  });
  if (!rounds.length || !q()) { ui.msg('Este quiz no declara rondas/preguntas.'); return { S }; }
  S.timer = ((q() || {}).seconds || 20) * 60; paint(); ui.msg((G.TEXT || {}).intro || '');
  (function loop() { requestAnimationFrame(loop);
    scene.traverse(o => { if (o.userData && o.userData.spin) { o.rotation.y += o.userData.spin; o.rotation.x += o.userData.spin * .6; } });
    if (!S.done && q()) { S.timer--;
      const el = document.getElementById('g3d-qt'); if (el) el.textContent = Math.max(0, Math.ceil(S.timer / 60));
      if (S.timer <= 0) next(false, 'Tiempo agotado.'); }
    ren.render(scene, cam); })();
  return { S };
});

// ============================================================================
// RUNTIME shooter — render Three.js de la simulación PURA (game3d-logic.mjs):
// el runtime solo pinta el estado y recoge input; la partida entera es
// verificable en Node (test/game3d-logic.js la gana y la pierde).
// ============================================================================
register('shooter', G => {
  const { scene, cam, ren } = makeStage();
  const S = shooterInit(G);
  // mapeo sim -> mundo: (x, y) -> (x, .5, -y); la nave abajo, las oleadas entran por -z lejano
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h),
    new THREE.MeshLambertMaterial({ color: 0x0d1420 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(S.w / 2, 0, -S.h / 2); scene.add(floor);
  const ship = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x39d5ff, emissive: 0x0a3b4d }));
  ship.rotation.x = -Math.PI / 2; scene.add(ship);
  cam.position.set(S.w / 2, 13, 4.5); cam.lookAt(S.w / 2, 0, -S.h / 2);
  const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h / 360; };
  const meshes = new Map();
  function sync(list, maker) {
    const seen = new Set(list);
    for (const [k, m] of meshes) if (k.__kind === maker.kind && !seen.has(k)) { scene.remove(m); meshes.delete(k); }
    for (const o of list) { o.__kind = maker.kind;
      let m = meshes.get(o); if (!m) { m = maker(o); meshes.set(o, m); scene.add(m); }
      m.position.set(o.x, .5, -o.y); }
  }
  const mkEnemy = o => new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue(o.name), .65, .5) })); mkEnemy.kind = 'e';
  const mkBullet = () => new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0 })); mkBullet.kind = 'b';
  const mkDrop = o => new THREE.Mesh(new THREE.OctahedronGeometry(.35),
    new THREE.MeshStandardMaterial({ color: o.effect === 'heal' ? 0x7dff9a : o.effect === 'rapid' ? 0xffd479 : 0x9ab8ff })); mkDrop.kind = 'd';
  const beep = (f, d) => { try { const A = beep.ctx || (beep.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = .035; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + (d || .07)); } catch (e) {} };
  const TONE = { shot: [1200, .03], kill: [523, .08], hit: [196, .18], blocked: [740, .08],
                 wave: [660, .12], respawn: [330, .2], win: [1046, .3], defeat: [147, .4] };
  const input = { left: false, right: false, fire: false };
  addEventListener('keydown', e => { if (e.key === 'ArrowLeft') input.left = true;
    else if (e.key === 'ArrowRight') input.right = true; else if (e.key === ' ') input.fire = true; else return; e.preventDefault(); });
  addEventListener('keyup', e => { if (e.key === 'ArrowLeft') input.left = false;
    else if (e.key === 'ArrowRight') input.right = false; else if (e.key === ' ') input.fire = false; });
  function hud() {
    ui.top('<b>' + (G.name || 'shooter') + '</b> · oleada ' + S.wave + '/' + S.waves.length +
           ' · <span style="color:#ffd479">' + S.score + ' pts</span>');
    ui.side('<div class="chip">Casco: <b>' + '♥'.repeat(Math.max(0, S.hp)) + '</b></div>' +
            '<div class="chip">Vidas: ' + Math.max(0, S.lives) + (S.shield > 0 ? ' · 🛡' : '') + (S.rapid > 0 ? ' · ⚡' : '') + '</div>');
  }
  hud(); ui.msg((G.TEXT || {}).intro || '');
  (function loop() { requestAnimationFrame(loop);
    const ev = shooterTick(G, S, { dx: (input.right ? 1 : 0) - (input.left ? 1 : 0), fire: input.fire }, Math.random());
    for (const e of ev) { const t = TONE[e.split(':')[0]] || (e.startsWith('power') ? [1046, .1] : null); if (t) beep(t[0], t[1]); }
    if (ev.length) { hud();
      if (ev.includes('wave')) ui.msg(((G.TEXT || {}).wave || 'Oleada') + ' ' + S.wave + '/' + S.waves.length);
      if (ev.some(x => x.startsWith('power'))) ui.msg('Powerup: ' + ev.find(x => x.startsWith('power')).split(':')[1]);
      if (ev.includes('win')) ui.overlay('<div>🏆 ' + ((G.TEXT || {}).victory || '¡Victoria!') + '<br><span style="font-size:13px;color:#7b8696">' + S.score + ' pts · ' + S.kills + ' derribos · perfil shooter (puro-datos) · game3d</span></div>');
      if (ev.includes('defeat')) ui.overlay('<div style="color:#ff7b7b">💥 ' + ((G.TEXT || {}).defeat || 'Derrota.') + '<br><span style="font-size:13px;color:#7b8696">' + S.score + ' pts · oleada ' + S.wave + '</span></div>'); }
    sync(S.enemies, mkEnemy); sync(S.bullets, mkBullet); sync(S.drops, mkDrop);
    ship.position.set(S.x, .55, -S.y);
    ren.render(scene, cam); })();
  return { S, input };
});

// ============================================================================
// RUNTIME tower-defense — tablero 3D completo; lógica pura por ticks en
// game3d-logic (partida ganada y perdida en Node en npm test; sin azar).
// Teclas: flechas mueven el cursor, 1..N construye la torre N, S vende,
// Espacio lanza la oleada.
// ============================================================================
register('tower-defense', G => {
  const { scene, cam, ren } = makeStage();
  const path = tdPath();
  const S = tdInit(G);
  const types = Object.keys(G.TOWERS || {});
  const onPath = (c, r) => path.some(p => p.col === c && p.row === r);
  // suelo: una caja por celda (camino oscuro, resto verde)
  const cx = c => c - TD_COLS / 2 + .5, cz = r => r - TD_ROWS / 2 - 2;
  for (let r = 0; r < TD_ROWS; r++) for (let c = 0; c < TD_COLS; c++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.95, .1, .95),
      new THREE.MeshStandardMaterial({ color: onPath(c, r) ? 0x5a4632 : (c + r) % 2 ? 0x2c4a2e : 0x27422a }));
    m.position.set(cx(c), 0, cz(r)); scene.add(m);
  }
  cam.position.set(0, 9, 7); cam.lookAt(0, 0, -2);
  const cursor = new THREE.Mesh(new THREE.BoxGeometry(1, .5, 1),
    new THREE.MeshBasicMaterial({ color: 0x8fd6ff, wireframe: true }));
  scene.add(cursor);
  let cc = 1, cr = 0; // celda del cursor
  const towerMeshes = new Map(), enemyMeshes = new Map();
  const beep = (f, d) => { try { const A = beep.ctx || (beep.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = .035; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + (d || .08)); } catch (e) {} };
  function hud() {
    ui.top('<b>' + (G.name || 'tower defense') + '</b> · oleada ' + Math.min(S.wave + 1, S.waveIds.length) + '/' + S.waveIds.length +
           (S.waveActive ? ' (en curso)' : ' — [Espacio] lanzar'));
    ui.side('<div class="chip">Oro: <b>' + S.gold + '</b> · Vidas: <b>' + S.lives + '</b></div>' +
            types.map((t, i) => '<div class="chip">[' + (i + 1) + '] ' + t + ' — ' + G.TOWERS[t].cost + ' oro</div>').join('') +
            '<div class="chip">[S] vender (' + Math.round(((G.BALANCE || {}).sellRatio || 0) * 100) + '%)</div>');
  }
  function sync() {
    cursor.position.set(cx(cc), .3, cz(cr));
    for (const [t, m] of towerMeshes) if (!S.towers.includes(t)) { scene.remove(m); towerMeshes.delete(t); }
    for (const t of S.towers) if (!towerMeshes.has(t)) {
      const i = types.indexOf(t.type);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.28, .38, .9, 10),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / Math.max(1, types.length), .65, .55) }));
      m.position.set(cx(t.col), .55, cz(t.row)); scene.add(m); towerMeshes.set(t, m);
    }
    for (const [e, m] of enemyMeshes) if (!S.enemies.includes(e)) { scene.remove(m); enemyMeshes.delete(e); }
    for (const e of S.enemies) {
      if (!enemyMeshes.has(e)) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(e.armor === 'HEAVY' ? .34 : .22, 12, 10),
          new THREE.MeshStandardMaterial({ color: e.armor === 'HEAVY' ? 0xb03030 : 0xd08030 }));
        scene.add(m); enemyMeshes.set(e, m);
      }
      const p = tdPos(path, e.prog);
      enemyMeshes.get(e).position.set(cx(p.col), .35, cz(p.row));
    }
    hud();
  }
  function step() {
    if (!S.waveActive) return;
    const r = tdTick(G, S, path);
    if (r === 'wave-clear') { beep(660, .2); ui.msg('Oleada superada: recompensa e interés cobrados.'); }
    else if (r === 'win') { beep(1046, .3); ui.overlay('<div>🏆 Base defendida.<br><span style="font-size:13px;color:#7b8696">' +
      S.killed + ' abatidos · ' + S.leaked + ' fugas · vidas ' + S.lives + '/' + (G.ECONOMY || {}).startLives +
      ' · oro final ' + S.gold + ' · perfil tower-defense · game3d</span></div>'); }
    else if (r === 'lose') { beep(147, .4); ui.overlay('<div style="color:#ff7b7b">💥 Base arrasada en la oleada ' + (S.wave + 1) +
      '.<br><span style="font-size:13px;color:#7b8696">fugas: ' + S.leaked + '</span></div>'); }
    sync();
  }
  addEventListener('keydown', e => {
    if (S.won || S.lost) return;
    const k = e.key;
    if (k === 'ArrowLeft') cc = Math.max(0, cc - 1);
    else if (k === 'ArrowRight') cc = Math.min(TD_COLS - 1, cc + 1);
    else if (k === 'ArrowUp') cr = Math.max(0, cr - 1);
    else if (k === 'ArrowDown') cr = Math.min(TD_ROWS - 1, cr + 1);
    else if (k === ' ') { if (tdStartWave(G, S) === 'wave') { beep(740); ui.msg('¡Oleada en camino!'); } }
    else if (k === 's' || k === 'S') { if (tdSell(G, S, cc, cr) === 'ok') { beep(520); ui.msg('Torre vendida.'); } else ui.msg('Ahí no hay torre.'); }
    else if (/^[1-9]$/.test(k) && types[+k - 1]) {
      const r = tdBuild(G, S, types[+k - 1], cc, cr, path);
      if (r === 'ok') { beep(880); ui.msg(types[+k - 1] + ' construida.'); }
      else { beep(196, .12); ui.msg('No se puede construir (oro/celda).'); } }
    else return;
    sync(); e.preventDefault();
  });
  sync(); ui.msg('Coloca torres (1..' + types.length + ') junto al camino y lanza la oleada con Espacio.');
  (function loop() { requestAnimationFrame(loop); step(); ren.render(scene, cam); })();
  return { S, step };
});

// ============================================================================
// RUNTIME papers-please — ventanilla DOM sobre fondo 3D; lógica pura en
// game3d-logic (el oráculo de autoría — decision declarada == evaluación por
// RULES — y la partida completa se verifican en npm test).
// Teclas: A aprueba, D deniega.
// ============================================================================
register('papers-please', G => {
  const { scene, cam, ren } = makeStage();
  // fondo: muro del puesto fronterizo + barrera que se alza al aprobar
  for (let i = -4; i <= 4; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, .6),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0x4a4a52 : 0x3d3d44 }));
    m.position.set(i * 1.6, 1.1, -8); scene.add(m);
  }
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(5, .25, .25),
    new THREE.MeshStandardMaterial({ color: 0xcc3333 }));
  barrier.position.set(0, 1.2, -5); scene.add(barrier);
  cam.position.set(0, 3, 6); cam.lookAt(0, 1, -6);
  let barrierUp = 0; // ticks restantes de barrera alzada
  const S = ppInit(G);
  const beep = (f, d) => { try { const A = beep.ctx || (beep.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = .035; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + (d || .08)); } catch (e) {} };
  function hud() {
    const dayId = S.dayIds[S.day], D = G.DAYS[dayId];
    const libro = (G.TEXT || {})['rulebook_d' + dayId];
    ui.top('<b>' + (G.name || 'checkpoint') + '</b> · día ' + dayId + ' (' + (S.idx + 1) + '/' + D.entrants.length + ')');
    ui.side('<div class="chip">Dinero: <b>' + S.money + '</b></div>' +
            '<div class="chip">Aciertos: ' + S.correct + ' · Errores: ' + S.wrong + '/' + S.maxWrong + '</div>' +
            (libro ? '<div class="chip">📖 ' + libro + '</div>' : '') +
            '<div class="chip">Reglas: ' + D.rules.map(r => r.id).join(', ') + '</div>');
  }
  function paint() {
    const E = ppEntrant(G, S);
    if (!E) return;
    const docs = Object.entries(E.docs || {});
    let html = '<div style="text-align:center;color:#7b8696;margin-bottom:6px">Solicitante <b style="color:#e6edf5">' + E.id + '</b> — [A] aprobar · [D] denegar</div>';
    html += docs.length === 0 ? '<div style="text-align:center;color:#ff9b7b">No presenta documentos.</div>' :
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' + docs.map(([name, d]) =>
        '<div style="border:1px solid #3a4656;background:#161d27;padding:8px 12px;min-width:150px">' +
        '<div style="color:#8fd6ff;font-weight:700;margin-bottom:4px">' + name + '</div>' +
        Object.entries(d).map(([k, v]) => '<div style="font-size:13px"><span style="color:#7b8696">' + k + ':</span> ' + v + '</div>').join('') +
        '</div>').join('') + '</div>';
    ui.panel(html, true); hud();
  }
  addEventListener('keydown', e => {
    if (S.won || S.lost) return;
    const k = e.key.toLowerCase();
    if (k !== 'a' && k !== 'd') return;
    const last = S.log.length; // para leer el veredicto tras decidir
    const r = ppDecide(G, S, k === 'a' ? 'approve' : 'deny');
    const v = S.log[last];
    const cite = v.reasons.length ? ' — ' + v.reasons.join(', ') : '';
    if (v.choice === v.truth) { beep(880); ui.msg('Correcto: ' + v.truth + cite);
      if (v.truth === 'approve') barrierUp = 60; }
    else { beep(196, .15); ui.msg('ERROR: era ' + v.truth + cite + ' (multa)'); }
    if (r === 'day') { beep(660, .2); ui.msg('Fin del día: renta pagada (-' + ((G.ECONOMY || {}).rent || 0) + ').'); }
    else if (r === 'win') { beep(1046, .3); ui.overlay('<div>🏆 Turno completado.<br><span style="font-size:13px;color:#7b8696">aciertos: ' +
      S.correct + '/' + (S.correct + S.wrong) + ' · dinero final: ' + S.money + ' · perfil papers-please · game3d</span></div>'); }
    else if (r === 'lose') { beep(147, .4); ui.overlay('<div style="color:#ff7b7b">💥 Despedido: ' + S.maxWrong + ' errores.' +
      '<br><span style="font-size:13px;color:#7b8696">dinero: ' + S.money + '</span></div>'); }
    paint(); e.preventDefault();
  });
  paint(); ui.msg('Decide con los documentos y las reglas del día. [A] aprobar · [D] denegar');
  (function loop() { requestAnimationFrame(loop);
    barrier.position.y += ((barrierUp-- > 0 ? 2.6 : 1.2) - barrier.position.y) * .1;
    ren.render(scene, cam); })();
  return { S };
});

// ============================================================================
// RUNTIME peg-solitaire (senku) — tablero DOM sobre fondo 3D; lógica pura en
// game3d-logic (los tableros reales y sus soluciones se rejuegan en npm test).
// Teclas: flechas mueven el cursor; Enter/Espacio elige peg y luego salta al
// hueco seleccionado; Escape suelta el peg elegido.
// ============================================================================
register('peg-solitaire', G => {
  const { scene, cam, ren } = makeStage();
  for (let i = 0; i < 7; i++) {   // fondo: anillo de esferas girando
    const m = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 12),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.08 + i / 14, .6, .5) }));
    const a = i / 7 * Math.PI * 2; m.position.set(Math.cos(a) * 6, 1 + Math.sin(a), Math.sin(a) * 6 - 6);
    m.userData.spin = .004 + i * .002; scene.add(m);
  }
  cam.position.set(0, 3, 6); cam.lookAt(0, .8, -4);
  const S = pegInit(G);
  if (S.err) { ui.msg('Tablero invalido (' + S.id + '): ' + S.err); return { S }; }
  const beep = (f, d) => { try { const A = beep.ctx || (beep.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = .035; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + (d || .08)); } catch (e) {} };
  function hud() {
    const B = G.BOARDS[S.id];
    ui.top('<b>' + (G.name || 'senku') + '</b> · ' + S.id + ' (' + B.difficulty + ' · goal ' + S.goal + ')');
    ui.side('<div class="chip">Pegs: <b>' + S.pegs + '</b></div>' +
            '<div class="chip">Saltos: ' + S.moves + '</div>' +
            '<div class="chip">Legales: ' + pegMoves(S.cells).length + '</div>');
  }
  function paint() {
    let html = '<table style="border-collapse:collapse;margin:0 auto">';
    for (let r = 0; r < 7; r++) { html += '<tr>';
      for (let c = 0; c < 7; c++) { const i = r * 7 + c, v = S.cells[i];
        const bg = i === S.picked ? '#5a3d18' : i === S.sel ? '#2a3d55' : v === -1 ? 'transparent' : '#161d27';
        html += '<td style="width:34px;height:34px;text-align:center;font-size:17px;border:' +
          (v === -1 ? 'none' : '1px solid #3a4656') + ';background:' + bg + ';color:' +
          (v === 1 ? '#ffd27b' : '#5a6472') + '">' + (v === 1 ? '●' : v === 0 ? '·' : '') + '</td>'; }
      html += '</tr>'; }
    ui.panel(html + '</table>', true); hud();
  }
  addEventListener('keydown', e => {
    if (S.won || S.lost) return;
    const k = e.key;
    if (k === 'ArrowLeft') S.sel = Math.max(0, S.sel - 1);
    else if (k === 'ArrowRight') S.sel = Math.min(48, S.sel + 1);
    else if (k === 'ArrowUp') S.sel = Math.max(0, S.sel - 7);
    else if (k === 'ArrowDown') S.sel = Math.min(48, S.sel + 7);
    else if (k === 'Escape') { S.picked = -1; ui.msg(''); }
    else if (k === 'Enter' || k === ' ') {
      if (S.picked === -1) { if (S.cells[S.sel] === 1) { S.picked = S.sel; beep(660); ui.msg((G.TEXT || {}).pick || 'Peg elegido.'); } }
      else if (S.sel === S.picked) { S.picked = -1; ui.msg(''); }
      else { const r = pegMove(S, S.picked, S.sel);
        if (r === 'blocked') { beep(196, .12); ui.msg((G.TEXT || {}).badmove || 'Salto ilegal.'); }
        else { S.picked = -1;
          if (r === 'ok') { beep(880); ui.msg((G.TEXT || {}).jump || 'Un peg menos.'); }
          else if (r === 'win') { beep(1046, .3); ui.overlay('<div>🏆 ' + ((G.TEXT || {}).win || 'Resuelto') +
            '<br><span style="font-size:13px;color:#7b8696">saltos: ' + S.moves + ' · goal ' + S.goal + ' · perfil peg-solitaire (puro-datos) · game3d</span></div>'); }
          else if (r === 'lose') { beep(147, .4); ui.overlay('<div style="color:#ff7b7b">💥 ' +
            (S.pegs === 1 ? ((G.TEXT || {}).loseCenter || 'Fuera del centro.') : ((G.TEXT || {}).lose || 'Sin saltos.')) +
            '<br><span style="font-size:13px;color:#7b8696">pegs restantes: ' + S.pegs + '</span></div>'); } } } }
    else return;
    paint(); e.preventDefault();
  });
  paint(); ui.msg((G.TEXT || {}).intro || '');
  (function loop() { requestAnimationFrame(loop);
    scene.traverse(o => { if (o.userData && o.userData.spin) { o.rotation.y += o.userData.spin; o.rotation.x += o.userData.spin * .7; } });
    ren.render(scene, cam); })();
  return { S };
});

// ============================================================================
// RUNTIME sudoku — tablero DOM sobre fondo 3D; lógica pura en game3d-logic
// (los puzzles reales se validan con sudokuCheck en npm test).
// ============================================================================
register('sudoku', G => {
  const { scene, cam, ren } = makeStage();
  for (let i = 0; i < 9; i++) {   // fondo: anillo de cubos girando
    const m = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .9),
      new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / 9, .5, .45) }));
    const a = i / 9 * Math.PI * 2; m.position.set(Math.cos(a) * 6, 1 + Math.sin(a), Math.sin(a) * 6 - 6);
    m.userData.spin = .003 + i * .0015; scene.add(m);
  }
  cam.position.set(0, 3, 6); cam.lookAt(0, .8, -4);
  const S = sudokuInit(G);
  if (S.err) { ui.msg('Puzzle invalido (' + S.id + '): ' + S.err); return { S }; }
  const beep = (f, d) => { try { const A = beep.ctx || (beep.ctx = new AudioContext());
    const o = A.createOscillator(), g = A.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = .035; o.connect(g); g.connect(A.destination); o.start(); o.stop(A.currentTime + (d || .08)); } catch (e) {} };
  function hud() {
    const P = G.PUZZLES[S.id];
    ui.top('<b>' + (G.name || 'sudoku') + '</b> · ' + S.id + ' (' + P.difficulty + ')');
    ui.side('<div class="chip">Vidas: <b>' + '♥'.repeat(Math.max(0, S.lives)) + '</b></div>' +
            '<div class="chip">Pistas: ' + S.hints + ' (H)</div>' +
            '<div class="chip">Faltan: ' + S.grid.filter(v => v === 0).length + '</div>');
  }
  function paint() {
    let html = '<table style="border-collapse:collapse;margin:0 auto">';
    for (let r = 0; r < 9; r++) { html += '<tr>';
      for (let c = 0; c < 9; c++) { const i = r * 9 + c, v = S.grid[i];
        const bt = (r % 3 === 0 ? '2px' : '1px') + ' solid #3a4656', bl = (c % 3 === 0 ? '2px' : '1px') + ' solid #3a4656';
        const bb = (r === 8 ? '2px solid #3a4656' : ''), br = (c === 8 ? '2px solid #3a4656' : '');
        html += '<td style="width:30px;height:30px;text-align:center;font-size:15px;border-top:' + bt + ';border-left:' + bl +
          (bb ? ';border-bottom:' + bb : '') + (br ? ';border-right:' + br : '') +
          ';background:' + (i === S.sel ? '#2a3d55' : 'transparent') +
          ';color:' + (S.given[i] ? '#8fd6ff' : '#e6edf5') + (S.given[i] ? ';font-weight:700' : '') + '">' +
          (v || '') + '</td>'; }
      html += '</tr>'; }
    ui.panel(html + '</table>', true); hud();
  }
  addEventListener('keydown', e => {
    if (S.won || S.lost) return;
    const k = e.key;
    if (k === 'ArrowLeft') S.sel = Math.max(0, S.sel - 1);
    else if (k === 'ArrowRight') S.sel = Math.min(80, S.sel + 1);
    else if (k === 'ArrowUp') S.sel = Math.max(0, S.sel - 9);
    else if (k === 'ArrowDown') S.sel = Math.min(80, S.sel + 9);
    else if (k === 'h' || k === 'H') { const r = sudokuHint(S);
      if (r === 'hint') { beep(740); ui.msg('Pista usada.'); }
      else if (r === 'win') { beep(1046, .3); ui.overlay('<div>🏆 ' + ((G.TEXT || {}).win || 'Resuelto') + '</div>'); }
      else ui.msg('Sin pistas disponibles.'); }
    else if (/^[1-9]$/.test(k)) { const r = sudokuSet(S, S.sel, +k);
      if (r === 'ok') { beep(880); ui.msg((G.TEXT || {}).correct || 'Bien.'); }
      else if (r === 'wrong') { beep(196, .15); ui.msg(((G.TEXT || {}).wrong || 'No.') + ' (fallos: ' + S.mistakes + ')'); }
      else if (r === 'win') { beep(1046, .3); ui.overlay('<div>🏆 ' + ((G.TEXT || {}).win || 'Resuelto') + '<br><span style="font-size:13px;color:#7b8696">fallos: ' + S.mistakes + ' · pistas usadas: ' + (((G.BALANCE || {}).hints || 3) - S.hints) + ' · perfil sudoku (puro-datos) · game3d</span></div>'); }
      else if (r === 'lose') { beep(147, .4); ui.overlay('<div style="color:#ff7b7b">💥 ' + ((G.TEXT || {}).lose || 'Derrota.') + '</div>'); } }
    else return;
    paint(); e.preventDefault();
  });
  paint(); ui.msg((G.TEXT || {}).intro || '');
  (function loop() { requestAnimationFrame(loop);
    scene.traverse(o => { if (o.userData && o.userData.spin) { o.rotation.y += o.userData.spin; o.rotation.x += o.userData.spin * .7; } });
    ren.render(scene, cam); })();
  return { S };
});

// ---------------- arranque: despacho por la meta `profile` del artefacto ----------------
export function boot(G) {
  const p = G && G.profile;
  if (!G) { ui.msg('No hay window.GAME: pasa ?game=<archivo>.generated.js'); return null; }
  const rt = runtimes[p];
  if (!rt) { ui.msg('El perfil "' + p + '" no tiene runtime en game3d (soportados: ' + Object.keys(runtimes).join(', ') + '). ' +
    'El protocolo declara datos; la semántica de cada género es del motor (SPEC §8): un perfil nuevo requiere su módulo de runtime.'); return null; }
  ui.top('<b>' + (G.name || '') + '</b> · perfil ' + p);
  const state = rt(G);
  window.GAME3D = { profile: p, state };
  return state;
}
