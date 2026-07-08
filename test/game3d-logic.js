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

  // ============================================================
  // Sudoku: valida los puzzles REALES + juega en Node
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/sudoku.generated.js'));
  const GS = global.window.GAME; delete global.window;
  ok(GS.profile === 'sudoku', 'sudoku  artefacto con meta profile=sudoku');
  for (const [id, p] of Object.entries(GS.PUZZLES))
    ok(L.sudokuCheck(p.grid, p.solution) === null, 'sudoku  puzzle ' + id + ' (' + p.difficulty + ') valido y consistente');
  // el validador rechaza formas rotas
  const P1 = GS.PUZZLES.P1;
  ok(L.sudokuCheck(P1.grid.slice(0, 80), P1.solution) !== null, 'sudoku  grid de 80 chars -> rechazado');
  ok(L.sudokuCheck(P1.grid, P1.solution.slice(0, 80) + 'x') !== null, 'sudoku  solution corrupta -> rechazada');
  const badGiven = '9' + P1.grid.slice(1);
  ok(/no coincide/.test(L.sudokuCheck(badGiven, P1.solution) || ''), 'sudoku  pista que contradice solution -> rechazada');
  const swapped = P1.solution.slice(0, 79) + P1.solution[80] + P1.solution[79];
  ok(L.sudokuCheck('.'.repeat(81), swapped) !== null, 'sudoku  solution con celdas intercambiadas -> invalida');
  // (a) VICTORIA: rellenar cada vacio con la solucion
  {
    const S = L.sudokuInit(GS);
    ok(S.err === null && S.id === 'P1', 'sudoku  init en player.start (P1) sin error');
    for (let i = 0; i < 81; i++) if (!S.given[i]) L.sudokuSet(S, i, +S.solution[i]);
    ok(S.won === true && S.mistakes === 0 && S.lost === false, 'sudoku  VICTORIA rellenando la solucion (0 fallos)');
  }
  // (b) DERROTA: errar hasta agotar vidas; y las pistas dadas son inmutables
  {
    const S = L.sudokuInit(GS);
    const empty = S.grid.findIndex((v, j) => v === 0);
    const wrongVal = (+S.solution[empty] % 9) + 1;
    const intentos = S.lives + 1;   // cota fija: lives decrementa dentro del bucle
    let r = '';
    for (let k = 0; k < intentos && r !== 'lose'; k++) r = L.sudokuSet(S, empty, wrongVal);
    ok(S.lost === true && S.grid[empty] === 0, 'sudoku  DERROTA al agotar vidas (la celda sigue vacia)');
    const S2 = L.sudokuInit(GS);
    const givenIdx = S2.given.findIndex(g => g);
    ok(L.sudokuSet(S2, givenIdx, 5) === 'blocked', 'sudoku  las pistas dadas son inmutables');
  }
  // (c) pista: rellena una celda correcta y descuenta
  {
    const S = L.sudokuInit(GS);
    const h0 = S.hints, r = L.sudokuHint(S);
    ok(r === 'hint' && S.hints === h0 - 1, 'sudoku  hint rellena y descuenta');
    ok(S.grid.filter((v, j) => v !== 0 && !S.given[j]).length === 1, 'sudoku  hint escribio exactamente una celda');
  }

  // ============================================================
  // Senku (peg-solitaire): valida los tableros REALES y REJUEGA
  // las soluciones del generador (scratchpad/gen-peg.js) en Node
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/senku.generated.js'));
  const GP = global.window.GAME; delete global.window;
  ok(GP.profile === 'peg-solitaire', 'senku  artefacto con meta profile=peg-solitaire');
  for (const [id, b] of Object.entries(GP.BOARDS))
    ok(L.pegCheck(b.layout) === null, 'senku  tablero ' + id + ' (' + b.difficulty + ', goal ' + b.goal + ') valido');
  // el validador rechaza formas rotas
  ok(L.pegCheck(GP.BOARDS.B1.layout.slice(0, 6)) !== null, 'senku  layout de 6 filas -> rechazado');
  ok(L.pegCheck(['__...__', '__...__', '..X....', '..ooo..', '...o...', '__.o.__', '__...__']) !== null,
     'senku  caracter fuera de "_o." -> rechazado');
  ok(L.pegCheck(['_______', '_______', '.......', '...o...', '.......', '_______', '_______']) !== null,
     'senku  menos de 2 pegs -> rechazado');
  // Soluciones emitidas por el solver DFS del generador (no calculadas a mano).
  const PEG_SOLS = {
    B1: [[24, 22], [38, 24], [25, 23], [22, 24]],
    B2: [[11, 25], [24, 22], [26, 24], [32, 30], [45, 31], [24, 38], [39, 37], [37, 23], [22, 24]],
    B3: [[10, 24], [15, 17], [2, 16], [4, 2], [17, 15], [14, 16], [18, 4], [20, 18], [23, 9], [2, 16],
         [21, 23], [23, 9], [25, 23], [27, 25], [25, 11], [4, 18], [30, 16], [9, 23], [28, 30], [31, 29],
         [39, 25], [34, 32], [44, 30], [23, 37], [46, 44], [44, 30], [29, 31], [31, 33], [18, 32],
         [33, 31], [38, 24]],
  };
  // (a) VICTORIA en los 3 tableros rejugando su solucion + conservacion (1 peg menos por salto)
  for (const [id, sol] of Object.entries(PEG_SOLS)) {
    const S = L.pegInit(GP, id);
    const pegs0 = S.pegs;
    let conserva = true, last = '';
    for (const [from, to] of sol) {
      last = L.pegMove(S, from, to);
      if (S.pegs !== pegs0 - S.moves) conserva = false;
      if (last === 'blocked') break;
    }
    ok(last === 'win' && S.won === true && S.pegs === 1, 'senku  VICTORIA rejugando la solucion de ' + id + ' (' + sol.length + ' saltos)');
    ok(conserva, 'senku  conservacion en ' + id + ': pegs = iniciales - saltos en cada paso');
    if (id === 'B3') ok(S.cells[24] === 1, 'senku  B3 (goal center): el ultimo peg queda en el centro');
  }
  ok(L.pegInit(GP).id === 'B1', 'senku  init respeta player.start (B1)');
  // (b) saltos ilegales -> blocked (sin peg, sin alineacion, sin peg en medio, cruce de fila)
  {
    const S = L.pegInit(GP, 'B1');
    ok(L.pegMove(S, 22, 24) === 'blocked', 'senku  salto desde hueco -> blocked');
    ok(L.pegMove(S, 24, 10) === 'blocked', 'senku  salto sin peg intermedio -> blocked');
    ok(L.pegMove(S, 24, 25) === 'blocked', 'senku  distancia 1 -> blocked');
    ok(S.moves === 0, 'senku  los saltos bloqueados no consumen movimientos');
  }
  // (c) DERROTA por bloqueo: dos pegs quedan aislados tras el unico salto
  {
    const G2 = { BOARDS: { X: { layout: ['oo.....', '.......', '.......', '.......', '.......', '.......', '......o'], goal: 'clear' } }, PLAYER: { start: 'X' } };
    const S = L.pegInit(G2);
    ok(L.pegMove(S, 0, 2) === 'lose' && S.lost === true, 'senku  DERROTA: sin saltos posibles con 2 pegs aislados');
  }
  // (d) goal center: dejar 1 peg fuera del centro es derrota
  {
    const G3 = { BOARDS: { X: { layout: ['oo.....', '.......', '.......', '.......', '.......', '.......', '.......'], goal: 'center' } }, PLAYER: { start: 'X' } };
    const S = L.pegInit(G3);
    ok(L.pegMove(S, 0, 2) === 'lose' && S.lost === true && S.pegs === 1, 'senku  goal center: 1 peg fuera del centro -> derrota');
  }

  // ============================================================
  // Papers Please: la verdad computada desde las RULES debe
  // coincidir con la `decision` declarada de cada solicitante,
  // y la partida se gana/pierde en Node
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/papers-please.generated.js'));
  const GB = global.window.GAME; delete global.window;
  ok(GB.profile === 'papers-please', 'papers  artefacto con meta profile=papers-please');
  // (a) oraculo de autoria: ppEval reproduce la decision declarada de TODOS los solicitantes
  for (const [dayId, D] of Object.entries(GB.DAYS))
    for (const E of D.entrants) {
      const truth = L.ppEval(GB, E, D.rules, L.PP_TODAY);
      ok(truth.decision === E.decision, 'papers  dia ' + dayId + ' ' + E.id + ': eval=' + truth.decision + ' == declarada=' + E.decision +
         (E.reason ? ' (' + E.reason + ')' : ''));
    }
  // (b) los motivos senalan la regla violada
  ok(L.ppEval(GB, GB.ENTRANTS.E2, GB.DAYS['1'].rules, L.PP_TODAY).reasons.includes('NEED_PASSPORT'),
     'papers  E2 sin docs -> viola NEED_PASSPORT');
  ok(L.ppEval(GB, GB.ENTRANTS.E3, GB.DAYS['2'].rules, L.PP_TODAY).reasons.includes('BAN_KOLECHIA'),
     'papers  E3 (Kolechia) -> viola BAN_KOLECHIA');
  ok(L.ppEval(GB, GB.ENTRANTS.E4, GB.DAYS['2'].rules, L.PP_TODAY).reasons.includes('PASSPORT_VALID'),
     'papers  E4 (1982.01) -> viola PASSPORT_VALID (caducado)');
  // require-field-match dispara cuando dos docs presentes discrepan
  {
    const fake = { docs: { PASSPORT: { name: 'A', country: 'ARSTOTZKA', expiration: '1983.06' }, ID_CARD: { name: 'B' } } };
    ok(L.ppEval(GB, fake, GB.DAYS['2'].rules, L.PP_TODAY).reasons.includes('NAME_MATCH'),
       'papers  nombres discrepantes entre docs -> viola NAME_MATCH');
  }
  // (c) VICTORIA jugando perfecto: money = aciertos*salary - dias*rent (numeros desde ECONOMY)
  {
    const S = L.ppInit(GB);
    let r = '', total = 0;
    while (!S.won && !S.lost) {
      const D = GB.DAYS[S.dayIds[S.day]];
      r = L.ppDecide(GB, S, L.ppEval(GB, L.ppEntrant(GB, S), D.rules, S.today).decision);
      total++;
    }
    const eco = GB.ECONOMY, dias = Object.keys(GB.DAYS).length;
    ok(r === 'win' && S.won && S.wrong === 0, 'papers  VICTORIA jugando perfecto (' + total + ' decisiones, 0 errores)');
    ok(S.money === S.correct * eco.salary - dias * eco.rent,
       'papers  money = ' + S.correct + '*salary - ' + dias + '*rent = ' + S.money);
    ok(S.correct + S.wrong === total, 'papers  conservacion: procesados = aciertos + fallos');
  }
  // (d) DERROTA al 3er error: decidir siempre lo contrario
  {
    const S = L.ppInit(GB);
    let r = '';
    while (!S.won && !S.lost) {
      const D = GB.DAYS[S.dayIds[S.day]];
      const truth = L.ppEval(GB, L.ppEntrant(GB, S), D.rules, S.today).decision;
      r = L.ppDecide(GB, S, truth === 'approve' ? 'deny' : 'approve');
    }
    ok(r === 'lose' && S.lost && S.wrong === S.maxWrong, 'papers  DERROTA al ' + S.maxWrong + 'o error decidiendo al reves');
    ok(L.ppDecide(GB, S, 'approve') === 'blocked', 'papers  partida terminada -> blocked');
  }

  // ============================================================
  // Tower Defense: partida completa ganada y perdida en Node,
  // determinista (sin azar), con el balance del artefacto
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/tower-defense.generated.js'));
  const GT = global.window.GAME; delete global.window;
  ok(GT.profile === 'tower-defense', 'td  artefacto con meta profile=tower-defense');
  const tdP = L.tdPath();
  ok(tdP.length > 20 && tdP[0].col === 0 && tdP[tdP.length - 1].col === 11, 'td  camino en S de ' + tdP.length + ' celdas (entrada col 0, salida col 11)');
  // (a) construccion: en camino -> blocked; sin oro -> blocked; venta = floor(cost*sellRatio)
  {
    const S = L.tdInit(GT);
    ok(S.gold === GT.ECONOMY.startGold && S.lives === GT.ECONOMY.startLives, 'td  init con ECONOMY (oro ' + S.gold + ', vidas ' + S.lives + ')');
    ok(L.tdBuild(GT, S, 'rifle', tdP[3].col, tdP[3].row, tdP) === 'blocked', 'td  construir SOBRE el camino -> blocked');
    ok(L.tdBuild(GT, S, 'laser', 1, 0, tdP) === 'ok' && L.tdBuild(GT, S, 'laser', 3, 0, tdP) === 'blocked',
       'td  sin oro para el 2o laser -> blocked');
    const g0 = S.gold;
    ok(L.tdSell(GT, S, 1, 0) === 'ok' && S.gold === g0 + Math.floor(GT.TOWERS.laser.cost * GT.BALANCE.sellRatio),
       'td  venta devuelve floor(cost*sellRatio) = ' + Math.floor(GT.TOWERS.laser.cost * GT.BALANCE.sellRatio));
  }
  // (b) VICTORIA con estrategia fija: 4 rifles centrales (cubren las 3 pasadas) + refuerzo tras la oleada 1
  {
    const S = L.tdInit(GT);
    for (const [c, r] of [[2, 2], [4, 2], [6, 2], [8, 2]]) L.tdBuild(GT, S, 'rifle', c, r, tdP);
    let r = '', conserva = true, guard = 0;
    while (!S.won && !S.lost && guard++ < 100000) {
      if (!S.waveActive) {
        if (S.gold >= GT.TOWERS.rifle.cost) L.tdBuild(GT, S, 'rifle', 5, 5, tdP);
        L.tdStartWave(GT, S);
      }
      r = L.tdTick(GT, S, tdP);
      if (S.spawned !== S.killed + S.leaked + S.enemies.length) conserva = false;
    }
    ok(r === 'win' && S.won && S.lives > 0, 'td  VICTORIA: ' + S.waveIds.length + ' oleadas superadas (vidas ' + S.lives + '/' + GT.ECONOMY.startLives + ', ' + S.t + ' ticks)');
    ok(conserva, 'td  conservacion en cada tick: aparecidos = muertos + fugados + vivos');
    ok(S.killed + S.leaked === S.spawned && S.enemies.length === 0, 'td  al final: ' + S.killed + ' muertos + ' + S.leaked + ' fugados = ' + S.spawned + ' aparecidos');
  }
  // (c) DERROTA sin defensas (vidas recortadas a 3 para forzarla: el ejemplo trae 20 y solo 15 enemigos)
  {
    const S = L.tdInit(GT); S.lives = 3;
    let r = '', guard = 0;
    while (!S.won && !S.lost && guard++ < 100000) {
      if (!S.waveActive) L.tdStartWave(GT, S);
      r = L.tdTick(GT, S, tdP);
    }
    ok(r === 'lose' && S.lost && S.leaked >= 3, 'td  DERROTA sin torres: ' + S.leaked + ' fugas agotan las vidas');
    ok(L.tdStartWave(GT, S) === 'blocked' && L.tdBuild(GT, S, 'rifle', 1, 0, tdP) === 'blocked', 'td  partida terminada -> blocked');
  }

  // ============================================================
  // Platformer: geometria salvable POR CONSTRUCCION (verificada
  // contra PHYSICS) y partida ganada/perdida por bot en Node
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/platformer.generated.js'));
  const GF = global.window.GAME; delete global.window;
  ok(GF.profile === 'platformer', 'pf  artefacto con meta profile=platformer');
  // (a) geometria determinista y salvable: huecos <= 60% del alcance de salto (derivado de PHYSICS)
  {
    const reach = L.pfJumpReach(GF);
    ok(reach > 0, 'pf  alcance de salto desde PHYSICS = ' + reach.toFixed(1) + ' unidades');
    const ids = Object.keys(GF.LEVELS).sort();
    for (let i = 0; i < ids.length; i++) {
      const g = L.pfLevelGeom(GF, ids[i], i);
      let maxGap = 0;
      for (let k = 1; k < g.segs.length; k++) maxGap = Math.max(maxGap, g.segs[k][0] - g.segs[k - 1][1]);
      ok(maxGap <= reach * .6 + 1e-9, 'pf  nivel ' + ids[i] + ': hueco maximo ' + maxGap.toFixed(1) + ' <= 60% del salto');
      ok(g.segs[g.segs.length - 1][1] >= g.goalX, 'pf  nivel ' + ids[i] + ': la meta (x=' + g.goalX + ') cae sobre suelo');
      const g2 = L.pfLevelGeom(GF, ids[i], i);
      ok(JSON.stringify(g.segs) === JSON.stringify(g2.segs), 'pf  nivel ' + ids[i] + ': geometria determinista');
    }
  }
  // (b) VICTORIA con bot: correr a la meta saltando huecos y enemigos
  {
    const S = L.pfInit(GF);
    ok(S.ids[S.li] === GF.PLAYER.spawnLevel, 'pf  init en PLAYER.spawnLevel (' + S.ids[S.li] + ')');
    let r = '', guard = 0, events = { stomp: 0, hit: 0, fall: 0, 'level-clear': 0 };
    while (!S.won && !S.lost && guard++ < 60000) {
      const gapAhead = S.onGround &&
                       ![1, 1.6].every(d => S.geom.segs.some(s => S.x + d >= s[0] && S.x + d <= s[1]));
      const enemyAhead = S.onGround && S.geom.enemies.some(e => e.hp > 0 && e.x > S.x && e.x - S.x < 2.2 && Math.abs(e.y - S.y) < 1);
      r = L.pfTick(GF, S, { dir: 1, jump: gapAhead || enemyAhead });
      if (events[r] != null) events[r]++;
    }
    ok(r === 'win' && S.won, 'pf  VICTORIA del bot: ' + S.ids.length + ' niveles (' + S.t + ' ticks, ' +
       events.stomp + ' pisotones, ' + events.hit + ' golpes, ' + events.fall + ' caidas, vidas ' + S.lives + ')');
    ok(events['level-clear'] === S.ids.length - 1, 'pf  paso por ' + (S.ids.length - 1) + ' cambios de nivel');
  }
  // (c) piso a un GOOMBA (hp 1) y un KOOPA aguanta 2 (hp desde ENEMIES)
  {
    const S = L.pfInit(GF);
    const e = S.geom.enemies.find(x => x.name === 'GOOMBA');
    S.x = e.x; S.y = .5; S.vy = -2; S.onGround = false; e.dir = 0;
    const r = L.pfTick(GF, S, { dir: 0, jump: false });
    ok(r === 'stomp' && e.hp === 0 && S.vy > 0, 'pf  pisoton mata al GOOMBA (hp 1) y rebota');
    const k = S.geom.enemies.find(x => x.name === 'KOOPA');
    S.x = k.x; S.y = .5; S.vy = -2; S.onGround = false; k.dir = 0;
    const r2 = L.pfTick(GF, S, { dir: 0, jump: false });
    ok(r2 !== 'stomp' && k.hp === 1, 'pf  el KOOPA aguanta el primer pisoton (hp 2 -> 1)');
  }
  // (d) contacto lateral resta vida (con invulnerabilidad) y DERROTA al agotar vidas
  {
    const S = L.pfInit(GF);
    const e = S.geom.enemies[0]; e.dir = 0;
    let r = '', guard = 0;
    while (!S.lost && guard++ < 20000) { S.x = e.x; S.y = 0; S.vy = 0; S.onGround = true; r = L.pfTick(GF, S, { dir: 0, jump: false }); }
    ok(r === 'lose' && S.lost, 'pf  DERROTA por contacto repetido (vidas ' + GF.PLAYER.lives + ' agotadas)');
    ok(L.pfTick(GF, S, { dir: 1, jump: false }) === 'blocked', 'pf  partida terminada -> blocked');
  }
  // (e) caer a un hueco: muerte + respawn al inicio del nivel
  {
    const S = L.pfInit(GF);
    const gapX = S.geom.segs[0][1] + .5; // primer hueco
    S.x = gapX; S.y = -9; S.vy = -5; S.onGround = false;
    const r = L.pfTick(GF, S, { dir: 0, jump: false });
    ok(r === 'fall' && S.deaths === 1 && S.x === 1 && S.lives === GF.PLAYER.lives - 1,
       'pf  caida al hueco: muerte, respawn en x=1 y una vida menos');
  }

  // ============================================================
  // Crafting: recetario completo (meta derivada de los datos)
  // ganado y perdido en Node, con conservacion de materiales
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/crafting.generated.js'));
  const GC = global.window.GAME; delete global.window;
  ok(GC.profile === 'crafting', 'cr  artefacto con meta profile=crafting');
  // (a) VICTORIA: recolectar lo que piden TODAS las recetas (desde los datos), ir a la estacion y craftear
  {
    const S = L.crInit(GC);
    ok(Object.keys(S.inv).sort().join() === Object.keys(GC.MATERIALS).sort().join() && S.actionsLeft === L.CR_ACTIONS,
       'cr  init: inventario desde MATERIALS y ' + L.CR_ACTIONS + ' acciones');
    const need = {};
    for (const R of Object.values(GC.RECIPES)) for (const i of (R.inputs || [])) need[i.material] = (need[i.material] || 0) + i.qty;
    let acciones = 0;
    for (const [m, q] of Object.entries(need)) for (let k = 0; k < q; k++) { L.crGather(GC, S, m); acciones++; }
    let r = '';
    for (const [rid, R] of Object.entries(GC.RECIPES)) {
      if (S.at !== R.station) { L.crMove(GC, S, R.station); acciones++; }
      r = L.crCraft(GC, S, rid); acciones++;
    }
    const valorEsperado = Object.values(GC.RECIPES).reduce((a, R) => a + R.outputValue * (R.qty || 1), 0);
    ok(r === 'win' && S.won, 'cr  VICTORIA: recetario completo en ' + acciones + ' acciones (de ' + L.CR_ACTIONS + ')');
    ok(S.value === valorEsperado, 'cr  valor acumulado = suma de outputValue = ' + valorEsperado);
    const conserva = Object.keys(GC.MATERIALS).every(m => {
      let consumido = 0;
      for (const [rid, R] of Object.entries(GC.RECIPES))
        for (const i of (R.inputs || [])) if (i.material === m) consumido += i.qty * (S.crafted[rid] || 0);
      return S.gathered[m] - consumido === S.inv[m];
    });
    ok(conserva, 'cr  conservacion exacta: recolectado - consumido = inventario (por material)');
  }
  // (b) craftear sin estacion / en la estacion equivocada / sin inputs -> blocked
  {
    const S = L.crInit(GC);
    const [rid, R] = Object.entries(GC.RECIPES)[0];
    for (const i of R.inputs) for (let k = 0; k < i.qty; k++) L.crGather(GC, S, i.material);
    ok(L.crCraft(GC, S, rid) === 'blocked', 'cr  craftear sin estar en la estacion -> blocked');
    const otra = Object.keys(GC.STATIONS).find(s => s !== R.station);
    L.crMove(GC, S, otra);
    ok(L.crCraft(GC, S, rid) === 'blocked', 'cr  craftear en la estacion equivocada (' + otra + ') -> blocked');
    L.crMove(GC, S, R.station);
    const S2 = L.crInit(GC); L.crMove(GC, S2, R.station);
    ok(L.crCraft(GC, S2, rid) === 'blocked', 'cr  craftear sin materiales -> blocked');
    ok(L.crCraft(GC, S, rid) !== 'blocked', 'cr  con estacion y materiales SI se puede');
  }
  // (c) tope de stack desde MATERIALS
  {
    const S = L.crInit(GC);
    const [m, M] = Object.entries(GC.MATERIALS)[0];
    S.inv[m] = M.stack - 1;
    ok(L.crGather(GC, S, m) === 'ok' && L.crGather(GC, S, m) === 'full' && S.inv[m] === M.stack,
       'cr  stack de ' + m + ' se detiene en ' + M.stack);
  }
  // (d) DERROTA: malgastar todas las acciones sin completar el recetario
  {
    const S = L.crInit(GC);
    const m = Object.keys(GC.MATERIALS)[2]; // COAL: ninguna receta lo usa
    let r = '', guard = 0;
    while (!S.lost && guard++ < 1000) { r = L.crGather(GC, S, m); if (r === 'full') S.inv[m] = 0; }
    ok(r === 'lose' && S.lost && S.actionsLeft === 0, 'cr  DERROTA al agotar ' + L.CR_ACTIONS + ' acciones recolectando ' + m);
    ok(L.crGather(GC, S, m) === 'blocked' && L.crCraft(GC, S, Object.keys(GC.RECIPES)[0]) === 'blocked',
       'cr  partida terminada -> blocked');
  }

  // ============================================================
  // Roguelike: port exacto del generador del visor 2D — mismo
  // mundo en ambos motores; invariantes por BFS y cofre GANADO
  // jugando movimiento a movimiento en Node
  // ============================================================
  global.window = {};
  require(path.resolve(__dirname, '../examples/roguelike.generated.js'));
  const GR = global.window.GAME; delete global.window;
  ok(GR.profile === 'roguelike', 'rg  artefacto con meta profile=roguelike');
  // (a) determinismo: dos inits generan la sala origen identica
  {
    const a = L.rgInit(GR), b = L.rgInit(GR);
    ok(JSON.stringify(a.rooms['0,0,0']) === JSON.stringify(b.rooms['0,0,0']), 'rg  sala (0,0,0) identica entre inits (mismo seed)');
  }
  // (b) invariantes estructurales explorando 150 salas por BFS (via rgEnter, la misma
  //     funcion que usan puertas y escaleras)
  const S_EXP = L.rgInit(GR);
  let goalKey = null;
  {
    const queue = [[0, 0, 0]], seen = new Set(['0,0,0']);
    while (queue.length && seen.size < 150) {
      const [x, y, z] = queue.shift();
      const room = S_EXP.rooms[x + ',' + y + ',' + z] || (L.rgEnter(GR, S_EXP, x, y, z, null), S_EXP.rooms[x + ',' + y + ',' + z]);
      if (room.goal && !goalKey) goalKey = x + ',' + y + ',' + z;
      const next = room.doors.map(d => { const s = L.RG_STEP[d.dir]; return [x + s[0], y + s[1], z]; });
      if (room.hasDown) next.push([x, y, z - 1]);
      if (room.hasUp) next.push([x, y, z + 1]);
      for (const n of next) { const k = n.join(','); if (!seen.has(k)) { seen.add(k); queue.push(n); } }
    }
    const rooms = Object.values(S_EXP.rooms);
    ok(rooms.length >= 50, 'rg  BFS genero ' + rooms.length + ' salas');
    ok(rooms.every(r => r.doors.length + r.stairs.length > 0), 'rg  toda sala tiene al menos una salida (puerta o escalera)');
    let mutuas = true;
    for (const r of rooms) for (const d of r.doors) {
      const s = L.RG_STEP[d.dir], nk = (r.x + s[0]) + ',' + (r.y + s[1]) + ',' + r.z;
      if (S_EXP.rooms[nk] && !S_EXP.rooms[nk].doors.some(dd => L.RG_STEP[dd.dir][0] === -s[0] && L.RG_STEP[dd.dir][1] === -s[1])) mutuas = false;
    }
    ok(mutuas, 'rg  puertas mutuas entre salas vecinas generadas');
    let escaleras = true;
    for (const r of rooms) {
      const abajo = S_EXP.rooms[r.x + ',' + r.y + ',' + (r.z - 1)];
      if (r.hasDown && abajo && !abajo.hasUp) escaleras = false;
      const arriba = S_EXP.rooms[r.x + ',' + r.y + ',' + (r.z + 1)];
      if (r.hasUp && arriba && !arriba.hasDown) escaleras = false;
    }
    ok(escaleras, 'rg  escaleras mutuas entre pisos generados');
    ok(rooms.filter(r => r.goal).length === 1 && S_EXP.rooms[goalKey].depth >= GR.GENERATOR.maxDepth,
       'rg  cofre UNICO y a profundidad >= maxDepth (' + goalKey + ', depth ' + S_EXP.rooms[goalKey].depth + ')');
  }
  // (c) combate: matar un enemigo cuesta hp/atk golpes (datos del POOL)
  {
    const S = L.rgInit(GR);
    // buscar una sala con enemigo via BFS jugable
    let found = null;
    const queue = [[0, 0, 0]], seen = new Set(['0,0,0']);
    while (queue.length && !found) {
      const [x, y, z] = queue.shift();
      L.rgEnter(GR, S, x, y, z, null);
      const room = S.rooms[S.cur];
      if (room.enemies.some(e => e.alive)) { found = room; break; }
      for (const d of room.doors) { const s = L.RG_STEP[d.dir]; const k = (x + s[0]) + ',' + (y + s[1]) + ',' + z;
        if (!seen.has(k)) { seen.add(k); queue.push([x + s[0], y + s[1], z]); } }
    }
    ok(!!found, 'rg  BFS encontro una sala con enemigo');
    const e = found.enemies.find(x => x.alive);
    S.pos = { col: e.col - 1, row: e.row };  // adyacente
    const golpes = Math.ceil(e.hp / S.atk);
    let r = '';
    for (let k = 0; k < golpes; k++) r = L.rgAttack(GR, S);
    ok(r === 'kill' && !e.alive && S.kills === 1, 'rg  enemigo (hp del POOL) cae en ' + golpes + ' golpes con atk ' + S.atk);
    ok(L.rgAttack(GR, S) === 'none', 'rg  sin enemigos adyacentes -> none');
  }
  // (d) dano y caida: contacto sin invulnerabilidad resta vida; a 0 -> respawn en el origen
  {
    const S = L.rgInit(GR);
    let r = '', guard = 0;
    while (r !== 'fallen' && guard++ < 50) {
      S.invuln = 0;
      const room = S.rooms[S.cur];
      let e = room.enemies.find(x => x.alive);
      if (!e) { // fuerza un enemigo para el test si el azar no dio ninguno cercano
        room.enemies.push(e = { col: S.pos.col + 1, row: S.pos.row, tile: 54, pal: 0, hp: 9, dir: 0, axis: 'h', alive: true });
      }
      S.pos = { col: e.col - 1, row: e.row };
      r = L.rgMove(GR, S, 1, 0);
    }
    ok(r === 'fallen' && S.cur === '0,0,0' && S.hp === S.maxHp && S.deaths === 1,
       'rg  DERROTA por contacto: respawn en (0,0,0) con vida restaurada');
  }
  // (e) VICTORIA jugando: caminar hasta el cofre movimiento a movimiento (matando lo adyacente)
  {
    const S = L.rgInit(GR);
    const [gx, gy, gz] = goalKey.split(',').map(Number);
    // ruta a nivel de salas: reusa el grafo ya explorado (S_EXP) con BFS de salas
    const path = (function bfsPath() {
      const prev = new Map([['0,0,0', null]]); const queue = ['0,0,0'];
      while (queue.length) {
        const k = queue.shift(); if (k === goalKey) break;
        const r = S_EXP.rooms[k]; if (!r) continue;
        const nexts = r.doors.map(d => { const s = L.RG_STEP[d.dir]; return (r.x + s[0]) + ',' + (r.y + s[1]) + ',' + r.z; });
        if (r.hasDown) nexts.push(r.x + ',' + r.y + ',' + (r.z - 1));
        if (r.hasUp) nexts.push(r.x + ',' + r.y + ',' + (r.z + 1));
        for (const n of nexts) if (!prev.has(n)) { prev.set(n, k); queue.push(n); }
      }
      const out = []; let k = goalKey;
      while (k) { out.unshift(k); k = prev.get(k); }
      return out;
    })();
    ok(path[0] === '0,0,0' && path[path.length - 1] === goalKey, 'rg  BFS de salas: ruta al cofre en ' + (path.length - 1) + ' transiciones');
    // caminar la ruta con rgMove: hacia la puerta/escalera de cada transicion, matando enemigos adyacentes
    const D = { W: GR.GENERATOR.roomW, H: GR.GENERATOR.roomH };
    let r = '', guard = 0;
    const stepToward = (tc, tr) => {
      // las puertas O/E viven en la columna-muro: alli hay que alinear la FILA primero
      // (y la columna al final); para el resto, columna primero. El interior es abierto.
      let mc = 0, mr = 0;
      if (tc === 0 || tc === D.W - 1) {
        if (S.pos.row !== tr) mr = Math.sign(tr - S.pos.row); else mc = Math.sign(tc - S.pos.col);
      } else {
        if (S.pos.col !== tc) mc = Math.sign(tc - S.pos.col); else mr = Math.sign(tr - S.pos.row);
      }
      const room = S.rooms[S.cur];
      const adj = room.enemies.find(e => e.alive && e.col === S.pos.col + mc && e.row === S.pos.row + mr);
      if (adj) { L.rgAttack(GR, S); return 'atk'; }
      return L.rgMove(GR, S, mc, mr);
    };
    for (let i = 1; i < path.length && guard < 5000; i++) {
      const [nx, ny, nz] = path[i].split(',').map(Number);
      const cur = () => S.rooms[S.cur];
      // objetivo dentro de la sala actual: puerta o escalera que lleva a path[i]
      while (S.cur !== path[i] && guard++ < 5000) {
        const room = cur();
        let target;
        if (nz !== room.z) { const st = room.stairs.find(s => s.go === (nz > room.z ? 'up' : 'down')); target = st; }
        else { const dir = Object.entries(L.RG_STEP).find(([d, s]) => room.x + s[0] === nx && room.y + s[1] === ny);
               target = room.doors.find(d => d.dir === dir[0]); }
        if (!target) break; // la ruta se rompio (no deberia: puertas mutuas)
        r = stepToward(target.col, target.row);
        if (r === 'fallen') { i = 0; break; } // vuelta al origen: reintenta la ruta entera
      }
    }
    // dentro de la sala del cofre: caminar al centro
    const room = S.rooms[S.cur];
    while (!S.won && guard++ < 5000 && room === S.rooms[S.cur]) r = stepToward(room.goal.col, room.goal.row);
    ok(r === 'win' && S.won, 'rg  VICTORIA: cofre alcanzado JUGANDO (' + guard + ' acciones, ' + S.kills + ' bajas, ' + S.deaths + ' caidas)');
  }
  // (f) items: pocion cura con tope y el arma mejor sustituye (datos de ITEM_POOL)
  {
    const S = L.rgInit(GR);
    const room = S.rooms[S.cur];
    room.items.push({ col: S.pos.col + 1, row: S.pos.row, taken: false, kind: 'heal', amount: 2, name: 'Pocion' });
    S.hp = 1;
    ok(L.rgMove(GR, S, 1, 0) === 'heal' && S.hp === Math.min(S.maxHp, 3), 'rg  pocion cura +2 con tope en maxHp');
    room.items.push({ col: S.pos.col + 1, row: S.pos.row, taken: false, kind: 'weapon', power: 3, name: 'Hacha' });
    ok(L.rgMove(GR, S, 1, 0) === 'weapon' && S.atk === 3 && S.weapon === 'Hacha', 'rg  arma mejor equipa (atk 1 -> 3)');
    room.items.push({ col: S.pos.col + 1, row: S.pos.row, taken: false, kind: 'weapon', power: 2, name: 'Espada' });
    ok(L.rgMove(GR, S, 1, 0) === 'weapon-worse' && S.atk === 3, 'rg  arma peor NO sustituye');
  }

  console.log('\n' + (fail === 0 ? ('OK — ' + pass + ' tests de logica game3d pasan') : (fail + ' FALLOS de ' + (pass + fail))));
  process.exit(fail === 0 ? 0 : 1);
})();
