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

  // ============================================================
  // Simulación shooter: el juego real (neon-swarm) jugado en Node
  // ============================================================
  const fs = require('fs');
  global.window = {};
  require(path.resolve(__dirname, '../examples/neon-swarm.generated.js'));
  const G = global.window.GAME; delete global.window;
  ok(G.profile === 'shooter', 'shooter  artefacto con meta profile=shooter');

  // (a) VICTORIA con IA simple: perseguir en x al enemigo mas bajo y disparar siempre
  {
    const S = L.shooterInit(G), rnd = L.lcg(1337);
    let guard = 60 * 300;
    while (!S.won && !S.over && guard-- > 0) {
      let target = null;
      for (const e of S.enemies) if (!target || e.y < target.y) target = e;
      const dx = target ? Math.sign(target.x - S.x) : (S.x > S.w / 2 ? -1 : 1);
      L.shooterTick(G, S, { dx, fire: true }, rnd);
    }
    ok(S.won === true && S.over === false, 'shooter  VICTORIA: la IA supera las 5 oleadas',
       JSON.stringify({ won: S.won, over: S.over, wave: S.wave, score: S.score, kills: S.kills, leaked: S.leaked }));
    ok(S.wave === 5, 'shooter  las 5 oleadas cargadas (wave=5)');
    ok(S.score > 0 && S.kills > 0, 'shooter  puntuacion y kills > 0  (score=' + S.score + ', kills=' + S.kills + ')');
    const totalSpawns = Object.values(G.WAVES).reduce((a, w) => a + w.spawns.reduce((b, s) => b + s.count, 0), 0);
    ok(S.kills + S.leaked + S.lost === totalSpawns,
       'shooter  conservacion: kills+leaked+lost == spawns totales (' + totalSpawns + ')',
       JSON.stringify({ kills: S.kills, leaked: S.leaked, lost: S.lost }));
  }

  // (b) DERROTA: sin disparar ni moverse, los chasers agotan hp y vidas
  {
    const S = L.shooterInit(G), rnd = L.lcg(7);
    let guard = 60 * 300;
    while (!S.over && !S.won && guard-- > 0) L.shooterTick(G, S, { dx: 0, fire: false }, rnd);
    ok(S.over === true && S.won === false, 'shooter  DERROTA: sin input caen hp y vidas',
       JSON.stringify({ over: S.over, lives: S.lives, wave: S.wave }));
  }

  // (c) OVERDRIVE duplica la cadencia (cooldown a la mitad)
  {
    const S = L.shooterInit(G), rnd = L.lcg(1);
    L.shooterTick(G, S, { dx: 0, fire: true }, rnd);
    const coolNormal = S.cool;
    const S2 = L.shooterInit(G); S2.rapid = 300;
    L.shooterTick(G, S2, { dx: 0, fire: true }, rnd);
    ok(S2.cool === Math.max(1, Math.round(coolNormal / 2)), 'shooter  rapid: cooldown a la mitad (' + coolNormal + ' -> ' + S2.cool + ')');
  }

  // (d) AEGIS bloquea el primer impacto; MEDKIT cura con tope
  {
    const S = L.shooterInit(G); S.shield = 100;
    S.enemies.push({ name: 'DRONE', x: S.x, y: S.y, hp: 1, speed: 0, behavior: 'chaser', points: 0, phase: 0 });
    S.queue.push({ enemy: 'DRONE', at: 1e9 });   // evita que la oleada 1 cargue en este tick
    L.shooterTick(G, S, { dx: 0, fire: false }, L.lcg(2));
    ok(S.hp === S.maxhp && S.enemies.length === 0, 'shooter  shield bloquea el impacto sin perder hp');
    S.hp = S.maxhp - 1;
    S.drops.push({ x: S.x, y: S.y, effect: 'heal', amount: 99 });
    L.shooterTick(G, S, { dx: 0, fire: false }, L.lcg(3));
    ok(S.hp === S.maxhp, 'shooter  heal cura con tope en maxhp');
  }

  console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' tests de logica game3d pasan') : (fail + ' FALLOS de ' + (pass + fail))));
  process.exit(fail === 0 ? 0 : 1);
})();
