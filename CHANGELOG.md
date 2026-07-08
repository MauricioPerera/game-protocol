# Changelog

## [Unreleased]

_No hay cambios pendientes._

## [2.10.0] — 2026-07-08

Release **aditivo** sobre `2.9.0` (bump minor, [SPEC §7.0](./SPEC.md)): dos géneros
nuevos de punta a punta sin tocar el core — el **Senku** real (perfil puro-datos
`peg-solitaire`, tableros solubles por construcción, soluciones rejugadas en `npm test`)
y el perfil `sudoku`, nacido de un malentendido del nombre y conservado como género
propio. La versión del protocolo sigue en `0.1`.

### Added — perfil `peg-solitaire` (puro-datos) + Senku
- **`profiles/peg-solitaire.json`** (14º perfil, cuarto puro-datos): senku/solitario de
  clavijas — tableros como 7 filas de 7 caracteres (`_` fuera, `o` peg, `.` hueco),
  `goal` por enum (`clear` = dejar 1 peg | `center` = dejarlo en el centro),
  `difficulty` por enum y `player.start` por broken-ref. Límite documentado: la forma
  7×7 y el alfabeto de los strings no caben en las familias declarativas (dims exige
  matrices de arrays) — los valida `pegCheck` en la simulación y en `npm test` (tercer
  caso para SPEC §11: validadores de patrón/longitud de string).
- **`examples/senku.GAME.md`** (+ generated): 3 tableros **solubles por construcción**
  — B1 y B2 generados por movimientos inversos desde un único peg (LCG determinista),
  B3 es el inglés clásico (32 pegs, hueco central, goal center) resuelto por el solver
  DFS del generador en 4 ms. Ni una celda escrita a mano. Lint 0/0 a la primera.
- **Lógica pura en `game3d-logic.mjs`** (`pegCheck`/`pegInit`/`pegMoves`/`pegMove`,
  +21 chequeos en `npm test` y CI): los 3 tableros reales validados y sus **soluciones
  rejugadas hasta la victoria** (B3: 31 saltos con el último peg en el centro),
  conservación (pegs = iniciales − saltos en cada paso), saltos ilegales bloqueados,
  derrota por bloqueo y derrota específica de `goal: center`.
- **Runtime `peg-solitaire` en game3d** (8º perfil jugable): tablero DOM 7×7 sobre
  fondo 3D, flechas + Enter/Espacio (elegir peg y saltar) + Escape, overlays de
  victoria/derrota. **Verificado jugando en navegador.**

### Added — perfil `sudoku` (puro-datos) + Sudoku
- Nacido de una interpretación errónea de «senku» (es el solitario de clavijas, no el
  sudoku); el trabajo quedó completo y verificado, así que se conserva como perfil
  propio con el juego renombrado a `examples/sudoku.GAME.md`.
- **`profiles/sudoku.json`** (13º perfil, tercer puro-datos): puzzles como strings de
  81 caracteres (`grid` con `.` + `solution`), `difficulty` por enum, `player.start`
  por broken-ref y `balance` (lives/hints). Límite documentado: longitud/patrón de los
  strings y la consistencia grid↔solution **no caben en las familias declarativas** —
  las valida `sudokuCheck` en la simulación de referencia y en `npm test` (segundo caso
  concreto para SPEC §11: validadores de patrón/longitud de string).
- **`examples/sudoku.GAME.md`** (+ generated): 3 puzzles **generados por script con
  verificación de unicidad** (backtracking + conteo de soluciones; easy 40 / normal 32
  / hard 27 pistas) — ni un dígito escrito a mano. Lint 0/0 a la primera.
- **Lógica pura en `game3d-logic.mjs`** (`sudokuCheck`/`sudokuInit`/`sudokuSet`/
  `sudokuHint`, +14 chequeos en `npm test` y CI): los 3 puzzles reales validados
  (consistencia + validez por filas/columnas/cajas), victoria rellenando la solución,
  derrota al agotar vidas, pistas dadas inmutables, hint con descuento.
- **Runtime `sudoku` en game3d** (7º perfil jugable): tablero DOM 9×9 sobre fondo 3D,
  flechas + dígitos + H para pista, overlays de victoria/derrota. **Verificado jugando
  en navegador**: pista inmutable, fallo que descuenta vida, hint, y tablero resuelto
  hasta el overlay de victoria.
- README: 128 → **133 reglas** (reconteo por script tras ambos perfiles).

## [2.9.0] — 2026-07-08

Release **aditivo** sobre `2.8.1` (bump minor, [SPEC §7.0](./SPEC.md)): un género nuevo
de punta a punta sin tocar el core — perfil puro-datos `shooter`, el juego Neon Swarm,
su simulación pura **ganada y perdida en Node dentro de `npm test`**, y su runtime en
game3d. La versión del protocolo sigue en `0.1`.

### Added — perfil `shooter` (puro-datos) + Neon Swarm
- **`profiles/shooter.json`** (12º perfil, segundo puro-datos): arena shmup vertical —
  `ships` (speed/hp/weapon), `weapons` (damage/rate/bulletSpeed), `enemies` con
  `behavior` (enum: chaser/drifter), `waves` con spawns, `powerups` (enum:
  heal/rapid/shield), `arena` continua y `balance` (powerupChance/lives). 4 refs (con
  mensajes por defecto), 14 bounds, 2 enums — cero funciones, `dataOnly: true`.
  Límite documentado: `bounds` no alcanza campos dentro de arrays
  (`waves.*.spawns[].count/gap` sin validar — material para SPEC §11, agregados).
- **`examples/neon-swarm.GAME.md`** (+ generated): 2 naves, 2 armas, 4 enemigos,
  5 oleadas, 3 powerups. Lint 0/0 a la primera.
- **Simulación pura en `game3d-logic.mjs`** (`shooterInit`/`shooterTick` + `lcg`):
  determinista, un tick = un frame; **el juego entero se gana y se pierde en Node**
  (`test/game3d-logic.js`, +9 chequeos): victoria con IA simple sobre las 5 oleadas,
  derrota sin input, conservación kills+leaked+lost == spawns (invariante que cazó un
  hueco de contabilidad al escribirlo), rapid a mitad de cooldown, shield y heal con
  tope.
- **Runtime `shooter` en game3d** (7º... 6º runtime): render Three.js de la simulación
  (nave cono, enemigos por color de nombre, balas, powerups), input mantenido
  (keydown/keyup), HUD y overlays de victoria/derrota. En el selector del player.
- Docs con el principio anti-drift aplicado: el footer de `index.html` y la nota de
  SPEC §6 dejan de enumerar perfiles (manifest.json = lista canónica); `llms.txt` añade
  `shooter` y remite al manifest. README: 116 → **128 reglas** (reconteo con los dos
  perfiles JSON).
- Verificación en navegador: victoria también sobre el **estado vivo** del runtime
  (misma simulación importada en la página; 920 pts, conservación 46+5+4=55 exacta).
  Nota operativa: el bucle RAF del runtime pausa en pestañas ocultas (comportamiento
  estándar de juegos); los harnesses deben pilotar los ticks directamente.

## [2.8.1] — 2026-07-08

Release **patch** sobre `2.8.0` ([SPEC §7.0](./SPEC.md)): solo docs — fix **duradero**
de la clase de drift más reincidente de la historia reciente del repo.

### Fixed
- `CONTRIBUTING.md`: la lista de suites junto a `npm test` (desfasada por tercera vez —
  faltaba `game3d-logic`) deja de enumerarse; apunta al script `test` de `package.json`
  como fuente canónica.
- `index.html`: la card de game3d (le faltaba el runtime quiz) deja de listar perfiles
  y de contarlos — "un juego por cada perfil con runtime".
- Principio aplicado: **en docs no se enumera ni se cuenta lo que crece; se enlaza a la
  fuente canónica** (mismo tratamiento que los conteos de conformance en `2.2.1`).

## [2.8.0] — 2026-07-07

Release **aditivo** sobre `2.7.1` (bump minor, [SPEC §7.0](./SPEC.md)): tres mejoras
del runtime `game3d` — quinto perfil jugable (quiz, el puro-datos), lógica pura
verificada en `npm test`/CI, y tween de movimiento. La versión del protocolo sigue
en `0.1`.

### Added — mejoras del runtime game3d
- **Runtime `quiz`**: el perfil puro-datos gana su primera demo jugable — rondas,
  timer por pregunta (`seconds`), puntuación (`points` + `reward` por ronda), teclas
  1-N para responder, overlay final con aciertos. Fondo 3D de cubos por categoría.
  Verificado con partida perfecta scriptada: 5/5 aciertos y **450 pts exactos** (la
  suma derivada de los datos). En el selector del player.
- **Lógica pura extraída y testeada** (`examples/game3d-logic.mjs` +
  `test/game3d-logic.js`, 25 chequeos en `npm test` y CI): fórmulas de combate
  deterministas (daño con eficacia/varianza/nivel/slow, con `rnd` inyectado), captura
  (la fórmula de `BALANCE`), XP/niveles/evoluciones, colisión de grid y visión de
  entrenadores — el motor entra a la disciplina de verificación del repo. `game3d.js`
  consume el módulo (sin THREE/DOM en la lógica). Cambio menor asumido: el daño del
  rival ahora aplica el mismo factor de nivel simétrico que el del jugador.
- **Tween de movimiento + orientación del sprite** en los runtimes tile y monster-rpg:
  el estado sigue siendo instantáneo (lógica y tests intactos) y el sprite interpola
  la posición; `face` voltea el billboard según la dirección horizontal.

## [2.7.1] — 2026-07-07

Release **patch** sobre `2.7.0` ([SPEC §7.0](./SPEC.md)): refactor sin cambio de
contrato — una sola implementación del motor monster-rpg 3D.

### Changed
- **Runtime monster-rpg unificado**: `examples/kaiju-island-3d.html` ya no lleva su
  copia inline del motor — redirige al player multi-perfil
  (`game3d.html?game=kaiju-island.generated.js`), cuyo runtime monster-rpg es la
  versión generalizada del mismo motor. Una sola implementación.
- Retirado `examples/kaiju-island-3d-standalone.html`: contenía la copia duplicada, y
  `build-standalone` no puede inlinar módulos ES (el motor unificado se importa como
  módulo), así que no podía reconstruirse. El juego sigue disponible standalone-menos
  vía `game3d.html` servido junto a `game3d.js`.
- Diferencias menores asumidas al generalizar (documentadas): el terreno de respaldo
  para áreas sin mapa es genérico (no la playa fija de shore) y no hay bonus específico
  de STORM_BALL (el runtime no hardcodea nombres de items).

## [2.7.0] — 2026-07-07

Release **aditivo** sobre `2.6.0` (bump minor, [SPEC §7.0](./SPEC.md)): el runtime
multi-perfil `game3d` — la respuesta práctica a "¿motor universal?": no existe por
diseño (el protocolo declara datos; la semántica de cada género es del motor, SPEC §8),
pero un player único con un módulo de runtime por perfil sí. La versión del protocolo
sigue en `0.1`.

### Added
- **`examples/game3d.html` + `game3d.js` — runtime multi-perfil Three.js**: un solo
  player (`?game=<archivo>.generated.js`, con selector integrado) que despacha por la
  meta `profile` del artefacto a un módulo de runtime por género. Runtimes iniciales:
  **adventure**, **dungeon** (mecánica completa del motor 2D en 3D: warps con llave,
  enemigos, pickups, goal, hp), **monster-rpg** (el motor de Kaiju Island generalizado a
  cualquier GAME.md del perfil, con terreno procedural de respaldo para juegos sin mapas
  — `game-data.generated.js` corre sin tocarlo) y **voxel** (el adaptador oficial como
  runtime). Un perfil sin runtime degrada con mensaje explicativo: *no existe el motor
  universal por diseño* — el protocolo declara datos, la semántica de cada género es del
  motor (SPEC §8); perfil nuevo ⇒ módulo de runtime nuevo.
- **Meta `profile` en el artefacto compilado** (core, aditivo): `buildGame` incluye
  `profile` en la meta universal — un consumidor multi-perfil despacha sin heurísticas
  de claves (hueco descubierto al construir game3d). SPEC §9.3 actualizado; los 16
  artefactos regenerados (los motores con fallback no se ven afectados).
- **Verificado jugando los 4 perfiles por el mismo player**: adventure ganado de punta a
  punta (diálogo → llave → goal bloqueado → victoria), dungeon (puerta con llave + warps
  ida/vuelta con `at` exactos), monster-rpg (encuentro y victoria en Kaiju Island **y**
  en el demo sin mapa field sobre terreno procedural), voxel (hut, 12 voxels), y el
  mensaje de perfil-sin-runtime con `quiz`.

## [2.6.0] — 2026-07-07

Release **aditivo** sobre `2.5.0` (bump minor, [SPEC §7.0](./SPEC.md)): segundo backend
para el perfil monster-rpg — **el mismo `GAME.md` alimenta motores distintos sin tocar
una línea de datos**. La versión del protocolo sigue en `0.1`.

### Added
- `examples/kaiju-island-3d.html` (+ `-standalone.html`): **motor Three.js completo para
  el perfil monster-rpg**, alimentado por `kaiju-island.generated.js` — mundo de tiles
  3D con texturas generadas desde `TILE_ART`/`PALETTES` (CanvasTexture, muros/agua/rocas
  con altura), billboards desde `SPRITES`/`SPRITE_PALETTES`, colisión por `SOLID_TILES`,
  NPCs y entrenadores sólidos, interiores con `entry`/`exit`/`return`, terreno
  procedural para áreas sin mapa (shore — la frontera dato/código del README), cámara de
  seguimiento, sfx WebAudio desde `SFX`, y **combate por turnos completo**: `TYPE_CHART`
  con eficacias, efectos de moves (burn/leech/paralyze/slow/flinch), captura con la
  fórmula `catchBase + catchScale·(1−hp/maxhp)` de `BALANCE`, huida por `runChance`,
  XP/niveles con `xpCurveMul`, evoluciones vía `EVOLUTIONS`, duelos de entrenador con
  línea de visión, equipos expandidos, premio y campeón. Mismo patrón CDN que
  `voxel-three.html` (three@0.160.0, importmap).
- **Verificado jugando en navegador** (playthrough scriptado con BFS sobre los datos):
  diálogo de NPC, NPC bloquea el paso, casa con return exacto, captura de VOLTMOUSE (2
  NET_BALLs), victoria salvaje con XP, derrota interceptado por la línea de visión de
  RANGER LILA (blackout correcto) y luego duelo ganado (+300₲, marcada derrotada), y
  shore procedural. Estado expuesto en `window.KAIJU` para harnesses.

## [2.5.0] — 2026-07-07

Release **aditivo** sobre `2.4.2` (bump minor, [SPEC §7.0](./SPEC.md)): un juego
completo y jugable como demostración de la tesis del protocolo — el motor se escribe
una vez por perfil; un juego nuevo es 100% datos. La versión del protocolo sigue en `0.1`.

### Added
- `examples/el-faro-hundido.GAME.md` (+ `.generated.js`, `.html`, `-standalone.html`):
  **juego completo y jugable** sobre el motor dungeon de referencia — 7 salas con
  minimapa coherente, progresión por 2 llaves encadenadas (bodega → torreón → linterna),
  5 enemigos patrullando (h/v, hasta 2 HP), 3 NPCs con pistas, agua animada y meta
  final. 100% datos: el HTML es el mismo motor del perfil con el `generated`
  intercambiado. **Jugabilidad verificada end-to-end** en navegador (playthrough
  scriptado: puerta bloqueada sin llave → llave oxidada → torreón → llave dorada →
  linterna → victoria). Lint 0/0 a la primera; cubierto por all-examples (15 archivos).

## [2.4.2] — 2026-07-07

Release **patch** sobre `2.4.1` ([SPEC §7.0](./SPEC.md)): una palabra de docs.

### Fixed
- README (checklist histórico "Fase MEDIANO completada"): última mención de
  `tools/shared-helpers.js` — el archivo que nunca existió — corregida a
  `tools/profile-helpers.js`. La corrección original de esta errata (documentada en
  `[1.1.0]`/`[1.0.0]`) arregló la lista de features y el CHANGELOG pero se le escapó
  esta segunda aparición, tres líneas más abajo en el mismo README.

## [2.4.1] — 2026-07-07

Release **patch** sobre `2.4.0` ([SPEC §7.0](./SPEC.md)): solo docs.

### Fixed
- `llms.txt` ("Crear un género nuevo"): describía solo la vía `.js` con el juego de
  campos previo a `2.3.0`. Ahora enseña el contrato completo de SPEC §6.1
  (`bounds`/`dims`/`enums` incluidos) y las dos vías — **puro-datos `.json`** como la
  preferida para agentes (JSON.parse, nunca se ejecuta código; referencia
  `profiles/quiz.json`) y `.js` con código (revisar como dependencia). La superficie
  para agentes no reflejaba la feature más relevante para agentes de `2.4.0`.
- `tools/game-manifest.js`: comentario de cabecera actualizado a `profiles/*.js` y
  `*.json`.

## [2.4.0] — 2026-07-07

Release **aditivo** sobre `2.3.1` (bump minor, [SPEC §7.0](./SPEC.md)): primera etapa de
las **reglas puras-de-datos** de SPEC §11 — un perfil puede ser 100% datos y cargarse
sin ejecutar código. Sin breaking: los `GAME.md` y perfiles `.js` existentes siguen
intactos. La versión del protocolo sigue en `0.1`.

### Added — reglas puras-de-datos (SPEC §11, primera etapa)
- **Perfiles JSON (puro-datos)**: los CLIs cargan `profiles/<id>.json` con `JSON.parse` —
  **nunca se ejecuta código** — además de los `.js` (resolución: `.js` primero). Es la
  vía soportada para perfiles de terceros (SPEC §10 actualizado: un `.json` malicioso
  como mucho emite hallazgos o claves erróneas). `manifest.json` marca estos perfiles
  con `dataOnly: true` y expone la tabla `enums`.
- **Familia `enums` declarativa** en el core: `{ rule, collection|singleton, field,
  values, required? }` — pertenencia a un conjunto cerrado, con mensaje por defecto.
- **`refs[].msg` ahora opcional**: sin ella, el core genera el mensaje por defecto
  (`<owner> referencia un valor inexistente en <coleccion>: <valor>`). Requisito para
  que `refs` sea expresable en JSON puro.
- **Perfil de referencia puro-datos `quiz`** (`profiles/quiz.json`, undécimo perfil):
  categorías/preguntas/rondas validadas íntegramente con refs (mensajes por defecto),
  bounds y enums — cero funciones. Con `examples/quiz.GAME.md` (+ generated, lint 0/0,
  cubierto por all-examples/conformance/buildGame-content), 6 reglas nuevas con hints.
- SPEC §4/§6/§6.1/§10/§11 actualizados; `validateProfile` valida `enums` y el tipo de
  `msg`; `test/profile-descriptor.js` cubre `.json` y las formas nuevas. README: el
  conteo de reglas pasa de 110 a **116** (las 6 de quiz, contadas también en perfiles
  JSON).

## [2.3.1] — 2026-07-07

Release **patch** sobre `2.3.0` ([SPEC §7.0](./SPEC.md)): solo docs.

### Fixed
- `CONTRIBUTING.md`: la lista de suites junto a `npm test` estaba desfasada — faltaban
  `mutation-manual` (desde `1.1.0`) y `profile-descriptor` (`2.3.0`). Ahora enumera las
  12 reales.

## [2.3.0] — 2026-07-07

Release **aditivo** sobre `2.2.1` (bump minor, [SPEC §7.0](./SPEC.md)): cierra los cinco
pendientes de diseño del análisis del protocolo — la SPEC gana gramática formal,
contrato del descriptor, threat model y direcciones futuras; el core gana las familias
declarativas `bounds`/`dims`. Sin breaking: los `GAME.md` y perfiles existentes siguen
intactos (110 reglas, mismos artefactos). La versión del protocolo sigue en `0.1`.

### Added — pendientes de diseño del análisis del protocolo
- **SPEC §1.2 — gramática formal (normativa)** del subconjunto YAML: EBNF + semántica +
  lista de fallos duros. La definición del lenguaje deja de ser "lo que haga el parser
  de referencia"; `test/parser.js` pasa a ser su acompañante ejecutable.
- **SPEC §6.1 — contrato del descriptor de perfil (normativo)** + validador
  `validateProfile` (isomorfo, en `profile-helpers.js`), cableado en `game-lint.js` y
  `game-export.js`: un descriptor malformado se reporta como `profile-load-error` con la
  entrada exacta (p.ej. `refs[0]`), nunca como `TypeError` en runtime. Nueva suite
  `test/profile-descriptor.js` (los 10 perfiles reales validan + 11 formas malformadas
  con mensaje accionable), añadida a `npm test` y a CI.
- **Familias `bounds`/`dims` declarativas en el core**: el descriptor puede declarar
  tablas de rangos (`gt`/`min`/`max`/`integer`/`required` sobre colecciones o
  singletons) y de formas fijas (`shape: [h, w]`) que `lintGame` ejecuta — las familias
  range/dims de SPEC §4 dejan de existir solo como funciones. **platformer migrado como
  prueba**: `ruleEnemyStats`/`rulePhysics` sustituidas por 5 entradas `bounds` (mismos
  rule ids y comportamiento). `manifest.json` expone `bounds`/`dims` por perfil.
- **SPEC §10 — Security & trust model**: dos niveles de confianza (GAME.md = input no
  confiable, con las defensas del parser; perfiles = código ejecutable, revisar como
  dependencia), más el hardening de los tools de referencia.
- **SPEC §11 — Future directions (no normativa)**: el modelo bundle multi-archivo
  (estilo OKF) como camino de evolución designado, y las reglas puras-de-datos como
  prerequisito para perfiles de terceros seguros.

## [2.2.1] — 2026-07-07

Release **patch** sobre `2.2.0` ([SPEC §7.0](./SPEC.md): correcciones sin cambio de
forma): errata de docs y limpieza de comentarios de test. Sin cambios de comportamiento.

### Fixed — errata
- El ahorro de la forma hex del arte se publicó como "~4×"; el valor medido es
  **~1,8×** en las líneas de arte (`kaiju-island`: 13.560 → 12.477 bytes). Corregido en
  la entrada `[2.2.0]`, README y el comentario de `profile-helpers.js`; notas del
  release editadas.
- `test/conformance.js`: retirados los conteos de las cabeceras de sección (estaban
  desfasados, p.ej. "monster-rpg (24)" con 41 casos); el conteo real lo imprime el
  runner por perfil.

## [2.2.0] — 2026-07-07

Release **aditivo** sobre `2.1.0` (bump minor, [SPEC §7.0](./SPEC.md)): aborda las tres
fricciones de autoría detectadas por el stress-test Kaiju Island. La versión del
protocolo sigue en `0.1`; sin breaking — los `GAME.md` existentes siguen en 0 errores y
compilan al mismo artefacto.

### Added — fricciones de autoría del stress-test (perfil monster-rpg)
- **Forma compacta hex para el arte 4bpp** (`tileArt` y `sprites`): además de la matriz
  de números, se acepta un array de strings hex — 1 carácter = 1 celda `0..15`
  (`tileArt`: 8 strings de 8; `sprites`: 16 de 16). Las líneas de arte encogen ~1,8×
  (medido en `kaiju-island`: 13.560 → 12.477 bytes). La forma compacta
  se **decodifica al compilar**: mismo `window.GAME` byte a byte que la forma matriz
  (verificado con `kaiju-island`, convertido a hex con generado idéntico). Helper
  isomorfo `decodeArtRows` en `tools/profile-helpers.js` (opt-in vía
  `ruleTileArt(..., {allowHex})`, disponible para otros perfiles).
- **Secciones canónicas ampliadas**: `Sprites`, `Moves`, `Trainers`, `Encounters` y
  `Sfx` son secciones `##` de primera clase (antes había que anidarlas como `###` o
  aceptar warnings de `section-order`). Aditivo: los docs existentes usan un
  subconjunto cuyo orden relativo se preserva.

### Fixed
- Eliminado el warn por comas en `dialogue` de NPCs (`overworld-ref`): era un **falso
  positivo** — una coma que sobrevive al parseo proviene siempre de un string entre
  comillas (uso correcto); la coma sin comillas rompe el parseo de flujo con
  `parse-error` claro antes de llegar a la regla. Guía de los ejemplos actualizada
  ("diálogos con comas entre comillas" en vez de "sin comas").

## [2.1.0] — 2026-07-07

Release **aditivo** sobre `2.0.1` (bump minor, [SPEC §7.0](./SPEC.md): reglas y ejemplo
nuevos): el stress-test **Kaiju Island** y el cierre de los 10 huecos de validación que
descubrió. La versión del protocolo sigue en `0.1`; sin breaking ni deprecations — los
`GAME.md` válidos existentes siguen en 0 errores.

### Added
- `examples/kaiju-island.GAME.md` (+ `.generated.js`, `.html`, `-standalone.html`):
  **stress-test del perfil monster-rpg** — ejercita todos los tokens a la vez (13
  especies con 3 líneas evolutivas de 3 etapas, 13 moves con efectos, chart simétrico de
  6 tipos + NORMAL, 3 entrenadores, 5 items con los 3 efectos, 3 zonas de encuentro, 3
  mapas 12×10, overworld de 2 áreas con NPCs/warps, 8 paletas, 10 tiles con tileArt, 2
  sprites 16×16, 7 sfx, 6 textos). Lint 0/0; cruce `GAME_ENGINE` verificado en ambos
  sentidos; cubierto automáticamente por `all-examples` (13 archivos).
- **Perfil monster-rpg: 10 huecos de validación cerrados** (descubiertos por el
  stress-test con sondas de datos rotos — las 10 se escapaban con 0 hallazgos):
  - 6 reglas nuevas: `move-bounds` (power > 0, chance en [0,1]), `species-bounds`
    (maxhp > 0; `evolvesInto` exige `atLevel` > 0 — antes la evolución se exportaba
    **sin `level`, pérdida silenciosa**), `encounter-zone` (warn: zona de encuentro sin
    área/mapa que la dispare), `tile-id-range` (ids del registro `tiles` en 16..63),
    `sprite-4bpp` (celdas de sprite en 0..15), `palette-size` (warn: >16 colores — el
    export **truncaba en silencio**).
  - 4 extensiones: `trainer-bounds` exige `team` no vacío; `player-ref` valida
    cantidades de inventario (entero > 0); `overworld-ref` valida `row` contra
    `platform.rows` en npcs/trainers/warps (antes solo `col`).
  - Conformance: +12 casos inválidos; mutation audit: +5 mutantes (20/20 atrapados).
    Los 4 ejemplos monster-rpg siguen en 0/0 (sin falsos positivos). README: el conteo
    de reglas pasa de 104 a **110**.

## [2.0.1] — 2026-07-07

Release **patch** sobre `2.0.0` ([SPEC §7.0](./SPEC.md): correcciones sin cambio de
forma): docs y tests alineados con el contrato; sin cambios de comportamiento en los CLI.

### Fixed
- README: el conteo de reglas pasa de 101 a **104** — el perfil `advance-wars` añadió
  3 reglas (`unit-palette-ref`, `unit-dims`, `unit-tiledata-range`) después de fijar el
  conteo anterior.
- `test/conformance.js` y `test/mutation-manual.js`: eliminado el fallback interno
  `|| 'monster-rpg'` (inerte, pero contradecía el contrato 2.0.0). Un ejemplo/fixture
  sin `profile` ahora falla el test con mensaje claro en vez de lintearse como
  monster-rpg.

## [2.0.0] — 2026-07-07

Release **breaking** (bump major, [SPEC §7](./SPEC.md)): ejecuta la remoción anunciada
en `1.3.0`, cumpliendo el ciclo completo de §7.1 — deprecar primero (`1.3.0`), periodo
de gracia, remover en la major. La versión del protocolo sigue en `0.1`.

### Removed — breaking
- **Fallback de `profile`** (deprecado en `1.3.0` como `profile-fallback`). `profile`
  es **obligatorio** en el front-matter:
  - `game-lint.js`: sin `profile` no se carga perfil y el core reporta
    `required-fields` (**error**, exit 1). El hallazgo `profile-fallback` ya no existe.
  - `game-export.js`: exit **2** con mensaje accionable; no se escribe artefacto.
  - **Acción requerida** para `GAME.md` que dependían del fallback: añadir
    `profile: <id>` — receta de un comando en [`MIGRATION.md`](./MIGRATION.md)
    (De 1.x → 2.0.0, ahora **vigente**).

### Changed
- SPEC §2: `profile` pasa a "yes (since 2.0.0)"; el fallback queda documentado como
  historia (`≤1.x`, deprecado `1.3.0`, removido `2.0.0`).
- `manifest.json` → `profileSelection` refleja la obligatoriedad.
- `test/cli-errors.js`: los chequeos del camino deprecado pasan a verificar el error
  (lint exit 1 + `required-fields`; export exit 2).

## [1.3.0] — 2026-07-07

Release **aditivo** sobre `1.2.0` (bump minor, [SPEC §7.0](./SPEC.md)) cuyo contenido
es una **deprecation** (§7.1): el fallback de `profile` entra en su periodo de gracia.
Nada rompe hoy — el gate sigue en 0 errores para archivos sin `profile` — pero en
`2.0.0` el token será obligatorio. La versión del protocolo sigue en `0.1`.

### Deprecated
- **Fallback de `profile`** — regla `profile-fallback`, `since: 1.3.0`,
  `removedIn: 2.0.0`. Un `GAME.md` sin `profile` sigue resolviéndose como
  `monster-rpg`, pero `game-lint.js` emite un hallazgo nivel `deprecated` (no rompe el
  gate) y `game-export.js` avisa por stderr. **En `2.0.0` el fallback se elimina y
  `profile` será obligatorio (error).** Reemplazo: declarar `profile: <id>` explícito.
  Receta en `MIGRATION.md` (De 1.x → 2.0.0); SPEC §2 actualizado;
  `manifest.json` → `profileSelection` expone el ciclo de vida.

### Changed
- `examples/GAME.md` y `examples/monster-rpg.GAME.md` declaran `profile: monster-rpg`
  explícito (eran los únicos ejemplos que dependían del fallback). Los artefactos
  generados no cambian (`profile` no se copia a la salida).
- `test/cli-errors.js`: cubre el hallazgo `profile-fallback` (lint exit 0 + finding
  `deprecated`; export exit 0 + aviso stderr).

## [1.2.0] — 2026-07-07

Release **aditivo** sobre `1.1.0` (bump minor, [SPEC §7.0](./SPEC.md)): solo spec
normativo, cero cambios de código — el comportamiento documentado es el actual de
`tools/`. La versión del protocolo sigue en `0.1`; sin breaking ni deprecations.

### Added
- SPEC **§9 Conformance**: condiciones normativas (MUST/SHOULD/MAY) para implementaciones
  alternativas — parser (subset §1.1 + casos de fallo duro), linter (reglas core +
  perfil, `errors=0` como gate), compilador (byte-identidad: meta universal + orden de
  `derive`, JSON 2 espacios, LF), exit codes §3.1, tolerancia (qué NO puede rechazar un
  consumidor) y round-trip (las herramientas que reescriben un `GAME.md` preservan
  tokens desconocidos). Las suites `test/parser.js`, `test/conformance.js` y
  `test/cli-errors.js` quedan como referencia ejecutable.
- SPEC §7: semántica explícita de los campos `x-` — ignorados por validación, **no**
  pasan al artefacto compilado (salvo que un perfil los derive explícitamente), y deben
  preservarse en round-trip. Antes el spec no decía qué pasaba con ellos al compilar.
- Modelo de la mitad permisiva (tolerancia/round-trip) inspirado en el Open Knowledge
  Format (OKF) de GoogleCloudPlatform/knowledge-catalog; la mitad estricta (gate
  determinista) sigue siendo la propuesta de valor propia del protocolo.

## [1.1.0] — 2026-07-07

Release **aditivo** sobre `1.0.0` (bump minor según [SPEC §7.0](./SPEC.md)): décimo
perfil `advance-wars` completo, pipeline de extracción de sprites GBA, ejemplo
`monster-rpg`, mutation audit del linter y correcciones menores. La *versión del
protocolo* (`SPEC.md` header, `version` de los `GAME.md`) sigue en `0.1`
(`manifest.json` → `migrations.supported: ["0.1"]`); no hay cambios breaking ni
deprecations.

### Added — ejemplo monster-rpg + mutation audit (`cd645d5`)
- `examples/monster-rpg.GAME.md` + `monster-rpg.generated.js` + `monster-rpg.html`:
  ejemplo mínimo del perfil raíz con demo HTML.
- `test/mutation-manual.js`: mutation audit manual del oráculo del linter — 15 mutantes
  quirúrgicos sobre `examples/monster-rpg.GAME.md`, 15/15 atrapados. Añadido a `npm test`
  (no corre en CI).

### Added — extracción de sprites GBA (`5deb6e2`, `309b594`)
- `tools/sprite-generator.py`: sprites procedurales → `GAME.md` válido (perfil monster-rpg).
- `tools/advance-wars-extractor.py`: extractor heurístico específico de Advance Wars
  (paleta BGR555 + tiles 8×8 4bpp) → `examples/advance-wars-extracted.GAME.md`.
- `tools/ghidra_extract_sprite_offsets.py` + `tools/gba-sprite-extractor-universal.py`:
  pipeline universal (Ghidra headless o fallback heurístico puro) → JSON de offsets →
  `examples/extracted.GAME.md` (monster-rpg, sprites 16×16). Documentado en
  `tools/SPRITE_EXTRACTION.md` (alcance honesto: candidatos heurísticos, no verificados
  contra el juego real).
- `profiles/advance-wars.js`: perfil añadido inicialmente como **stub** (solo
  `id`/`sections`/`required`, sin validación de dominio ni derivaciones). Completado
  después — ver "perfil advance-wars completo" más abajo.

### Fixed — drift de artefactos (`228212f`)
- Regenerado lo que los commits anteriores no regeneraron:
  `examples/advance-wars-extracted.generated.js`, `examples/extracted.generated.js`,
  `manifest.json` (10 perfiles) y `schemas/advance-wars.schema.json`.
  `npm test` y los gates sin-drift de CI vuelven a verde.

### Added — perfil advance-wars completo
- `profiles/advance-wars.js` deja de ser stub: `rules` (`palette-color-range` vía
  `profile-helpers`, `unit-palette-ref`, `unit-dims`, `unit-tiledata-range`) y `derive`
  (`PALETTES` con relleno a 16 colores, `UNITS`). `refs` queda vacío con nota: la única
  referencia (`units.*.palette` → claves numéricas de `palettes`) se valida en `rules`,
  igual que `armors` en tower-defense.
- Conformance: 4 casos inválidos (≥1 por regla) + el ejemplo en la lista de válidos;
  `test/buildGame-content.js` extendido a 10 perfiles; hints en `tools/rule-hints.js`.
- **Fixed (dato corrupto detectado por las reglas nuevas):**
  `examples/advance-wars-extracted.GAME.md` tenía comentarios inline tras arrays de
  flujo (`# BGR555 @...`, `# @0x...`), que `yaml-min` no limpia (limitación documentada
  en `tools/SPRITE_EXTRACTION.md`): el último color de la paleta y el último nibble de
  cada unidad absorbían el texto del comentario como string. Con el perfil stub esto
  pasaba el lint en silencio y llegó al `.generated.js`. Comentarios eliminados
  (los offsets ya viven en las tablas del cuerpo) y artefacto regenerado limpio.
- Regenerados `manifest.json` y `schemas/advance-wars.schema.json` (el perfil ahora
  expone reglas y claves de salida).

### Fixed — menores
- `tools/render-png.js`: eliminado un `return null` inalcanzable en `entityAt` (código
  muerto, sin cambio de comportamiento).
- `examples/dungeon.GAME.md`: el Overview decía "3 salas"; son 5 (sala, sótano, tesoro,
  galería y cripta).
- SPEC §2/§4: documentado el contrato **real** de `profile` — recomendado, con fallback
  `monster-rpg` en el CLI de referencia; `required-fields` lo exige solo cuando no se
  resuelve un descriptor de perfil (el perfil cargado aporta su propia lista `required`).
  La tabla §2 lo marcaba "required: yes", que no era lo que el código hacía. Hacerlo
  obligatorio de verdad sería breaking (bump major según §7): queda como decisión futura.

### Docs — sincronización con lo anterior
- README: el conteo "94 reglas" pasa al verificable **101** (reglas distintas emitibles por
  core + wrapper CLI + perfiles; hints en `tools/rule-hints.js`); `tools/shared-helpers.js`
  corregido a `tools/profile-helpers.js` (nombre real del archivo); sección de estado
  post-`1.0.0`.
- SPEC §6, `index.html`, `llms.txt`: reflejan 10 perfiles cargables (9 de referencia +
  `advance-wars` experimental). `llms.txt` añade `tower-defense`, que faltaba desde `1.0.0`.
- Errata en la entrada `1.0.0` de este changelog: el helper compartido se llama
  `tools/profile-helpers.js` (no `shared-helpers.js`) y `ci.yml` corre `lifecycle` pero
  no `perf-smoke` (que sí corre en `npm test`).

## [1.0.0] — 2026-06-22 — cierre fase MEDIANO

Release estable: completa la fase MEDIANO del roadmap sobre la base CORTO. A partir de
`1.0.0` los cambios breaking al core y a los perfiles son bump **major** y exigen una
deprecation previa (ver [SPEC §7.1](./SPEC.md)). La *versión del protocolo* (`SPEC.md`
header, `version` en los `GAME.md`) sigue en `0.1`; el *release del paquete* es
independiente y reacha `1.0.0`.

### Added — S1 tower-defense (`H-1.1`)
- `profiles/tower-defense.js`: perfil de género con tokens (torres, tipos de daño,
  enemigos, armaduras, oleadas, mapas, economía, balance) + `derive` con 13 claves
  (`TOWERS`/`DMG_CHART`/`ENEMIES`/`ARMORS`/`WAVES`/`MAPS`/`ECONOMY`/`BALANCE` + arte).
- `schemas/tower-defense.schema.json` (regenerado por `game-schema.js`).
- `examples/tower-defense.GAME.md` + `examples/tower-defense.generated.js` (sin-drift).
- Conformance: ≥1 inválido por regla del perfil.

### Added — S2 deprecation policy + versionado (`H-2.4`, `H-3.5`, `API1`, `D2`, `H-3.3`)
- Nivel `deprecated` en el linter (`game-lint-core.js`): una regla marcada
  `rule.deprecated = {since, removedIn}` emite un hallazgo `level: "deprecated"` con
  `since`/`removedIn` y msg accionable. **No es error** (no rompe el gate); la regla sigue
  aplicando hasta `removedIn`.
- Regla `version-migration` (reemplaza a `version-compatible`): `data.version` vs
  `profile.specVersion` → **warn** si el GAME.md es anterior (consulta `MIGRATION.md`),
  **error** si es posterior al tooling. El linter migra, no rechaza.
- `MIGRATION.md`: guía de migración entre versiones (modelo semver, entradas por versión,
  receta de renombrado `MOVES` → `ACTIONS` con script `sed`/`jq`, checklist).
- `test/lifecycle.js`: verifica ciclo de vida (MIGRATION.md receta, CONTRIBUTING breaking,
  SPEC §7.1, manifest `migrations`/`deprecatedRules`). 13 chequeos.
- `manifest.json`: campo `migrations: {supported, doc}` (versiones soportadas + path a
  `MIGRATION.md`) y `deprecatedRules` por perfil (ciclo de vida expuesto a agentes).

### Added — S3 performance + helpers compartidos + parser edge cases (`Q1`, `Q2`, `M4`, `T1`, `STRESS1`)
- `tools/profile-helpers.js`: helpers isomorfos compartidos (`describeSrc`,
  `rulePalettes`, `ruleTileArt`) extraídos de `game-manifest.js`/`game-schema.js` y los
  perfiles — una sola definición. (Errata: esta entrada decía `shared-helpers.js`,
  nombre que nunca existió en el árbol.)
- P1/P2/P3: `lintGame` sobre 10K datos < 50ms (mediana ~3ms); pre-tokenización y caché
  de `Set`s en los recorridos.
- `test/parser.js` ampliado: clave duplicada, string sin cerrar, indentación con TAB,
  sobre-indentación, comillas escapadas, guard de profundidad en `parseBlock`
  (límite de anidamiento para no stack-overflow).
- `test/perf-smoke.js` + `test/perf-bench.js`: gate de performance.

### Added — S4 governance + cierre (`H-2.1`, `H-2.2`, `Q4`, `T4`)
- `CODE_OF_CONDUCT.md`: código de conducta (inclusión, respetuoso, proceso de reportes).
- `CODEOWNERS`: owners automáticos por ruta (top-level, `/tools/*`, `/profiles/*` →
  mauricio.perera@gmail.com).
- `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/feature.md`: plantillas de
  bug report (reproducción, esperado vs actual) y feature request (caso de uso, solución).
- `.github/PULL_REQUEST_TEMPLATE.md`: plantilla de PR (changelog, testing, breaking changes).
- `test/buildGame-content.js` ampliado a **9/9 perfiles** (tower-defense + 8) con
  aserciones de forma por clave derivada (44 chequeos).

### Changed
- `SPEC.md` §7: semver `0.x` (breaking = minor, patch = correcciones; `1.0` congela tokens
  core); nueva §7.1 Deprecation policy; nueva §7.0 Semver by example. §4: fila
  `version-migration` (+ nivel `deprecated`). §6: `tower-defense` listado como perfil
  cargable (retirada la marca "planned").
- `CONTRIBUTING.md`: sección "Cambios breaking y política de versionado" — regla de PR
  (CHANGELOG `[Unreleased]` `### Deprecated`/`### Removed` + bump minor en `0.x` / major en
  `1.0`) + cita `MIGRATION.md` + sección "Deprecación (resumen)" + cita Código de Conducta.
- `README.md`: header a `v1.0.0`; checklist "Fase MEDIANO completada"; nota breaking
  changes `0.1 → 1.0.0`; tabla de estructura con archivos de governance.
- `game-lint.js`: `summary` añade `deprecated` (count); `--agent` da hint dedicado para
  hallazgos `deprecated`.
- `tools/rule-hints.js`: hint para `version-migration`.
- `package.json` `test`: añade `test/lifecycle.js` y `test/perf-smoke.js`; CI `ci.yml`
  añade `test/lifecycle.js` (perf-smoke corre solo en `npm test`, no en CI).

### Breaking changes
- **Política de versionado (no remoción de tokens).** Desde `1.0.0` los cambios breaking al core
  y a los perfiles son bump **major** y **exigen** una deprecation previa (marcar
  `deprecated: {since, removedIn}` + entrada `### Deprecated` en `CHANGELOG.md`). En `0.x` los
  breaking eran bump **minor** (`0.1` → `0.2`). Esto cambia el contrato para *futuros* cambios;
  no remueve ni renombra ningún token en este release. Ver [SPEC §7](./SPEC.md) y [§7.1](./SPEC.md).
- **Regla `version-migration`** (reemplaza a `version-compatible`): un `GAME.md` con `version`
  **mayor** que la soportada por el tooling ahora es **error** (antes era warn/ignorado). Los
  `GAME.md` existentes en `0.1` siguen en 0 errores (warn → `MIGRATION.md`). Acción requerida
  solo si declarabas una versión futura.

### Caveats
- **`version` del protocolo vs. release del paquete.** La *versión del protocolo* (`SPEC.md`
  header y el campo `version` que declaran los `GAME.md`) sigue siendo `0.1`; el *release del
  paquete* (`package.json`) reacha `1.0.0`. Son independientes: una futura edición del spec
  moverá la versión del protocolo; hasta entonces, `0.1` sigue siendo la versión soportada
  (`manifest.json` → `migrations.supported: ["0.1"]`).
- **`render-png.js`** solo soporta el perfil `adventure` (lee `G.SCENE.tilemap`/`attrs`). Un
  generado de otro perfil sale con exit `2` y mensaje accionable, no con un `TypeError` crudo.
- **Sin dependencias.** Las herramientas son Node puro (>=18); no hay `npm install`. En Windows,
  `.gitattributes` (`* text=auto eol=lf`) mitiga el drift CRLF del generado.

### Seguridad (heredada de la fase INMEDIATO, documentada en `0.1.0`)
- S1: prototype pollution en el parser YAML (`__proto__`, `constructor`).
- S2: path traversal + RCE vía perfil inválido (validación `/^[a-z0-9-]+$/`).
- S3: `new Function()` en `render-png.js` → `require()` con path-check.
- Estas correcciones se publicaron en `0.1.0` y se mantienen en `1.0.0`.

## [0.1.0] — 2026-06-22 — fase CORTO

### Added
- Core genérico sin dependencias: parser YAML, linter, compilador.
- 8 perfiles cargables (monster-rpg, platformer, adventure, crafting, dungeon, papers-please, roguelike, voxel).
- CI con gate sin-drift: manifest, schemas, ejemplos.
- Demos jugables: roguelike, dungeon, adventure (+ voxel 3D viewer).
- Bucle agente LLM: `--agent` mode con hints accionables.
- `test/cli-errors.js`, `test/buildGame-content.js`, `test/build-standalone.js`.
- `.gitattributes` (`* text=auto eol=lf`): mitiga drift CRLF en Windows.
- `PLAN-MEDIANO.md`: roadmap post-CORTO.

### Fixed
- `game-export.js` / `build-standalone.js`: archivo inexistente ahora exit 2 con mensaje claro.
- S1: Prototype pollution en parser YAML (`__proto__`, `constructor`).
- S2: Path traversal + RCE vía profile inválido (validar `/^[a-z0-9-]+$/`).
- S3: `new Function()` en `render-png.js` → `require()` con path-check.
- M1: README referencia `game-build.js` inexistente (→ `game-build-core.js`).

### Known Issues (resueltos en `1.0.0`)
- Sin política de deprecation → resuelto en S2.
- `tower-defense` listado como planned en SPEC §9 → implementado en S1.

[2.10.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.10.0
[2.9.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.9.0
[2.8.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.8.1
[2.8.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.8.0
[2.7.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.7.1
[2.7.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.7.0
[2.6.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.6.0
[2.5.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.5.0
[2.4.2]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.4.2
[2.4.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.4.1
[2.4.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.4.0
[2.3.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.3.1
[2.3.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.3.0
[2.2.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.2.1
[2.2.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.2.0
[2.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.1.0
[2.0.1]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.0.1
[2.0.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v2.0.0
[1.3.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.3.0
[1.2.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.2.0
[1.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.1.0
[1.0.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.0.0
[0.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v0.1.0