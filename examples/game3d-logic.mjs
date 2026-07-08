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
