/**
 * game3d-logic.mjs — Lógica PURA del runtime game3d (sin THREE, sin DOM).
 * Separada para que `npm test` la verifique en Node (test/game3d-logic.js): las
 * fórmulas de combate, la visión de entrenadores y la colisión son deterministas
 * (el azar entra por parámetro `rnd` en [0,1)).
 */

// Multiplicador de eficacia del TYPE_CHART (ausente => x1, como en los motores 2D).
export const typeMult = (chart, atk, def) => {
  const r = ((chart || {})[atk] || {})[def];
  return r == null ? 1 : r;
};

// Expande nombres de moves a objetos completos usando la tabla MOVES del artefacto.
export const expandMoves = (list, moves) =>
  (list || []).map(m => typeof m === 'string' ? Object.assign({ name: m }, (moves || {})[m]) : m);

// Instancia una criatura a un nivel dado: +2 maxhp por nivel sobre 5 (curva del motor).
export function makeMon(src, lvl, species, moves) {
  const b = typeof src === 'string' ? Object.assign({ name: src }, (species || {})[src]) : src;
  const maxhp = (b.maxhp || 20) + Math.max(0, lvl - 5) * 2;
  return { name: b.name, type: b.type, lvl, maxhp, hp: maxhp, xp: 0,
           sprite: b.sprite, moves: expandMoves(b.moves, moves), status: null };
}

// Daño de un move: power × eficacia × varianza (.9–1.1 vía rnd) × factor de nivel
// (+3% por nivel de diferencia); `slow` en el atacante reduce un 20%.
export function damage(mv, atk, def, chart, rnd) {
  let d = Math.max(1, Math.round((mv.power || 4)
    * typeMult(chart, mv.type, def.type)
    * (.9 + .2 * rnd)
    * (1 + .03 * ((atk.lvl || 1) - (def.lvl || 1)))));
  if (atk.status === 'slow') d = Math.max(1, Math.round(d * .8));
  return d;
}

// Probabilidad de captura: la fórmula documentada de BALANCE
// (catchBase + catchScale·(1 − hp/maxhp), ver README/SPEC del perfil monster-rpg).
export const catchProb = (bal, foe) =>
  ((bal || {}).catchBase || .3) + ((bal || {}).catchScale || .5) * (1 - foe.hp / foe.maxhp);

// XP y niveles (curva lvl·10·xpCurveMul) con evoluciones vía EVOLUTIONS.
// Muta `winner`; devuelve las líneas de log (el runtime decide cómo mostrarlas).
export function gainXP(winner, foe, bal, evolutions, moves) {
  const log = [];
  winner.xp += 6 + Math.round(foe.maxhp / 2) + (foe.lvl || 1);
  let need = Math.round(winner.lvl * 10 * ((bal || {}).xpCurveMul || 1));
  while (winner.xp >= need) {
    winner.xp -= need; winner.lvl++; winner.maxhp += 3;
    winner.hp = Math.min(winner.maxhp, winner.hp + 3);
    log.push(winner.name + ' sube a N' + winner.lvl);
    const evo = (evolutions || {})[winner.name];
    if (evo && winner.lvl >= (evo.level || 99)) {
      log.push('¡Evoluciona a ' + evo.into + '!');
      winner.name = evo.into; winner.type = evo.type || winner.type;
      winner.maxhp = (evo.maxhp || winner.maxhp) + (winner.lvl - 5) * 2; winner.hp = winner.maxhp;
      winner.moves = expandMoves((evo.moves || winner.moves).map(m => m.name || m), moves);
    }
    need = Math.round(winner.lvl * 10 * ((bal || {}).xpCurveMul || 1));
  }
  return log;
}

// Colisión de grid: fuera de límites o tile sólido => no se puede pisar.
export const canStep = (tilemap, solidSet, c, r) => {
  const t = ((tilemap || [])[r] || [])[c];
  return t != null && !solidSet.has(t);
};

// ============================================================================
// SIMULACIÓN del perfil `shooter` (shmup vertical) — PURA y determinista:
// el azar entra por `rnd()`; un tick = un frame a 60fps. El runtime solo
// renderiza el estado y recoge input; los tests la juegan entera en Node.
// ============================================================================
export function shooterInit(G) {
  const shipDef = (G.SHIPS || {})[(G.PLAYER || {}).ship] || { speed: .1, hp: 5, weapon: null };
  const weapon = (G.WEAPONS || {})[shipDef.weapon] || { damage: 1, rate: 4, bulletSpeed: .25 };
  const A = G.ARENA || { width: 24, height: 16 };
  return {
    w: A.width, h: A.height,
    x: A.width / 2, y: 1.5, hp: shipDef.hp, maxhp: shipDef.hp, speed: shipDef.speed,
    weapon, cool: 0, rapid: 0, shield: 0,
    lives: (G.BALANCE || {}).lives != null ? G.BALANCE.lives : 2,
    bullets: [], enemies: [], drops: [],
    waves: Object.keys(G.WAVES || {}).sort((a, b) => Number(a) - Number(b)),
    wave: 0, queue: [], tick: 0, score: 0, kills: 0, leaked: 0, lost: 0,
    over: false, won: false,
  };
}
export function shooterTick(G, S, input, rnd) {
  const ev = [];
  if (S.over || S.won) return ev;
  S.tick++;
  // nave
  S.x = Math.min(S.w - .5, Math.max(.5, S.x + (input.dx || 0) * S.speed));
  // disparo (rate en disparos/segundo; OVERDRIVE duplica cadencia)
  if (S.cool > 0) S.cool--;
  if (input.fire && S.cool <= 0) {
    S.cool = Math.max(1, Math.round(60 / S.weapon.rate / (S.rapid > 0 ? 2 : 1)));
    S.bullets.push({ x: S.x, y: S.y + .6 }); ev.push('shot');
  }
  // balas
  for (const b of S.bullets) b.y += S.weapon.bulletSpeed;
  S.bullets = S.bullets.filter(b => b.y < S.h + 1);
  // oleadas: cuando no queda nada, cargar la siguiente (o victoria)
  if (!S.queue.length && !S.enemies.length) {
    if (S.wave >= S.waves.length) { S.won = true; ev.push('win'); return ev; }
    const def = G.WAVES[S.waves[S.wave]] || {}; S.wave++; ev.push('wave');
    for (const sp of (def.spawns || []))
      for (let i = 0; i < (sp.count || 0); i++)
        S.queue.push({ enemy: sp.enemy, at: S.tick + 30 + i * (sp.gap || 30) });
  }
  // spawns pendientes
  S.queue = S.queue.filter(q => {
    if (q.at > S.tick) return true;
    const d = (G.ENEMIES || {})[q.enemy] || { hp: 1, speed: .05, behavior: 'chaser', points: 0 };
    S.enemies.push({ name: q.enemy, x: .5 + rnd() * (S.w - 1), y: S.h - .5,
                     hp: d.hp, speed: d.speed, behavior: d.behavior, points: d.points || 0,
                     phase: Math.floor(rnd() * 628) });
    return false;
  });
  // enemigos
  for (const e of S.enemies) {
    if (e.behavior === 'chaser') {
      const dx = S.x - e.x, dy = S.y - e.y, n = Math.hypot(dx, dy) || 1;
      e.x += e.speed * dx / n; e.y += e.speed * dy / n;
    } else { e.y -= e.speed; e.x += Math.sin((S.tick + e.phase) * .05) * .04; }
  }
  S.enemies = S.enemies.filter(e => { if (e.y < -.5) { S.leaked++; return false; } return true; });
  // balas x enemigos
  for (const b of S.bullets) for (const e of S.enemies) {
    if (b.hit || e.hp <= 0) continue;
    if (Math.hypot(b.x - e.x, b.y - e.y) < .7) {
      b.hit = true; e.hp -= S.weapon.damage;
      if (e.hp <= 0) { S.score += e.points; S.kills++; ev.push('kill');
        if (rnd() < ((G.BALANCE || {}).powerupChance || 0)) {
          const keys = Object.keys(G.POWERUPS || {});
          if (keys.length) { const p = (G.POWERUPS)[keys[Math.floor(rnd() * keys.length)]];
            S.drops.push({ x: e.x, y: e.y, effect: p.effect, amount: p.amount, duration: p.duration }); }
        } }
    }
  }
  S.bullets = S.bullets.filter(b => !b.hit);
  S.enemies = S.enemies.filter(e => e.hp > 0);
  // powerups: caen y se recogen
  for (const d of S.drops) d.y -= .03;
  S.drops = S.drops.filter(d => {
    if (d.y < -.5) return false;
    if (Math.hypot(d.x - S.x, d.y - S.y) < .9) {
      if (d.effect === 'heal') S.hp = Math.min(S.maxhp, S.hp + (d.amount || 1));
      else if (d.effect === 'rapid') S.rapid = d.duration || 300;
      else if (d.effect === 'shield') S.shield = d.duration || 240;
      ev.push('power:' + d.effect); return false;
    }
    return true;
  });
  if (S.rapid > 0) S.rapid--; if (S.shield > 0) S.shield--;
  // enemigos que alcanzan la nave (contados en `lost`: ni kill ni leak)
  S.enemies = S.enemies.filter(e => {
    if (Math.hypot(e.x - S.x, e.y - S.y) >= .8) return true;
    S.lost++;
    if (S.shield > 0) { ev.push('blocked'); return false; }
    S.hp--; ev.push('hit');
    if (S.hp <= 0) {
      S.lives--;
      if (S.lives < 0) { S.over = true; ev.push('defeat'); }
      else { S.hp = S.maxhp; S.lost += S.enemies.filter(x => x !== e).length;
             S.enemies.length = 0; S.bullets.length = 0; ev.push('respawn'); }
    }
    return false;
  });
  return ev;
}
// LCG determinista para tests/replays (semilla entera -> rnd() en [0,1)).
export const lcg = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// Visión de entrenadores: misma fila/columna dentro de `sight`, línea de visión sin
// sólidos (isSolid(c, r) la aporta el runtime). Devuelve el entrenador que ve, o null.
export function trainerInSight(trainers, defeated, pos, isSolid) {
  for (const t of (trainers || [])) {
    if (defeated.has(t.name)) continue;
    const dc = pos.col - t.col, dr = pos.row - t.row, sg = t.sight || 3;
    if (!((dc === 0 && Math.abs(dr) <= sg) || (dr === 0 && Math.abs(dc) <= sg))) continue;
    let blocked = false;
    const n = Math.max(Math.abs(dc), Math.abs(dr));
    for (let i = 1; i < n; i++)
      if (isSolid(dr === 0 ? t.col + Math.sign(dc) * i : t.col,
                  dc === 0 ? t.row + Math.sign(dr) * i : t.row)) { blocked = true; break; }
    if (!blocked) return t;
  }
  return null;
}
