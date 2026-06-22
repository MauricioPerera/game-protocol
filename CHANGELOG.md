# Changelog

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
- CI cubre 3/8 ejemplos (fix en CORTO)
- SPEC↔código drift (tower-defense, reglas core no implementadas; fix en CORTO)
- Sin política de deprecation (fix en MEDIANO)
- 4 perfiles sin demo HTML (documented as "data contract")

[0.1.0]: https://github.com/MauricioPerera/game-protocol/releases/tag/v0.1.0