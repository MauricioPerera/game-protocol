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
// ============================================================================
// Lógica del perfil `sudoku` — PURA y sin azar. Incluye el VALIDADOR de datos
// (sudokuCheck) que cubre lo que las familias declarativas no alcanzan:
// longitud/dígitos de los strings, consistencia grid↔solution y validez del
// sudoku (filas/columnas/cajas). Los tests de Node validan los puzzles reales.
// ============================================================================
export function sudokuCheck(gridStr, solStr) {
  if (typeof gridStr !== 'string' || gridStr.length !== 81) return 'grid debe tener 81 caracteres';
  if (/[^1-9.]/.test(gridStr)) return 'grid: solo digitos 1-9 y "." para vacios';
  if (typeof solStr !== 'string' || solStr.length !== 81 || /[^1-9]/.test(solStr)) return 'solution: 81 digitos 1-9';
  for (let i = 0; i < 81; i++)
    if (gridStr[i] !== '.' && gridStr[i] !== solStr[i]) return 'la pista de la celda ' + i + ' no coincide con solution';
  for (let u = 0; u < 9; u++) {
    const row = new Set(), col = new Set(), box = new Set();
    for (let k = 0; k < 9; k++) {
      row.add(solStr[u * 9 + k]);
      col.add(solStr[k * 9 + u]);
      box.add(solStr[(((u / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + ((u % 3) * 3 + (k % 3))]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return 'solution invalida (unidad ' + u + ')';
  }
  return null;
}
export function sudokuInit(G, puzzleId) {
  const id = puzzleId || (G.PLAYER || {}).start || Object.keys(G.PUZZLES || {})[0];
  const P = (G.PUZZLES || {})[id] || { grid: '.'.repeat(81), solution: '123456789'.repeat(9) };
  const err = sudokuCheck(P.grid, P.solution);
  const firstEmpty = P.grid.indexOf('.');
  return { id, err,
           grid: P.grid.split('').map(c => c === '.' ? 0 : +c),
           given: P.grid.split('').map(c => c !== '.'),
           solution: P.solution,
           lives: (G.BALANCE || {}).lives != null ? G.BALANCE.lives : 3,
           hints: (G.BALANCE || {}).hints != null ? G.BALANCE.hints : 3,
           sel: firstEmpty === -1 ? 0 : firstEmpty,
           mistakes: 0, won: false, lost: false };
}
export function sudokuSet(S, idx, val) {
  if (S.won || S.lost || S.given[idx] || S.grid[idx] !== 0) return 'blocked';
  if (String(val) !== S.solution[idx]) {
    S.mistakes++; S.lives--; if (S.lives < 0) { S.lost = true; return 'lose'; }
    return 'wrong';
  }
  S.grid[idx] = val;
  if (S.grid.every((v, i) => String(v) === S.solution[i])) { S.won = true; return 'win'; }
  return 'ok';
}
export function sudokuHint(S) {
  if (S.won || S.lost || S.hints <= 0) return 'blocked';
  const i = S.grid.findIndex((v, j) => v === 0 && !S.given[j]);
  if (i === -1) return 'blocked';
  S.hints--; S.grid[i] = +S.solution[i];
  if (S.grid.every((v, j) => String(v) === S.solution[j])) { S.won = true; return 'win'; }
  return 'hint';
}

// ============================================================================
// Lógica del perfil `peg-solitaire` (senku) — PURA y sin azar. Incluye el
// VALIDADOR de datos (pegCheck) que cubre lo que las familias declarativas no
// alcanzan: forma 7x7 y alfabeto del layout. Los tableros reales se validan y
// sus soluciones se REJUEGAN en los tests de Node.
// ============================================================================
const PEG_CENTER = 3 * 7 + 3; // 24
export function pegCheck(layout) {
  if (!Array.isArray(layout) || layout.length !== 7) return 'layout debe tener 7 filas';
  for (const r of layout) if (typeof r !== 'string' || r.length !== 7) return 'cada fila debe tener 7 caracteres';
  const s = layout.join('');
  if (/[^_o.]/.test(s)) return 'layout: solo "_" (fuera), "o" (peg) y "." (hueco)';
  if ((s.match(/o/g) || []).length < 2) return 'layout necesita al menos 2 pegs';
  if (!s.includes('.')) return 'layout necesita al menos un hueco';
  return null;
}
// Saltos legales: peg -> hueco a 2 casillas ortogonales con peg en medio.
export function pegMoves(cells) {
  const out = [];
  for (let i = 0; i < 49; i++) if (cells[i] === 1)
    for (const d of [-1, 1, -7, 7]) {
      const to = i + 2 * d;
      if (to < 0 || to > 48) continue;
      if (Math.abs(d) === 1 && ((i / 7) | 0) !== ((to / 7) | 0)) continue; // no cruzar filas
      if (cells[i + d] === 1 && cells[to] === 0) out.push([i, to]);
    }
  return out;
}
export function pegInit(G, boardId) {
  const id = boardId || (G.PLAYER || {}).start || Object.keys(G.BOARDS || {})[0];
  const B = (G.BOARDS || {})[id] || { layout: [], goal: 'clear' };
  const err = pegCheck(B.layout);
  const cells = err ? [] : B.layout.join('').split('').map(c => c === '_' ? -1 : c === 'o' ? 1 : 0);
  return { id, err, cells, goal: B.goal || 'clear',
           pegs: cells.filter(v => v === 1).length,
           sel: Math.max(0, cells.indexOf(1)), picked: -1,
           moves: 0, won: false, lost: false };
}
export function pegMove(S, from, to) {
  if (S.won || S.lost || S.cells[from] !== 1 || S.cells[to] !== 0) return 'blocked';
  const d = to - from;
  const aligned = (Math.abs(d) === 2 && ((from / 7) | 0) === ((to / 7) | 0)) || Math.abs(d) === 14;
  if (!aligned || S.cells[(from + to) / 2] !== 1) return 'blocked';
  S.cells[from] = 0; S.cells[(from + to) / 2] = 0; S.cells[to] = 1;
  S.pegs--; S.moves++;
  if (S.pegs === 1) {
    if (S.goal === 'clear' || S.cells[PEG_CENTER] === 1) { S.won = true; return 'win'; }
    S.lost = true; return 'lose';
  }
  if (pegMoves(S.cells).length === 0) { S.lost = true; return 'lose'; }
  return 'ok';
}

// ============================================================================
// Lógica del perfil `papers-please` — PURA y sin azar. La "verdad" de cada
// solicitante se COMPUTA desde las RULES del día (require-document,
// ban-country, require-field-match, not-expired); la `decision` declarada en
// el GAME.md es el oráculo de autoría y los tests exigen que ambas coincidan.
// Semántica del motor (SPEC §8): fecha de corte PP_TODAY para not-expired,
// derrota al 3er error, money = aciertos*salary − fallos*penaltyFee − rent
// al cerrar cada día (puede ser negativo: es el marcador).
// ============================================================================
export const PP_TODAY = '1983.01';
// `rules` acepta la forma EXPANDIDA del artefacto (DAYS.*.rules: objetos con id)
// o ids sueltos que se resuelven contra G.RULES.
export function ppEval(G, entrant, rules, today) {
  const docs = (entrant || {}).docs || {};
  const bad = [];
  for (const x of (rules || [])) {
    const r = typeof x === 'string' ? Object.assign({ id: x }, (G.RULES || {})[x]) : x;
    if (r.type === 'require-document') { if (!docs[r.document]) bad.push(r.id); }
    else if (r.type === 'ban-country') {
      if (Object.values(docs).some(d => d.country === r.country)) bad.push(r.id);
    } else if (r.type === 'require-field-match') {
      const present = (r.documents || []).filter(n => docs[n]);
      if (present.length >= 2 && new Set(present.map(n => String(docs[n][r.field]))).size > 1) bad.push(r.id);
    } else if (r.type === 'not-expired') {
      const d = docs[r.document];
      if (d && String(d[r.field]) < (today || PP_TODAY)) bad.push(r.id);
    }
  }
  return { decision: bad.length ? 'deny' : 'approve', reasons: bad };
}
export function ppInit(G, today) {
  return { today: today || PP_TODAY,
           dayIds: Object.keys(G.DAYS || {}).sort((a, b) => +a - +b),
           day: 0, idx: 0, money: 0, correct: 0, wrong: 0, maxWrong: 3,
           log: [], won: false, lost: false };
}
// Solicitante en ventanilla (objeto expandido del día, o null si terminó).
export function ppEntrant(G, S) {
  const D = (G.DAYS || {})[S.dayIds[S.day]];
  return (D && D.entrants[S.idx]) || null;
}
export function ppDecide(G, S, choice) {
  if (S.won || S.lost) return 'blocked';
  const D = G.DAYS[S.dayIds[S.day]];
  const E = D.entrants[S.idx];
  const truth = ppEval(G, E, D.rules, S.today);
  const okDec = choice === truth.decision;
  const eco = G.ECONOMY || {};
  if (okDec) { S.correct++; S.money += eco.salary || 0; }
  else { S.wrong++; S.money -= eco.penaltyFee || 0; }
  S.log.push({ entrant: E.id, choice, truth: truth.decision, reasons: truth.reasons });
  if (!okDec && S.wrong >= S.maxWrong) { S.lost = true; return 'lose'; }
  S.idx++;
  if (S.idx >= D.entrants.length) {
    S.money -= eco.rent || 0; S.day++; S.idx = 0;
    if (S.day >= S.dayIds.length) { S.won = true; return 'win'; }
    return 'day';
  }
  return okDec ? 'correct' : 'wrong';
}

// ============================================================================
// Lógica del perfil `tower-defense` — PURA, por ticks y SIN azar (spawns por
// count/gap, targeting al enemigo más avanzado en rango). Todo el balance sale
// del artefacto: TOWERS, DMG_CHART, ENEMIES (via spawns expandidos), WAVES,
// ECONOMY, BALANCE. Semántica del motor (SPEC §8): el ejemplo no declara MAPS,
// así que el camino es una ruta en S fija sobre rejilla 12x8 (TD_COLS/TD_ROWS);
// 30 ticks ~ 1s nominal: speed = celdas/s, rate = disparos/s, gap en ticks.
// Recompensa de oleada y luego interés (floor(gold*interestRate)) al limpiarla.
// ============================================================================
export const TD_COLS = 12, TD_ROWS = 8;
export function tdPath() {
  const pts = [[0, 1], [9, 1], [9, 4], [2, 4], [2, 6], [11, 6]];
  const path = [];
  for (let i = 0; i < pts.length - 1; i++) {
    let [c, r] = pts[i]; const [c2, r2] = pts[i + 1];
    while (c !== c2 || r !== r2) { path.push({ col: c, row: r }); c += Math.sign(c2 - c); r += Math.sign(r2 - r); }
  }
  path.push({ col: pts[pts.length - 1][0], row: pts[pts.length - 1][1] });
  return path;
}
// Posición interpolada de un enemigo por su progreso (en celdas) sobre el camino.
export function tdPos(path, prog) {
  const i = Math.min(path.length - 1, Math.floor(prog));
  const a = path[i], b = path[Math.min(path.length - 1, i + 1)], f = prog - i;
  return { col: a.col + (b.col - a.col) * f, row: a.row + (b.row - a.row) * f };
}
export function tdInit(G) {
  return { gold: (G.ECONOMY || {}).startGold || 0, lives: (G.ECONOMY || {}).startLives || 1,
           waveIds: Object.keys(G.WAVES || {}).sort((a, b) => +a - +b),
           wave: 0, waveActive: false, t: 0, queue: [], towers: [], enemies: [],
           spawned: 0, killed: 0, leaked: 0, won: false, lost: false };
}
const tdCell = (S, path, col, row) =>
  path.some(p => p.col === col && p.row === row) ? 'path' :
  S.towers.some(t => t.col === col && t.row === row) ? 'tower' : 'free';
export function tdBuild(G, S, type, col, row, path) {
  const T = (G.TOWERS || {})[type];
  if (S.won || S.lost || !T || S.gold < T.cost) return 'blocked';
  if (col < 0 || col >= TD_COLS || row < 0 || row >= TD_ROWS) return 'blocked';
  if (tdCell(S, path, col, row) !== 'free') return 'blocked';
  S.gold -= T.cost;
  S.towers.push({ type, col, row, cd: 0 });
  return 'ok';
}
export function tdSell(G, S, col, row) {
  const i = S.towers.findIndex(t => t.col === col && t.row === row);
  if (S.won || S.lost || i === -1) return 'blocked';
  S.gold += Math.floor(G.TOWERS[S.towers[i].type].cost * ((G.BALANCE || {}).sellRatio || 0));
  S.towers.splice(i, 1);
  return 'ok';
}
export function tdStartWave(G, S) {
  if (S.won || S.lost || S.waveActive || S.wave >= S.waveIds.length) return 'blocked';
  const W = G.WAVES[S.waveIds[S.wave]];
  S.queue = [];
  for (const sp of (W.spawns || []))
    for (let k = 0; k < (sp.count || 1); k++)
      S.queue.push({ spec: sp, at: S.t + k * (sp.gap || 30) });
  S.waveActive = true;
  return 'wave';
}
export function tdTick(G, S, path) {
  if (S.won || S.lost || !S.waveActive) return 'idle';
  S.t++;
  // spawns pendientes cuyo tick llegó
  for (let i = S.queue.length - 1; i >= 0; i--)
    if (S.queue[i].at <= S.t) {
      const sp = S.queue[i].spec;
      S.enemies.push({ name: sp.enemy, hp: sp.hp, speed: sp.speed, armor: sp.armor, bounty: sp.bounty, prog: 0 });
      S.spawned++; S.queue.splice(i, 1);
    }
  // avance de enemigos; fuga al final del camino
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    e.prog += e.speed / 30;
    if (e.prog >= path.length - 1) {
      S.enemies.splice(i, 1); S.leaked++; S.lives--;
      if (S.lives <= 0) { S.lost = true; return 'lose'; }
    }
  }
  // torres: dispara cada 30/rate ticks al enemigo mas avanzado dentro de range
  for (const t of S.towers) {
    if (--t.cd > 0) continue;
    const T = G.TOWERS[t.type];
    let best = null;
    for (const e of S.enemies) {
      const p = tdPos(path, e.prog);
      if (Math.hypot(p.col - t.col, p.row - t.row) <= T.range && (!best || e.prog > best.prog)) best = e;
    }
    if (!best) continue;
    t.cd = Math.round(30 / T.rate);
    best.hp -= T.damage * (((G.DMG_CHART || {})[T.dmgType] || {})[best.armor] != null ? G.DMG_CHART[T.dmgType][best.armor] : 1);
    if (best.hp <= 0) {
      S.enemies.splice(S.enemies.indexOf(best), 1);
      S.killed++; S.gold += best.bounty || 0;
    }
  }
  // oleada limpia: recompensa + interes; victoria si era la ultima
  if (S.queue.length === 0 && S.enemies.length === 0) {
    const W = G.WAVES[S.waveIds[S.wave]];
    S.gold += W.reward || 0;
    S.gold += Math.floor(S.gold * ((G.BALANCE || {}).interestRate || 0));
    S.waveActive = false; S.wave++;
    if (S.wave >= S.waveIds.length) { S.won = true; return 'win'; }
    return 'wave-clear';
  }
  return 'ok';
}

// ============================================================================
// Lógica del perfil `platformer` — PURA, por ticks (30 ~ 1s) y determinista.
// El balance sale del artefacto: PHYSICS (gravity/jump/runSpeed), ENEMIES
// (hp/damage), LEVELS (tileset, tipos de enemigos, goal.x), PLAYER.lives.
// Semántica del motor (SPEC §8): los niveles no declaran geometría, así que el
// suelo son segmentos con huecos generados por LCG determinista por nivel, con
// huecos SIEMPRE salvables (≤ 60% del alcance de salto derivado de PHYSICS) y
// enemigos patrullando repartidos por los segmentos. Pisotón mata (KOOPA
// aguanta 2), contacto lateral resta vida (con invulnerabilidad breve), caer
// al hueco resta vida y reaparece al inicio del nivel.
// ============================================================================
export function pfJumpReach(G) { // alcance horizontal de un salto a nivel llano
  const P = G.PHYSICS || {};
  return (P.runSpeed || 5) * 2 * (P.jump || 10) / (P.gravity || 9.8);
}
export function pfLevelGeom(G, levelId, idx) {
  const L = (G.LEVELS || {})[levelId] || { enemies: [], goal: { x: 100 } };
  const rnd = lcg(1000 + idx * 77);
  const maxGap = pfJumpReach(G) * .6;
  const segs = []; // [x0, x1] de suelo (y=0)
  let x = 0, first = true;
  const end = (L.goal || {}).x || 100;
  while (x < end + 8) {
    const len = first ? 12 : 8 + rnd() * 6;
    segs.push([x, x + len]);
    x += len + Math.min(maxGap, 2.5 + rnd() * 2.5); // hueco salvable por construcción
    first = false;
  }
  // enemigos: tipos del nivel repartidos por los segmentos interiores
  const enemies = [];
  const types = L.enemies || [];
  for (let i = 0; i < types.length * 2; i++) {   // 2 instancias por tipo declarado
    const spec = (G.ENEMIES || {})[types[i % types.length]] || { hp: 1, damage: 1 };
    const seg = segs[1 + Math.floor(rnd() * Math.max(1, segs.length - 2))];
    const ex = Math.min(seg[1] - 1, Math.max(seg[0] + 1, seg[0] + 2 + rnd() * (seg[1] - seg[0] - 4)));
    if (ex < end - 2) enemies.push({ name: types[i % types.length], hp: spec.hp, damage: spec.damage,
                                     x: ex, y: 0, x0: ex, dir: 1, seg });
  }
  return { id: levelId, segs, enemies, goalX: end, tileset: L.tileset };
}
const pfGroundAt = (segs, x) => segs.some(s => x >= s[0] && x <= s[1]);
export function pfInit(G) {
  const ids = Object.keys(G.LEVELS || {}).sort();
  const startId = (G.PLAYER || {}).spawnLevel || ids[0];
  const li = Math.max(0, ids.indexOf(startId));
  return { ids, li, geom: pfLevelGeom(G, ids[li], li),
           x: 1, y: 0, vx: 0, vy: 0, onGround: true, invul: 0,
           lives: (G.PLAYER || {}).lives != null ? G.PLAYER.lives : 3,
           deaths: 0, stomps: 0, t: 0, won: false, lost: false };
}
function pfRespawn(S) { S.x = 1; S.y = 0; S.vx = 0; S.vy = 0; S.onGround = true; S.invul = 45; }
export function pfTick(G, S, input) {
  if (S.won || S.lost) return 'blocked';
  const P = G.PHYSICS || {}, dt = 1 / 30;
  S.t++; if (S.invul > 0) S.invul--;
  let ev = 'ok';
  // jugador: correr + salto + gravedad
  S.vx = (input.dir || 0) * (P.runSpeed || 5);
  if (input.jump && S.onGround) { S.vy = P.jump || 10; S.onGround = false; }
  if (!S.onGround) S.vy -= (P.gravity || 9.8) * dt;
  S.x = Math.max(0, S.x + S.vx * dt);
  S.y += S.vy * dt;
  if (S.y <= 0 && S.vy <= 0 && pfGroundAt(S.geom.segs, S.x)) { S.y = 0; S.vy = 0; S.onGround = true; }
  else if (S.y <= 0) S.onGround = false;
  if (S.y < -8) { // caída al hueco
    S.deaths++; S.lives--;
    if (S.lives < 0) { S.lost = true; return 'lose'; }
    pfRespawn(S); return 'fall';
  }
  // enemigos: patrulla ±4 dentro de su segmento
  for (const e of S.geom.enemies) {
    if (e.hp <= 0) continue;
    e.x += e.dir * 1.5 * dt;
    if (e.x > Math.min(e.x0 + 4, e.seg[1] - .5)) e.dir = -1;
    if (e.x < Math.max(e.x0 - 4, e.seg[0] + .5)) e.dir = 1;
    // contacto: pisotón si cae desde arriba; daño lateral si no
    if (Math.abs(S.x - e.x) < .6 && S.y - e.y < 1 && S.y - e.y > -.5) {
      if (S.vy < 0 && S.y - e.y > .25) {
        e.hp--; S.vy = (P.jump || 10) * .6; S.onGround = false;
        if (e.hp <= 0) { S.stomps++; ev = 'stomp'; }
      } else if (S.invul === 0) {
        S.lives -= e.damage || 1; S.invul = 45; S.vy = 3; S.onGround = false;
        if (S.lives < 0) { S.lost = true; return 'lose'; }
        ev = 'hit';
      }
    }
  }
  // meta del nivel
  if (S.x >= S.geom.goalX) {
    S.li++;
    if (S.li >= S.ids.length) { S.won = true; return 'win'; }
    S.geom = pfLevelGeom(G, S.ids[S.li], S.li);
    pfRespawn(S); S.invul = 0;
    return 'level-clear';
  }
  return ev;
}

// ============================================================================
// Lógica del perfil `crafting` — PURA, por turnos y sin azar. El balance sale
// del artefacto: MATERIALS (stack), RECIPES (station/inputs/qty/outputValue),
// ITEMS, STATIONS. Semántica del motor (SPEC §8): la meta es COMPLETAR EL
// RECETARIO (craftear cada receta ≥1 vez — derivada de los datos, sin números
// inventados) con un presupuesto de CR_ACTIONS acciones; recolectar, moverse
// de estación y craftear cuestan 1 acción; derrota al agotarlas.
// ============================================================================
export const CR_ACTIONS = 30;
export function crInit(G) {
  const inv = {}; for (const m of Object.keys(G.MATERIALS || {})) inv[m] = 0;
  const gathered = { ...inv };
  return { inv, gathered, items: {}, value: 0, at: null,
           actionsLeft: CR_ACTIONS, crafted: {}, won: false, lost: false };
}
function crSpend(S) { // cuesta 1 accion; agotar sin recetario completo = derrota
  S.actionsLeft--;
  if (S.actionsLeft <= 0 && !S.won) { S.lost = true; return 'lose'; }
  return null;
}
export function crGather(G, S, mat) {
  const M = (G.MATERIALS || {})[mat];
  if (S.won || S.lost || !M) return 'blocked';
  if (S.inv[mat] >= (M.stack || Infinity)) return 'full';
  S.inv[mat]++; S.gathered[mat]++;
  return crSpend(S) || 'ok';
}
export function crMove(G, S, station) {
  if (S.won || S.lost || !(station in (G.STATIONS || {})) || S.at === station) return 'blocked';
  S.at = station;
  return crSpend(S) || 'ok';
}
export function crCraft(G, S, recipeId) {
  const R = (G.RECIPES || {})[recipeId];
  if (S.won || S.lost || !R) return 'blocked';
  if (R.station && S.at !== R.station) return 'blocked';
  if ((R.inputs || []).some(i => (S.inv[i.material] || 0) < i.qty)) return 'blocked';
  for (const i of (R.inputs || [])) S.inv[i.material] -= i.qty;
  S.items[R.output] = (S.items[R.output] || 0) + (R.qty || 1);
  S.value += (R.outputValue != null ? R.outputValue : ((G.ITEMS || {})[R.output] || {}).value || 0) * (R.qty || 1);
  S.crafted[recipeId] = (S.crafted[recipeId] || 0) + 1;
  if (Object.keys(G.RECIPES || {}).every(r => S.crafted[r])) { S.won = true; return 'win'; }
  return crSpend(S) || 'crafted';
}

// ============================================================================
// Lógica del perfil `roguelike` — PURA y determinista. Es un PORT EXACTO de la
// generación del visor 2D de referencia (examples/roguelike.html): mismo
// mulberry32, mismo hash de coordenadas, mismas reglas de puertas/escaleras
// mutuas y cofre en la primera sala generada a profundidad >= maxDepth. El
// mismo GAME.md produce EL MISMO mundo procedural en ambos motores. Todo el
// balance sale del artefacto: GENERATOR, ENEMY_POOL, ITEM_POOL, PLAYER.
// ============================================================================
export const rgMulberry = a => function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const RG_DIRS = W => ({ N: { dx: 0, dy: -1, c: W.midC, r: 0 }, S: { dx: 0, dy: 1, c: W.midC, r: W.H - 1 },
                        W: { dx: -1, dy: 0, c: 0, r: W.midR }, E: { dx: 1, dy: 0, c: W.W - 1, r: W.midR } });
export const RG_STEP = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const RG_OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
const rgK = (x, y, z) => x + ',' + y + ',' + z;
const rgDims = G => { const GEN = G.GENERATOR; return { W: GEN.roomW, H: GEN.roomH, midC: GEN.roomW >> 1, midR: GEN.roomH >> 1 }; };
export function rgGenRoom(G, S, x, y, z) {
  const GEN = G.GENERATOR, D = rgDims(G), key = rgK(x, y, z), depth = Math.abs(x) + Math.abs(y) + Math.abs(z);
  const rng = rgMulberry((GEN.seed ^ Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791) ^ 0x9e3779b9) >>> 0);
  const tm = [];
  for (let r = 0; r < D.H; r++) { const tr = [];
    for (let c = 0; c < D.W; c++) tr.push((r === 0 || c === 0 || r === D.H - 1 || c === D.W - 1) ? GEN.wall : GEN.floor);
    tm.push(tr); }
  const opens = [];
  for (const [d, info] of Object.entries(RG_DIRS(D))) {
    const nKey = rgK(x + info.dx, y + info.dy, z);
    let open;
    if (S.rooms[nKey]) open = S.rooms[nKey].doors.some(dr => dr.dir === RG_OPP[d]);
    else open = depth < GEN.maxDepth ? rng() < (GEN.branch / 100) : false;
    opens.push({ d, info, open });
  }
  const belowK = rgK(x, y, z - 1), aboveK = rgK(x, y, z + 1);
  let hasDown = S.rooms[belowK] ? !!S.rooms[belowK].hasUp : (z > -GEN.maxFloor ? rng() < (GEN.floorChance / 100) : false);
  let hasUp = S.rooms[aboveK] ? !!S.rooms[aboveK].hasDown : (z < GEN.maxFloor ? rng() < (GEN.floorChance / 100) : false);
  if (!opens.some(o => o.open) && !hasDown && !hasUp) opens[Math.floor(rng() * 4)].open = true;
  const doors = [];
  for (const o of opens) if (o.open) { tm[o.info.r][o.info.c] = GEN.door; doors.push({ col: o.info.c, row: o.info.r, dir: o.d }); }
  const stairs = [];
  if (hasDown) { tm[1][1] = GEN.stairsDown; stairs.push({ col: 1, row: 1, go: 'down' }); }
  if (hasUp) { tm[1][D.W - 2] = GEN.stairsUp; stairs.push({ col: D.W - 2, row: 1, go: 'up' }); }
  const enemies = [];
  if (depth > 0) { const n = Math.floor(rng() * (depth >= 2 ? 3 : 2));
    for (let i = 0; i < n; i++) { const ec = 1 + Math.floor(rng() * (D.W - 2)), er = 1 + Math.floor(rng() * (D.H - 2));
      if (tm[er][ec] !== GEN.floor) continue;
      const t = G.ENEMY_POOL[Math.floor(rng() * Math.max(1, G.ENEMY_POOL.length))] || {};
      enemies.push({ col: ec, row: er, tile: t.tile || GEN.enemy, pal: t.pal || 0, hp: t.hp || 1,
                     dir: rng() < .5 ? 1 : -1, axis: rng() < .5 ? 'h' : 'v', alive: true }); } }
  const items = [];
  if (depth > 0 && (G.ITEM_POOL || []).length && rng() < (GEN.itemChance / 100)) {
    for (let tries = 0; tries < 8; tries++) {
      const ic = 1 + Math.floor(rng() * (D.W - 2)), ir = 1 + Math.floor(rng() * (D.H - 2));
      if (tm[ir][ic] !== GEN.floor || enemies.some(e => e.col === ic && e.row === ir)) continue;
      items.push(Object.assign({ col: ic, row: ir, taken: false }, G.ITEM_POOL[Math.floor(rng() * G.ITEM_POOL.length)])); break;
    }
  }
  let goal = null;
  if (depth >= GEN.maxDepth && !S.goalPlaced) { goal = { col: D.midC, row: D.midR, tile: GEN.goal, pal: 0 }; S.goalPlaced = true; }
  S.rooms[key] = { tilemap: tm, doors, stairs, hasUp, hasDown, enemies, items, goal, depth, x, y, z };
  return S.rooms[key];
}
export function rgEnter(G, S, x, y, z, from) {
  const D = rgDims(G), key = rgK(x, y, z), isNew = !S.rooms[key];
  if (isNew) rgGenRoom(G, S, x, y, z);
  S.cur = key;
  if (from === 'E') S.pos = { col: 1, row: D.midR };
  else if (from === 'W') S.pos = { col: D.W - 2, row: D.midR };
  else if (from === 'S') S.pos = { col: D.midC, row: 1 };
  else if (from === 'N') S.pos = { col: D.midC, row: D.H - 2 };
  else if (from === 'down') S.pos = { col: 1, row: 1 };
  else if (from === 'up') S.pos = { col: D.W - 2, row: 1 };
  else S.pos = { col: D.midC, row: D.midR };
  return isNew;
}
export function rgInit(G) {
  const S = { rooms: {}, goalPlaced: false, cur: null, pos: null,
              hp: (G.PLAYER || {}).hp || 5, maxHp: (G.PLAYER || {}).hp || 5,
              atk: (G.PLAYER || {}).atk || 1, weapon: 'puños',
              invuln: 0, kills: 0, deaths: 0, won: false };
  rgEnter(G, S, 0, 0, 0, null);
  return S;
}
const rgRoom = S => S.rooms[S.cur];
const rgSolid = (G, room, c, r) => {
  const tm = room.tilemap;
  if (c < 0 || r < 0 || r >= tm.length || c >= tm[0].length) return true;
  return !!((G.TILES || {})[String(tm[r][c])] || {}).solid;
};
function rgHurt(G, S) {
  const D = rgDims(G);
  if (S.invuln > 0 || S.won) return 'ok';
  S.hp--; S.invuln = 2;
  if (S.hp <= 0) { S.hp = S.maxHp; S.invuln = 3; S.deaths++; rgEnter(G, S, 0, 0, 0, null); return 'fallen'; }
  S.pos = { col: D.midC, row: D.midR };
  return 'hurt';
}
export function rgMove(G, S, dc, dr) {
  if (S.won) return 'blocked';
  const room = rgRoom(S), nc = S.pos.col + dc, nr = S.pos.row + dr;
  const door = room.doors.find(d => d.col === nc && d.row === nr);
  if (door) { const st = RG_STEP[door.dir];
    return rgEnter(G, S, room.x + st[0], room.y + st[1], room.z, door.dir) ? 'door-new' : 'door'; }
  const st = room.stairs.find(s => s.col === nc && s.row === nr);
  if (st) { const nz = room.z + (st.go === 'up' ? 1 : -1);
    return rgEnter(G, S, room.x, room.y, nz, st.go === 'up' ? 'down' : 'up') ? 'stairs-new' : 'stairs'; }
  if (rgSolid(G, room, nc, nr)) return 'blocked';
  S.pos = { col: nc, row: nr };
  let ev = 'ok';
  const it = room.items.find(i => !i.taken && i.col === nc && i.row === nr);
  if (it) { it.taken = true; S.lastItem = it;
    if (it.kind === 'heal') { S.hp = Math.min(S.maxHp, S.hp + it.amount); ev = 'heal'; }
    else if ((it.power || 1) > S.atk) { S.atk = it.power; S.weapon = it.name || 'arma'; ev = 'weapon'; }
    else ev = 'weapon-worse'; }
  if (room.enemies.some(e => e.alive && e.col === nc && e.row === nr)) {
    const h = rgHurt(G, S); if (h !== 'ok') return h;
  }
  if (room.goal && room.goal.col === nc && room.goal.row === nr) { S.won = true; return 'win'; }
  return ev;
}
export function rgAttack(G, S) {
  if (S.won) return 'none';
  for (const e of rgRoom(S).enemies)
    if (e.alive && Math.abs(e.col - S.pos.col) + Math.abs(e.row - S.pos.row) === 1) {
      e.hp -= S.atk;
      if (e.hp <= 0) { e.alive = false; S.kills++; return 'kill'; }
      return 'hit';
    }
  return 'none';
}
export function rgPatrol(G, S) {
  if (S.won) return 'ok';
  if (S.invuln > 0) S.invuln--;
  const room = rgRoom(S);
  for (const e of room.enemies) {
    if (!e.alive) continue;
    const dx = e.axis === 'v' ? 0 : e.dir, dy = e.axis === 'v' ? e.dir : 0;
    let nc = e.col + dx, nr = e.row + dy;
    if (rgSolid(G, room, nc, nr)) { e.dir *= -1; nc = e.col - dx; nr = e.row - dy; if (rgSolid(G, room, nc, nr)) continue; }
    e.col = nc; e.row = nr;
    if (e.col === S.pos.col && e.row === S.pos.row) { const h = rgHurt(G, S); if (h !== 'ok') return h; }
  }
  return 'ok';
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
