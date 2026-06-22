# Changelog

## [Unreleased]

_No hay cambios pendientes. El release `1.0.0` cierra la fase MEDIANO._

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
- `tools/shared-helpers.js`: helpers isomorfos compartidos (`describeSrc`, `palArray`,
  `rulePalettes`, `ruleTileArt`) extraídos de `game-manifest.js`/`game-schema.js` y los
  perfiles — una sola definición.
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
- `package.json` `test` + CI `ci.yml`: añaden `test/lifecycle.js` y `test/perf-smoke.js`.

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

[1.0.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.0.0
[0.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v0.1.0