# GAME Protocol — *Gameplay as Data*

> **Especificación `v2.9.0`** para describir el **contenido y el balance** de un juego 2D
> por tiles como **datos declarativos** —no como código incrustado en el motor— usando un único archivo
> `GAME.md` (**YAML + Markdown**), validado e integrado por CLI.
>
> Inspirado en el patrón [`design.md`](https://github.com/google-labs-code/design.md) de Google.
> Nace de una implementación real: el motor mini-Pokémon GBA de
> **[GB-AI Studio](https://github.com/MauricioPerera/gb-ai-studio)** ([demo en vivo](https://mauricioperera.github.io/gb-ai-studio/)),
> donde el contenido del juego se edita por datos y se valida/exporta con esta misma cadena de herramientas.

📄 **La especificación completa está en [`SPEC.md`](./SPEC.md).**

---

## El problema

En la mayoría de motores, los datos de juego —stats de criaturas, tablas de tipos, precios, mapas,
diálogos, arte de tiles— viven **mezclados con la lógica** en el código. Cambiar el starter, añadir un
objeto o reequilibrar un combate exige tocar `.js`, recompilar mentalmente y arriesgar regresiones. Y no
hay forma automática de saber si un dato declarado **se usa de verdad** o quedó muerto.

## La propuesta

Separar **datos** de **lógica** con un contrato explícito:

```
GAME.md            →   game-export.js   →   game-data.generated.js   →   motor
(tokens + doc)         (compila)            (window.GAME)                (consume con fallback)
   ↑
game-lint.js (valida 131 reglas + cruces opcionales con el motor)
```

- **`GAME.md`** es la *fuente única de verdad*: front-matter YAML (tokens) + cuerpo Markdown (doc).
- **`game-lint.js`** valida refs, rangos, dimensiones y simetrías; y puede **cruzar** los tokens con el
  código del motor (p. ej. tiles sólidos ↔ el `Set` de colisión, o "knobs" de balance declarados pero
  no referenciados).
- **`game-export.js`** compila los tokens a `window.GAME` (con derivaciones: `WILD_LIST`, `EVOLUTIONS`,
  precios, mapas expandidos…).
- El **motor consume con fallback embebido**: si el generado falta, el juego degrada con gracia.

### Qué se vuelve dato

Criaturas, ataques (con efectos), tipos, evolución, ítems, encuentros por zona, economía, balance,
**arte** (paletas, siluetas, tiles), **sonido** (sfx de eventos), **interiores** (DSL ASCII + navegación),
**entidades** del mundo (NPCs, entrenadores, warps), estado inicial del jugador y **textos** de sistema.

### Qué sigue en código (por diseño)

El **layout/colocación** del terreno y la **lógica/render** (fórmulas, máquinas de estado, cámara, UI).
El protocolo tokeniza *datos*, no *lógica*. Ver [§7 de la spec](./SPEC.md).

---

## Inicio rápido

Requisitos: **Node.js** (sin dependencias, sin `npm install`).

```bash
# Validar el documento de ejemplo (0 errores / 0 warnings)
node tools/game-lint.js examples/GAME.md

# Compilarlo al artefacto consumible por un motor
node tools/game-export.js examples/GAME.md examples/game-data.generated.js

# (opcional) Activar los cruces con un motor concreto
GAME_ENGINE=../mi-motor/engine.js node tools/game-lint.js examples/GAME.md
```

El ejemplo [`examples/GAME.md`](./examples/GAME.md) es un juego demo completo de 10×8 tiles: campo con
encuentros, una casa con interior, un entrenador, un NPC, ítems y un starter — todo en ~60 líneas.

---

## Estructura del repo

| Ruta | Rol |
|---|---|
| [`SPEC.md`](./SPEC.md) | **La especificación del protocolo** (formato, tokens, artefacto, 131 reglas — core §4 + perfiles §6; hints de arreglo en [`tools/rule-hints.js`](./tools/rule-hints.js) —, frontera datos/código). |
| [`tools/yaml-min.js`](./tools/yaml-min.js) | Parser del subconjunto YAML (isomorfo Node/navegador). |
| [`tools/game-lint-core.js`](./tools/game-lint-core.js) | Reglas de validación puras (`lintGame`), isomorfas. |
| [`tools/game-lint.js`](./tools/game-lint.js) | CLI del validador (cruces con el motor opcionales vía `GAME_ENGINE`). |
| [`tools/game-build-core.js`](./tools/game-build-core.js) | Compilación genérica dirigida por `profile.derive`; isomorfa. |
| [`tools/game-export.js`](./tools/game-export.js) | CLI del compilador → `game-data.generated.js`. |
| [`examples/GAME.md`](./examples/GAME.md) | Documento de ejemplo mínimo y autocontenido. |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | CI: lint + sin-drift del generado. |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Cómo proponer cambios + política breaking/versionado. |
| [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) | Código de conducta del proyecto. |
| [`CODEOWNERS`](./CODEOWNERS) | Owners automáticos por ruta (`/tools/*`, `/profiles/*`). |
| [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE) | Plantillas de bug report y feature request. |
| [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) | Plantilla de PR (changelog, testing, breaking). |

---

## Estado

**Release `v2.9.0`** — aditivo: un **shooter** de punta a punta sin tocar el core —
perfil puro-datos [`profiles/shooter.json`](./profiles/shooter.json) (naves, armas,
enemigos con enum de comportamiento, oleadas, powerups, arena), el juego **Neon Swarm**
([`examples/neon-swarm.GAME.md`](./examples/neon-swarm.GAME.md), lint 0/0 a la primera),
su **simulación pura ganada y perdida en Node dentro de `npm test`** (invariante de
conservación incluido) y el runtime en `game3d`. 128 reglas; 12 perfiles.

`v2.8.1` — patch de docs: fuera las enumeraciones que driftaban
(suites en CONTRIBUTING → apunta a `package.json`; card de game3d → sin lista de
perfiles). Principio: no enumerar lo que crece; enlazar a la fuente canónica.

`v2.8.0` — aditivo: tres mejoras de `game3d` — **runtime `quiz`** (el
perfil puro-datos gana demo jugable; partida perfecta verificada: 450 pts exactos),
**lógica pura testeada** (`game3d-logic.mjs` + 25 chequeos en `npm test`/CI: daño
determinista, fórmula de captura, XP/evoluciones, visión, colisión) y **tween de
movimiento + orientación** del sprite. 13 suites; 5 perfiles en el player.

`v2.7.1` — patch: runtime monster-rpg 3D **unificado** en `game3d.js`
(`kaiju-island-3d.html` delega por redirect; retirada la copia duplicada).

`v2.7.0` — aditivo: **game3d**
([`examples/game3d.html`](./examples/game3d.html)) — runtime **multi-perfil** Three.js:
un player único (`?game=<archivo>.generated.js`) que despacha por la nueva meta
`profile` del artefacto a un módulo de runtime por género (adventure, dungeon,
monster-rpg, voxel). No es un motor universal — imposible por diseño (SPEC §8) — pero
cualquier juego de esos perfiles corre sin tocar nada, incluidos los que no traen mapas
(terreno procedural de respaldo). Los 4 perfiles **verificados jugando** por el mismo
player.

`v2.6.0` — aditivo: **Kaiju Island 3D**
([`examples/kaiju-island-3d.html`](./examples/kaiju-island-3d.html)) — motor **Three.js**
completo para monster-rpg alimentado por el mismo `kaiju-island.generated.js` del visor
2D: mundo de tiles 3D desde `TILE_ART`/`PALETTES`, combate por turnos completo
(`TYPE_CHART`, efectos, captura/huida/XP/evoluciones por `BALANCE`), duelos con línea de
visión y áreas procedurales. Mecánicas **verificadas jugando** (playthrough scriptado:
captura, victorias, duelo ganado). El mismo GAME.md, dos motores.

`v2.5.0` — aditivo: **El Faro Hundido**
([`examples/el-faro-hundido.GAME.md`](./examples/el-faro-hundido.GAME.md) + HTML
jugable), un juego **completo** sobre el motor dungeon de referencia — 7 salas, 2
llaves encadenadas, 5 enemigos, 3 NPCs, agua animada y victoria — donde el motor es el
mismo código del perfil con el `generated` intercambiado: el juego entero es datos.
Jugabilidad **verificada end-to-end** en navegador (playthrough scriptado hasta el win).

`v2.4.2` — patch: última mención del inexistente `shared-helpers.js`
corregida en el checklist histórico de este README.

`v2.4.1` — patch de docs: `llms.txt` enseña las dos vías para crear un
perfil (puro-datos `.json` como preferida para agentes, `.js` con código como
dependencia a revisar), con el contrato completo de §6.1.

`v2.4.0` — aditivo: **reglas puras-de-datos** ([SPEC §11](./SPEC.md),
primera etapa). Los CLIs cargan perfiles `profiles/<id>.json` con `JSON.parse` — sin
ejecutar código, la vía segura para perfiles de terceros ([§10](./SPEC.md)); nueva
familia declarativa `enums`; `refs[].msg` opcional (mensaje por defecto del core); y
`profiles/quiz.json`, el perfil de referencia puro-datos (undécimo, `dataOnly: true` en
el manifest) con su ejemplo jugable. 116 reglas; 165 casos de conformance.

`v2.3.1` — patch de docs: la lista de suites de `CONTRIBUTING.md`
sincronizada con las 12 reales de `npm test`.

`v2.3.0` — aditivo: los cinco **pendientes de diseño** del análisis del
protocolo — [SPEC §1.2](./SPEC.md) gramática formal normativa del subset YAML,
[§6.1](./SPEC.md) contrato del descriptor de perfil + `validateProfile` en los CLIs,
familias **`bounds`/`dims` declarativas** en el core (platformer migrado como prueba),
[§10](./SPEC.md) Security & trust model y [§11](./SPEC.md) direcciones futuras (bundle
multi-archivo, reglas puras-de-datos). Suite: 12 suites, 157 conformance, nueva
`test/profile-descriptor.js`.

`v2.2.1` — patch de errata: el ahorro de la forma hex es ~1,8× medido (se
publicó como ~4×) y limpieza de conteos desfasados en comentarios de conformance.

`v2.2.0` — aditivo: las tres **fricciones de autoría** del stress-test,
resueltas — forma compacta hex para el arte 4bpp (`tileArt`/`sprites` como strings hex,
~1,8× menos texto de arte, mismo artefacto byte a byte), secciones canónicas ampliadas
(Sprites/Moves/Trainers/Encounters/Sfx como `##` de primera clase) y eliminado el warn
falso-positivo por comas en diálogos.

`v2.1.0` — aditivo: el stress-test **Kaiju Island**
([`examples/kaiju-island.GAME.md`](./examples/kaiju-island.GAME.md) + visor) que
ejercita todos los tokens del perfil monster-rpg a la vez, y el cierre de los **10
huecos de validación** que descubrió (6 reglas nuevas + 4 extensiones; conformance 147
casos, mutation audit 20/20). Los `GAME.md` válidos existentes siguen en 0 errores.

`v2.0.1` — patch: conteo de reglas verificado (104) y tests sin el
fallback interno `|| 'monster-rpg'` (alineados con el contrato 2.0.0).

`v2.0.0` — **breaking** (bump major): ejecuta la remoción anunciada en
`v1.3.0`. **`profile` es obligatorio**: sin él, `game-lint.js` reporta error
`required-fields` (exit 1) y `game-export.js` sale con exit 2 sin escribir artefacto.
Migración: un comando ([`MIGRATION.md`](./MIGRATION.md), De 1.x → 2.0.0, vigente).
Ciclo [SPEC §7.1](./SPEC.md) completo: deprecar (`1.3.0`) → gracia → remover (`2.0.0`).
La versión del protocolo sigue en `0.1`.

`v1.3.0` — deprecation del **fallback de `profile`** (regla
`profile-fallback`, `since: 1.3.0`, `removedIn: 2.0.0`, ciclo [SPEC §7.1](./SPEC.md)):
un `GAME.md` sin `profile` sigue resolviéndose como `monster-rpg` y lintea 0 errores,
pero emite un hallazgo `deprecated` (y `game-export.js` avisa por stderr). **En `2.0.0`
`profile` será obligatorio.** Receta de migración en [`MIGRATION.md`](./MIGRATION.md)
(De 1.x → 2.0.0).

`v1.2.0` — aditivo, solo spec (ver [`CHANGELOG.md`](./CHANGELOG.md)):
nueva [SPEC §9 **Conformance**](./SPEC.md) — el contrato normativo para
implementaciones alternativas (parser/linter/compilador/exit codes) más la mitad
permisiva (tolerancia a tokens `x-`/desconocidos y round-trip sin pérdida) — y
semántica explícita de los campos `x-` en §7. Cero cambios de código.

`v1.1.0` — aditivo sobre `1.0.0` (bump minor, [SPEC §7.0](./SPEC.md); ver
[`CHANGELOG.md`](./CHANGELOG.md)): ejemplo `monster-rpg` con demo, mutation audit del
linter (`test/mutation-manual.js`), y el pipeline de **extracción de sprites GBA**
(`tools/SPRITE_EXTRACTION.md`: generador procedural, extractor específico de Advance
Wars y extractor universal Ghidra+heurística). Añade además un décimo perfil cargable,
`advance-wars` (paletas BGR555 + unidades 4bpp), con sus reglas, derivaciones y
conformance; los 9 perfiles de referencia siguen siendo los de [SPEC §6](./SPEC.md),
que también describe este décimo. Sin breaking ni deprecations; la versión del
protocolo sigue en `0.1`.

`v1.0.0` — cierre de la fase MEDIANO (sobre la base CORTO). El *package*
alcanza `1.0.0`: a partir de aquí los cambios breaking al core y a los perfiles siguen
la política de versionado de [SPEC §7](./SPEC.md) (bump **major** + deprecation previa
en la major anterior, ver [SPEC §7.1](./SPEC.md)). La *versión del protocolo* (`SPEC.md`
header) y la `version` que declaran los `GAME.md` siguen siendo `0.1` hasta que una
edición futura del spec las mueva; el *release* del paquete es independiente. Comentarios
y *pull requests* bienvenidos (ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) y el
[Código de Conducta](./CODE_OF_CONDUCT.md)).

> **Nota sobre breaking changes (`0.1` → `1.0.0`).** En `0.x` los cambios breaking eran
> bump **minor** (`0.1` → `0.2`); desde el release `1.0.0` son bump **major** y
> **exigen** una deprecation previa (marcar `deprecated: {since, removedIn}` en la regla
> y dejar una entrada `### Deprecated` en `CHANGELOG.md`). Las recetas de renombrado
> entre versiones viven en [`MIGRATION.md`](./MIGRATION.md); el changelog de versiones
> en [`CHANGELOG.md`](./CHANGELOG.md).

### Features de `v1.0.0`

El release `v1.0.0` cierra la fase MEDIANO sobre la base CORTO. Lo que entra:

- **Perfil `tower-defense`** — nuevo género con 8 claves de balance (`TOWERS`, `DMG_CHART`, `ENEMIES`, `ARMORS`, `WAVES`, `MAPS`, `ECONOMY`, `BALANCE`) + arte; demo jugable en `examples/tower-defense.html`. Lleva el total a **9 perfiles** cargables (ver [SPEC §6](./SPEC.md)).
- **Deprecation policy** — nivel `deprecated` en el linter + regla `version-migration` (el linter *migra, no rechaza*) + `MIGRATION.md` con recetas de renombrado + `manifest.json` exponiendo `migrations`/`deprecatedRules`. Contrato completo en [SPEC §7.1](./SPEC.md).
- **Performance + helpers compartidos** — `tools/profile-helpers.js` (una sola definición reusada por manifest/schema/perfiles); `lintGame` sobre 10K datos < 50ms (mediana ~3ms); edge cases del parser (clave duplicada, string sin cerrar, indentación con TAB, guard de profundidad).
- **Governance** — `CODE_OF_CONDUCT.md`, `CODEOWNERS`, plantillas de issue/PR (`.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`).
- **buildGame 9/9** — `test/buildGame-content.js` cubre los 9 perfiles con aserciones de forma por clave derivada.
- **Docs finales alineados** — SPEC/README/CONTRIBUTING/MIGRATION/CHANGELOG sincronizados a `v1.0.0`.

### Fase MEDIANO completada ✅

La fase MEDIANO del roadmap (sobre la base de CORTO) está verde cuando **todos**
estos puntos pasan simultáneamente (ver [`PLAN-MEDIANO.md`](./PLAN-MEDIANO.md)):

- [x] **Perfil `tower-defense`** — nuevo género (8 claves: TOWERS/DMG_CHART/ENEMIES/ARMORS/WAVES/MAPS/ECONOMY/BALANCE) con reglas, perfil y ejemplo. → `S1`.
- [x] **Deprecation policy** — nivel `deprecated` en el linter + regla `version-migration` + `MIGRATION.md` + `manifest.json` expone `migrations`/`deprecatedRules`. → `S2`.
- [x] **Performance + helpers** — helpers compartidos (`tools/profile-helpers.js`), P1/P2/P3 (lint <50ms/10K datos) y edge cases del parser. → `S3`.
- [x] **Governance** — `CODE_OF_CONDUCT.md`, `CODEOWNERS`, plantillas de issue/PR. → `S4.1`.
- [x] **buildGame contenido 9/9** — `test/buildGame-content.js` cubre los 9 perfiles (tower-defense + 8). → `S4.2`.
- [x] **Docs finales** — README/SPEC/CONTRIBUTING alineados a `v1.0.0`. → `S4.3`.
- [x] **Tag `v1.0.0`** — `package.json` en `1.0.0` y `git tag v1.0.0`. → `S4.4`.
- [x] **Tests verde** — `npm test` corre las suites (parser, multi-genre, conformance, all-examples, cli-errors, buildGame-content, render-png, build-standalone, lifecycle, perf-smoke).

```bash
npm test                                   # las suites
node tools/game-manifest.js /tmp/m.json && diff -q /tmp/m.json manifest.json   # sin drift
node tools/game-schema.js && git diff --quiet schemas/                        # sin drift
git tag -l | grep v1.0.0                                                    # release tag
```

### Fase CORTO completada ✅

La base CORTO (sobre la que se apoya MEDIANO):

- [x] **CI 8/8** — `node test/all-examples.js` pasa los `(md, gen)` pares: lint 0 errores + export sin-drift.
- [x] **SPEC ↔ código sync** — sin reglas core ficticias; perfiles de SPEC §6 == `manifest.json`.
- [x] **`lintGame` directo (sin wrapper)** — emite `profile-known`, `version-migration`, `required-fields` sobre `profile` (y nivel `deprecated` para reglas con ciclo de vida).
- [x] **Conformance por regla** — `node test/conformance.js` cubre ≥1 caso inválido por regla por perfil.
- [x] **Hints 100%** — toda regla emitida en `--agent` lleva `hint` (o fallback genérico).
- [x] **Exit codes** — contrato `0/1/2` documentado (SPEC §3.1) y verificado por `test/cli-errors.js`.

## Licencia

[MIT](./LICENSE).
