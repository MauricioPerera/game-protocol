# Changelog

## [Unreleased] — fase CORTO completada

### Added
- `test/cli-errors.js`: suite de flujos de error de los CLI (exit codes 0/1/2, `--help`/`-h`,
  flags desconocidos, archivo inexistente, parse-error, perfil desconocido/inválido) → `T3`.
- `test/buildGame-content.js`: tests de contenido de `buildGame` por perfil (claves derivadas
  con forma: `WILD_LIST`/`EVOLUTIONS`/`ECONOMY`/`SOLID_TILES` monster-rpg, `VOXELS.bounds`
  voxel, + las 8 derivadas de cada perfil) → `Q4`/`T4` inicio.
- `test/build-standalone.js`: test del inliner (local inlinado, CDN intacto, body preservado) → `T7`.
- CI: job `tests` corre los 8 suites (parser, multi-genre, conformance, all-examples,
  cli-errors, buildGame-content, render-png, build-standalone).
- SPEC §3.1: notas de uso por CLI sobre el contrato de exit codes.
- README: checklist "Fase CORTO completada" (CI 8/8, SPEC sync, conformance 99, tests verde).
- `.gitattributes` (`* text=auto eol=lf`): mitiga drift CRLF en Windows (`R4.3`).
- `PLAN-MEDIANO.md`: roadmap post-CORTO (tower-defense, deprecation, migración, conformance
  full, edge cases parser, helpers compartidos).

### Fixed
- `game-export.js`: archivo inexistente ahora exit 2 con mensaje claro (antes: stack trace + exit 1).
- `build-standalone.js`: archivo inexistente ahora exit 2 con mensaje claro.

### Changed
- `package.json` `test`: corre los 8 suites en secuencia.

## [0.1.0] — 2026-06-22

### Added
- Core genérico sin dependencias: parser YAML, linter, compilador
- 8 perfiles cargables (monster-rpg, platformer, adventure, crafting, dungeon, papers-please, roguelike, voxel)
- CI con gate sin-drift: manifest, schemas, ejemplos
- Demos jugables: roguelike, dungeon, adventure (+ voxel 3D viewer)
- Bucle agente LLM: --agent mode con hints accionables

### Fixed
- S1: Prototype pollution en parser YAML (__proto__, constructor)
- S2: Path traversal + RCE vía profile inválido (validar /^[a-z0-9-]+$/)
- S3: new Function() en render-png.js → require() con path-check
- M1: README referencia game-build.js inexistente (→ game-build-core.js)

### Known Issues
- Sin política de deprecation (fix en MEDIANO)
- 4 perfiles sin demo HTML (documented as "data contract")
- `tower-defense` listado como planned en SPEC §9 (implementación real en MEDIANO)

[0.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v0.1.0