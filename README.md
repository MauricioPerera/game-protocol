# GAME Protocol — *Gameplay as Data*

> **Especificación `v1.0.0`** para describir el **contenido y el balance** de un juego 2D
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
game-lint.js (valida 101 reglas + cruces opcionales con el motor)
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
| [`SPEC.md`](./SPEC.md) | **La especificación del protocolo** (formato, tokens, artefacto, 101 reglas — core §4 + perfiles §6; hints de arreglo en [`tools/rule-hints.js`](./tools/rule-hints.js) —, frontera datos/código). |
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

**Release `v1.0.0`** + trabajo post-release sin release propio (ver
[`CHANGELOG.md`](./CHANGELOG.md) `[Unreleased]`): ejemplo `monster-rpg` con demo,
mutation audit del linter (`test/mutation-manual.js`), y el pipeline de **extracción de
sprites GBA** (`tools/SPRITE_EXTRACTION.md`: generador procedural, extractor específico
de Advance Wars y extractor universal Ghidra+heurística). Ese trabajo añade además un
décimo perfil cargable, `advance-wars` (paletas BGR555 + unidades 4bpp), con sus
reglas, derivaciones y conformance; los 9 perfiles de referencia siguen siendo los de
[SPEC §6](./SPEC.md), que también describe este décimo.

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
- [x] **Performance + helpers** — helpers compartidos (`tools/shared-helpers.js`), P1/P2/P3 (lint <50ms/10K datos) y edge cases del parser. → `S3`.
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
