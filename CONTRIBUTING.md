# Contribuir al GAME Protocol

Esto es una **propuesta abierta** (RFC, `v0.1`). Toda crítica al diseño es bienvenida.

## Cómo proponer cambios

- **Discusión de diseño** (una sección nueva, una regla, el subconjunto YAML): abre un *issue* con el
  prefijo `[rfc]` describiendo el problema y la propuesta concreta.
- **Cambios al spec o a las herramientas**: abre un *pull request*. Requisitos:
  1. `node tools/game-lint.js examples/GAME.md` → **0 errores**.
  2. Si tocas el export, regenera el ejemplo y commitéalo (la CI verifica **sin-drift**):
     `node tools/game-export.js examples/GAME.md examples/game-data.generated.js`.
  3. Si añades una sección de token, sigue el patrón de 5 pasos de la [§8 de la spec](./SPEC.md)
     (definir → exportar → consumir → validar → verificar) y documenta la regla nueva en `SPEC.md`.

## Principios que mantenemos

- **Datos, no lógica.** Si un cambio mete *comportamiento* en el YAML, probablemente va en el motor.
- **Fallback siempre.** Toda clave nueva debe tener un valor por defecto del lado del motor.
- **Sin dependencias.** Las herramientas son Node puro; nada de `npm install`.
- **Validable y sin drift.** Toda sección nueva trae su regla de lint; el generado se regenera siempre.

## Estructura

- `SPEC.md` — la especificación.
- `tools/` — implementación de referencia (parser, lint, export).
- `examples/` — documento de ejemplo + su artefacto generado.
