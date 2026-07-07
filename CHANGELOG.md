# Changelog

## [Unreleased]

Trabajo posterior al release `1.0.0`, todavía sin release propio: `package.json`
sigue en `1.0.0` y la versión del protocolo sigue en `0.1`.

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

[1.0.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v1.0.0
[0.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v0.1.0