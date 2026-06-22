# GAME Protocol — *Gameplay as Data*

> **Una propuesta (RFC, borrador `v0.1`)** para describir el **contenido y el balance** de un juego 2D
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
game-lint.js (valida 28 reglas + cruces opcionales con el motor)
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
| [`SPEC.md`](./SPEC.md) | **La especificación del protocolo** (formato, tokens, artefacto, 28 reglas, frontera datos/código). |
| [`tools/yaml-min.js`](./tools/yaml-min.js) | Parser del subconjunto YAML (isomorfo Node/navegador). |
| [`tools/game-lint-core.js`](./tools/game-lint-core.js) | Reglas de validación puras (`lintGame`), isomorfas. |
| [`tools/game-lint.js`](./tools/game-lint.js) | CLI del validador (cruces con el motor opcionales vía `GAME_ENGINE`). |
| [`tools/game-build-core.js`](./tools/game-build-core.js) | Compilación genérica dirigida por `profile.derive`; isomorfa. |
| [`tools/game-export.js`](./tools/game-export.js) | CLI del compilador → `game-data.generated.js`. |
| [`examples/GAME.md`](./examples/GAME.md) | Documento de ejemplo mínimo y autocontenido. |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | CI: lint + sin-drift del generado. |

---

## Estado

**Borrador (`v0.1`).** Es una propuesta abierta a discusión: nombres de secciones, reglas de validación
y el subconjunto YAML están sujetos a cambio. Comentarios y *pull requests* bienvenidos
(ver [`CONTRIBUTING.md`](./CONTRIBUTING.md)).

### Fase CORTO completada ✅

La fase CORTO del roadmap está verde cuando **todos** estos puntos pasan simultáneamente
(ver [`PLAN-CORTO.md`](./PLAN-CORTO.md) §5 para los comandos exactos):

- [x] **CI 8/8** — `node test/all-examples.js` pasa los 8 `(md, gen)` pares: lint 0 errores + export sin-drift.
- [x] **SPEC ↔ código sync** — sin reglas core ficticias; perfiles de SPEC §6 == `manifest.json`.
- [x] **`lintGame` directo (sin wrapper)** — emite `profile-known`, `version-migration`, `required-fields` sobre `profile` (y nivel `deprecated` para reglas con ciclo de vida).
- [x] **Conformance por regla** — `node test/conformance.js` cubre ≥1 caso inválido por regla por perfil (99 inválidos).
- [x] **Hints 100%** — toda regla emitida en `--agent` lleva `hint` (o fallback genérico).
- [x] **Exit codes** — contrato `0/1/2` documentado (SPEC §3.1) y verificado por `test/cli-errors.js`.
- [x] **Tests verde** — `npm test` corre los 8 suites: parser, multi-genre, conformance, all-examples, cli-errors, buildGame-content, render-png, build-standalone.

```bash
npm test                                   # los 8 suites
node tools/game-manifest.js /tmp/m.json && diff -q /tmp/m.json manifest.json   # sin drift
node tools/game-schema.js && git diff --quiet schemas/                        # sin drift
```

## Licencia

[MIT](./LICENSE).
