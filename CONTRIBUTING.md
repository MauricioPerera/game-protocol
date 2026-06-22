# Contribuir al GAME Protocol

Esto es una **propuesta abierta** (RFC, `v0.1`). Toda crítica al diseño es bienvenida.

> Antes de participar, lee y respeta el [Código de Conducta](./CODE_OF_CONDUCT.md).
> Reportes de violaciones: **mauricio.perera@gmail.com**.

## Cómo proponer cambios

- **Discusión de diseño** (una sección nueva, una regla, el subconjunto YAML): abre un *issue* con el
  prefijo `[rfc]` describiendo el problema y la propuesta concreta.
- **Cambios al spec o a las herramientas**: abre un *pull request*. Requisitos:
  1. `node tools/game-lint.js examples/GAME.md` → **0 errores**.
  2. Si tocas el export, regenera el ejemplo y commitéalo (la CI verifica **sin-drift**):
     `node tools/game-export.js examples/GAME.md examples/game-data.generated.js`.
  3. Si añades una sección de token, sigue el patrón de 5 pasos de la [§8 de la spec](./SPEC.md)
     (definir → exportar → consumir → validar → verificar) y documenta la regla nueva en `SPEC.md`.
  4. Si tocas `game-manifest.js`, regenera `manifest.json` (la CI verifica sin-drift):
     `node tools/game-manifest.js`.

## Cambios breaking y política de versionado

El protocolo usa **semver** con dos regímenes (ver [SPEC §7](./SPEC.md) y la política de
deprecation en [SPEC §7.1](./SPEC.md)):

- **Durante `0.x` (pre-`1.0`):** un cambio breaking (remover/renombrar un token core, regla
  o perfil; cambiar la forma de un token) bump **minor** (`0.1` → `0.2`). Las correcciones y
  los cambios aditivos son **patch** (`0.1.0` → `0.1.1`).
- **Desde `1.0`:** los tokens core están **congelados**. Toda remoción es bump **major** y
  debe pasar por **deprecation** la major anterior (marcar `deprecated: {since, removedIn}`,
  esperar un ciclo completo, luego remover).

**Regla de PR (obligatoria):** todo cambio breaking al core o a los perfiles va acompañado
de:

1. Una entrada en `CHANGELOG.md` bajo `[Unreleased]`:
   - `### Deprecated` — para lo que se depreca (con `since` y `removedIn`, y el reemplazo).
   - `### Removed` — para lo que se remueve (entrada breaking; bump minor en `0.x`, major
     en `1.0`). **Nunca remover sin una deprecation previa.**
2. El bump de versión correspondiente en `package.json`.
3. Si el breaking mueve un token/regla entre versiones, una **receta de migración** en
   [`MIGRATION.md`](./MIGRATION.md) (renombrado de claves, referencias y derivadas, con
   script `sed`/`jq` cuando aplique). El campo `migrations.supported` de `manifest.json`
   debe reflejar la nueva versión.
4. `SPEC.md` y `manifest.json` actualizados para que no haya drift con el código.

**Deprecar vs. romper.** Deprecar **no** rompe: el nivel `deprecated` del linter no es error
(0 errores), da una major de gracia y un hint accionable. Romper **sí**: remueve y exige
migrar. Depreca primero, rompe después.

## Principios que mantenemos

- **Datos, no lógica.** Si un cambio mete *comportamiento* en el YAML, probablemente va en el motor.
- **Fallback siempre.** Toda clave nueva debe tener un valor por defecto del lado del motor.
- **Sin dependencias.** Las herramientas son Node puro; nada de `npm install`.
- **Validable y sin drift.** Toda sección nueva trae su regla de lint; el generado se regenera siempre.

## Estructura

- `SPEC.md` — la especificación.
- `MIGRATION.md` — recetas de migración entre versiones (renombrado de tokens/reglas).
- `CHANGELOG.md` — registro de versiones; `[Unreleased]` agrupa lo pendiente.
- `CODE_OF_CONDUCT.md` — código de conducta.
- `CODEOWNERS` — owners automáticos por ruta (`/tools/*`, `/profiles/*`).
- `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` — plantillas.
- `tools/` — implementación de referencia (parser, lint, export).
- `profiles/` — perfiles de dominio (vocabulario por género).
- `examples/` — documento de ejemplo + su artefacto generado.

## Deprecación (resumen)

Deprecar **no rompe**: el nivel `deprecated` del linter no es error (lint queda en
0 errores), da una major de gracia y un hint accionable con `since`/`removedIn`.
Romper **sí**: remueve y exige migrar. **Depreca primero, rompe después.** Ver
[SPEC §7.1](./SPEC.md) para el contrato completo y `manifest.json`
(`deprecatedRules` por perfil) para el ciclo de vida expuesto a agentes.
