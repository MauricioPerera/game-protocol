/**
 * game3d-logic.js — Tests de la lógica PURA del runtime game3d (sin THREE/DOM).
 * Fórmulas de combate deterministas (rnd inyectado), captura (fórmula de BALANCE),
 * XP/niveles/evoluciones, colisión de grid y visión de entrenadores.
 * Uso: node test/game3d-logic.js
 */
const path = require('path');

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
  if (cond) { pass++; console.log('PASS  ' + label); }
  else { fail++; console.log('FAIL  ' + label + (extra ? '  ' + extra : '')); }
};

(async () => {
  const url = 'file://' + path.resolve(__dirname, '../examples/game3d-logic.mjs').replace(/\\/g, '/');
  const L = await import(url);

  // ---- typeMult ----
  ok(L.typeMult({ FIRE: { GRASS: 2 } }, 'FIRE', 'GRASS') === 2, 'typeMult  x2 del chart');
  ok(L.typeMult({ FIRE: { GRASS: 2 } }, 'GRASS', 'FIRE') === 1, 'typeMult  ausente => x1');
  ok(L.typeMult({}, 'X', 'Y') === 1, 'typeMult  chart vacio => x1');

  // ---- damage (rnd = .5 => varianza exactamente 1.0) ----
  const def5 = { lvl: 5, type: 'GRASS' };
  ok(L.damage({ power: 10, type: 'FIRE' }, { lvl: 5 }, def5, { FIRE: { GRASS: 2 } }, .5) === 20,
     'damage  10 x2 x1.0 = 20 (determinista con rnd=.5)');
  ok(L.damage({ power: 10, type: 'FIRE' }, { lvl: 10 }, def5, { FIRE: { GRASS: 2 } }, .5) === 23,
     'damage  factor de nivel +3%/nivel (lvl10 vs 5 => 23)');
  ok(L.damage({ power: 10, type: 'FIRE' }, { lvl: 5, status: 'slow' }, def5, { FIRE: { GRASS: 2 } }, .5) === 16,
     'damage  slow en el atacante => -20% (16)');
  ok(L.damage({ power: 1, type: 'X' }, { lvl: 1 }, { lvl: 99, type: 'Y' }, {}, 0) === 1,
     'damage  minimo 1');

  // ---- catchProb: la formula documentada de BALANCE ----
  ok(Math.abs(L.catchProb({ catchBase: .35, catchScale: .5 }, { hp: 5, maxhp: 20 }) - (.35 + .5 * .75)) < 1e-9,
     'catchProb  catchBase + catchScale*(1-hp/maxhp)');
  ok(Math.abs(L.catchProb({ catchBase: .35, catchScale: .5 }, { hp: 20, maxhp: 20 }) - .35) < 1e-9,
     'catchProb  a vida llena = catchBase');

  // ---- makeMon / expandMoves ----
  const SP = { SPROUTLE: { type: 'FLORA', maxhp: 22, moves: ['TACKLE'], sprite: 'kaiju' } };
  const MV = { TACKLE: { type: 'NORMAL', power: 5 } };
  const m7 = L.makeMon('SPROUTLE', 7, SP, MV);
  ok(m7.maxhp === 26 && m7.hp === 26, 'makeMon  +2 maxhp por nivel sobre 5 (N7 => 26)');
  ok(m7.moves[0].name === 'TACKLE' && m7.moves[0].power === 5, 'makeMon  moves expandidos desde MOVES');
  ok(L.makeMon({ name: 'X', maxhp: 30, type: 'T', moves: [{ name: 'GOLPE', power: 3 }] }, 5, SP, MV).maxhp === 30,
     'makeMon  acepta entradas ya expandidas (equipos de TRAINERS)');

  // ---- gainXP: niveles + evolucion en cadena ----
  const EVO = { SPROUTLE: { into: 'THORNBACK', level: 6, maxhp: 34, moves: ['TACKLE'] } };
  const w = L.makeMon('SPROUTLE', 5, SP, MV);
  const log = L.gainXP(w, { maxhp: 200, lvl: 10 }, { xpCurveMul: 1 }, EVO, MV);
  ok(w.lvl >= 6 && w.name === 'THORNBACK', 'gainXP  sube de nivel y evoluciona a THORNBACK',
     JSON.stringify({ lvl: w.lvl, name: w.name }));
  ok(log.some(l => /Evoluciona/.test(l)), 'gainXP  log de evolucion presente');
  const w2 = L.makeMon('SPROUTLE', 5, SP, MV);
  L.gainXP(w2, { maxhp: 4, lvl: 1 }, { xpCurveMul: 5 }, EVO, MV);
  ok(w2.lvl === 5 && w2.name === 'SPROUTLE', 'gainXP  xp insuficiente => sin nivel ni evolucion');

  // ---- canStep ----
  const TM = [[1, 2], [3, 4]], SOLID = new Set([3]);
  ok(L.canStep(TM, SOLID, 0, 1) === false, 'canStep  tile solido bloquea');
  ok(L.canStep(TM, SOLID, 1, 1) === true, 'canStep  tile libre pasa');
  ok(L.canStep(TM, SOLID, 5, 0) === false, 'canStep  fuera de limites bloquea');
  ok(L.canStep(TM, SOLID, 0, 9) === false, 'canStep  fila inexistente bloquea');

  // ---- trainerInSight ----
  const TR = [{ name: 'LILA', col: 8, row: 5, sight: 3 }];
  ok((L.trainerInSight(TR, new Set(), { col: 6, row: 5 }, () => false) || {}).name === 'LILA',
     'sight  misma fila a distancia 2 => visto');
  ok(L.trainerInSight(TR, new Set(), { col: 6, row: 5 }, () => true) === null,
     'sight  linea de vision bloqueada => no visto');
  ok(L.trainerInSight(TR, new Set(['LILA']), { col: 6, row: 5 }, () => false) === null,
     'sight  derrotado => no visto');
  ok(L.trainerInSight(TR, new Set(), { col: 2, row: 5 }, () => false) === null,
     'sight  fuera de alcance (6 > sight 3) => no visto');
  ok((L.trainerInSight(TR, new Set(), { col: 8, row: 3 }, () => false) || {}).name === 'LILA',
     'sight  misma columna dentro de alcance => visto');
  ok(L.trainerInSight(TR, new Set(), { col: 6, row: 4 }, () => false) === null,
     'sight  diagonal => no visto');

  console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' tests de logica game3d pasan') : (fail + ' FALLOS de ' + (pass + fail))));
  process.exit(fail === 0 ? 0 : 1);
})();
