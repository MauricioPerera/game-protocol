# PLAN-MEDIANO — game-protocol (fase post-CORTO, camino a `1.0`)

Inicia el roadmap **después** de la fase CORTO (verde, ver `PLAN-CORTO.md` §5). CORTO cerró los
6 hallazgos ALTO que bloqueaban `1.0` (`H-3.1`, `D2`, `API1`, `API2/D3`, `D4/H-1.1`, `D5`); MEDIANO
ataca el resto: el segundo perfil de referencia real, la política de versionado/migración, la
conformance completa de `buildGame`, los edge cases del parser y los helpers compartidos.

**Criterio de SALIDA (verde MEDIANO) → desbloquea `1.0`:**
1. `tower-defense` implementado (`tower-defense.js` + schema + ejemplo + demo) — cierra `H-1.1` vía (a).
2. Política de deprecation + nivel `deprecated` en el linter — `H-2.4` / `H-3.5`.
3. `MIGRATION.md` + regla de PR breaking — `H-3.4`.
4. `buildGame` conformance completa para los 7 perfiles restantes — `Q4` / `T4` full.
5. Edge cases del parser cubiertos + guard de profundidad — `T1` / `STRESS1`.
6. Semver 0.x aterrizado en SPEC §7 — `H-3.3`.

**Duración estimada:** 2–3 semanas (~60h). Secuencia recomendada abajo.

---

## 1. Bloques de trabajo

### 1.1 `tower-defense` real (`H-1.1` vía a) — 3–5 días
- `profiles/tower-defense.js` (tokens: torres, oleadas, camino, enemigos, economía de oleadas;
  `derive` con `WAVES`, `PATH`, `TOWERS`).
- `schemas/tower-defense.schema.json` (regenerado por `game-schema.js`).
- `examples/tower-defense.GAME.md` + `examples/tower-defense.generated.js` (sin-drift gate).
- `examples/tower-defense.html` (demo jugable) + `-standalone.html` (gate `E4`).
- Conformance: ≥1 inválido por regla del perfil.
- SPEC §6: volver a listar `tower-defense` como perfil cargable (ya con código), retirar la
  marca "planned" de §9 Roadmap.
- DoD: `node test/all-examples.js` cubre 9/9; `manifest.json` lista `tower-defense`; SPEC §6 sync.

### 1.2 Política de deprecation + `deprecated` (`H-2.4`, `H-3.5`) — 1 día
- Nivel `deprecated` en `lintGame` (entre `warn` y `error`): un token/perfil/regla marcado
  `deprecated` emite un hallazgo que NO rompe CI hoy, pero documenta la salida.
- `manifest.json` expone `status: stable|experimental|deprecated` por perfil (`H-1.3`, `H-1.5`).
- SPEC §7: semver 0.x aterrizado (qué cuenta como breaking en `0.x`).
- DoD: un perfil marcado `deprecated` emite el hallazgo; SPEC §7 lista la política.

### 1.3 `MIGRATION.md` + regla de PR breaking (`H-3.4`) — 0.5 día
- `MIGRATION.md` con la receta de renombrado de tokens/perfiles.
- Regla de PR: todo cambio breaking al core/perfiles va con entrada en `CHANGELOG.md`
  `[Unreleased]` + bump minor en `0.x` (major en `1.0`).
- DoD: `MIGRATION.md` existe; CONTRIBUTING lo cita.

### 1.4 `buildGame` conformance completa (`Q4` / `T4`) — 2 días
- Extender `test/buildGame-content.js` a los 7 perfiles restantes con aserciones de forma por
  clave derivada (no sólo "presente"): `SCENE.tilemap` rectangular, `SCENES.*` coherentes,
  `GENERATOR` con campos requeridos, `RECIPES.outputValue`, `DAYS.rules`, `MATERIALS`,
  `LEVELS`, `ENTRANTS`. Un fixture inválido por derivación (ej. `EVOLUTIONS` apuntando a
  especie inexistente) debe detectarse vía `lintGame`, no vía `buildGame` (build nunca lanza).
- DoD: cada perfil tiene ≥2 aserciones de forma + 1 aserción de "build no lanza con dato roto".

### 1.5 Edge cases del parser (`T1`, `STRESS1`) — 1.5 días
- `test/parser.js` ampliado: clave duplicada, string sin cerrar, indentación con TAB,
  sobre-indentación, anidamiento profundo, comillas escapadas, block sequence `- item` (error
  claro o soporte, ver `A5`/`STRESS2`).
- Guard de profundidad en `parseBlock` (`STRESS1`): límite de anidamiento para no stack-overflow.
- DoD: cada edge case tiene un test que afirma "lanza error claro" o "parsea a lo esperado".

### 1.6 Helpers compartidos (`Q1`, `Q2`, `M4`) — 1 día
- Extraer `describeSrc` (duplicado en `game-manifest.js` + `game-schema.js`) y `rulePalettes` /
  `ruleTileArt` (duplicados entre perfiles) a un `tools/shared.js` isomorfo.
- DoD: `grep -r "describeSrc"` → una sola definición; perfiles importan los helpers.

### 1.7 DX CLI (`U5`, `U8`, `U9`) — 1 día
- `--profile <id>` flag en `game-lint.js` / `game-export.js` (sobreescribe `data.profile`).
- `--format json|text`, `--quiet`, unificar rutas de salida por defecto.
- DoD: `--profile voxel node tools/game-lint.js examples/GAME.md` lintea como voxel.

### 1.8 Governance (`H-2.1`, `H-2.2`) — 0.5 día
- `CODE_OF_CONDUCT.md`, issue/PR templates, `CODEOWNERS`.

### 1.9 Visores por perfil (`E1`) — 1 día
- `monster-rpg.html` motor de referencia; visores mínimos para platformer/crafting/papers-please
  (los 4 perfiles hoy sin demo, documentados como "data contract").

### 1.10 Performance (`P1`–`P5`) — opcional, 1 día
- Pre-tokenizar motor, `entityAt` O(1), cachear `Set`s en `targetSet`. Sólo si perf es cuello.

### 1.11 Contrato declarativo motor→linter (`A1`, `Q3`) — opcional, 1.5 días
- `requireEngine` siempre `false` desde CLI hoy; exponer cruce motor (`solid-sync`,
  `dead-token`) vía un descriptor en vez de `GAME_ENGINE` string.

---

## 2. Secuencia recomendada

```
1.1 tower-defense ──┐
1.2 deprecation ────┤── SPEC §6/§7 sync (1.2 + 1.3)
1.3 MIGRATION ──────┘
        ↓
1.4 buildGame conformance full
1.5 parser edge cases + guard
        ↓
1.6 helpers compartidos (refactor, no behavior)
1.7 DX CLI
        ↓
1.8 governance · 1.9 visores · 1.10 perf · 1.11 motor→linter (paralelo, no bloquean 1.0)
```

Camino crítico a `1.0`: `tower-defense` (1.1) + deprecation (1.2) + MIGRATION (1.3) +
`buildGame` full (1.4) + parser edge cases (1.5). El resto son extras.

---

## 3. Fuera de scope (LARGO — más allá de `1.0`)

- Block sequences `- item` en `yaml-min` como sintaxis de primera clase (`A5`/`STRESS2`) —
  evaluar si el costo de generalizar el parser supera el beneficio vs flujo `[a, b]`.
- `tokenType` derivado de `derive`/`refs` en vez de la heurística actual de `game-schema.js` (`A4`).
- Internacionalización de los `text` del core.
- Perfiles aportados por la comunidad (gobernanza de inclusión).

---

## 4. Riesgos heredados de CORTO

- **R4.1 (profile required)** cerrado: los 8 ejemplos declaran `profile:` y el core lo exige.
  Un ejemplo nuevo sin `profile` romperá lint — documentar en CONTRIBUTING.
- **R4.3 (EOL drift)** cerrado: `.gitattributes` con `* text=auto eol=lf` mitiga el ruido CRLF
  en Windows. Mantenerlo.
- **R4.5 (CLI tests Windows)** cerrado: `test/cli-errors.js` usa `process.execPath` +
  normaliza CRLF; corre en CI ubuntu y local Windows.

*Fin de PLAN-MEDIANO. Continuación de PLAN-CORTO §7 (fuera de scope CORTO).*