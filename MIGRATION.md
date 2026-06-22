# Migration Guide — GAME Protocol

> Cómo actualizar un `GAME.md` entre versiones del spec. Vive junto a `SPEC.md` §7.1
> (Deprecation policy) y `manifest.json` (`migrations: { supported, doc }`).
>
**Regla de oro:** el linter **migra, no rechaza**. Un `GAME.md` escrito para una versión
anterior genera un hallazgo `version-migration` en nivel **warn** (0 errores) que apunta a
este documento. El archivo sigue siendo válido mientras la versión vieja no se remueva en
la major siguiente. Cuando el tooling ve un `version` **mayor** del que soporta, es
**error**: actualiza el tooling.

---

## 1. Modelo de versionado

- Semver. En `0.x`: **breaking = minor** (`0.1` → `0.2`), **correcciones/aditivos = patch**
  (`0.1.0` → `0.1.1`). En `1.0`+: los tokens core están **congelados**; toda remoción es
  major y debe pasar por deprecation (§7.1) la major anterior.
- Un token/regla/perfil deprecado a `since: S` se **soporta** desde `S` hasta justo antes
  de `removedIn`. Ej.: `since: 0.2`, `removedIn: 1.0` → soportado en `0.2`–`0.9.x`,
  **removido / error en `1.0`**.
- El campo `migrations.supported` de `manifest.json` lista las versiones con las que el
  tooling actual es compatible. Si tu `version` no está ahí, este documento te dice cómo
  llegar.

## 2. Cómo leer una entrada de migración

Cada entrada sigue esta forma:

```
## De <vOld> → <vNew>  (estado: vigente | pendiente)

### Cambios breaking
- <qué se removió o cambió de forma>

### Reglas deprecadas
- `ruleX` — deprecated since <vOld>, removedIn <vRemoved>. Usar `ruleY` en su lugar.

### Tokens removidos
- `TOKEN` — eliminado en <vNew>; pasa a `<TOKEN_NUEVO>` (ver receta).

### Receta de renombrado
<sed / jq / paso a paso>

### Ejemplo
<antes> → <después>
```

---

## 3. Entradas por versión

### De 0.1 → 0.2  (estado: pendiente — se completa cuando 0.2 sale)

> Placeholder. `0.1` es la versión actual; no hay cambios pendientes todavía. Esta entrada
> se rellena **al publicar `0.2`**. Mientras tanto, sirva como **plantilla** y como receta
> de referencia para renombrados futuros.

**Cambios breaking:** _(ninguno previsto aún)_

**Reglas deprecadas:** _(ninguna aún)_

**Tokens removidos:** _(ninguno aún)_

---

## 4. Recetas de renombrado

Cuando una versión renombra un token (o un campo de un token), la migración es mecánica.
El patrón general — **renombra la clave de colección y toda referencia que la cite** — se
ejemplifica abajo con el caso canónico `MOVES` → `ACTIONS`. La receta cubre (a) el token en
el front-matter y (b) las referencias que lo apuntan (en `refs` del perfil y en claves
derivadas).

### Receta: `MOVES` → `ACTIONS`

> **Nota:** este renombrado es un **ejemplo de patrón** (template). `MOVES` sigue siendo el
> nombre vigente en `0.1`; la receta existe para que cualquier renombrado futuro tenga un
> molde probado. Cuando un renombrado real se aplique, se mueve a §3 con su versión.

**Qué cambia:**
- El token `moves` (colección de ataques/acciones del `monster-rpg`) se renombra a `actions`.
- Las referencias que lo citan (`species.*.moves[]` → `species.*.actions[]`) cambian de
  `from` en el `refs` del perfil.
- La clave derivada `MOVES` exportada por `derive` pasa a `ACTIONS`.

**Paso a paso en el `GAME.md`:**

1. Renombrar la colección del front-matter `moves:` → `actions:`.
2. Renombrar el campo `moves:` dentro de cada especie → `actions:`.
3. Bump `version: "0.1"` → la versión nueva.

**Script mínimo (sed, GNU/BSD):**

```sh
# 1) Renombrar la clave de colección del front-matter (líneas que empiezan con 'moves:')
sed -i.bak 's/^moves:/actions:/' GAME.md
# 2) Renombrar el campo moves: dentro de species (indentado bajo species.*)
sed -i.bak 's/^\(\s\+\)moves:/\1actions:/' GAME.md
# 3) Bump de versión (ajustar el destino a la versión nueva)
sed -i.bak 's/^version: "0.1"/version: "0.2"/' GAME.md
# 4) Re-lint y revisar hallazgos; los broken-ref que apunten a 'moves' deben desaparecer
node tools/game-lint.js GAME.md --agent
```

> El `sed` alcanza para tokens **simples** (renombrado plano de claves). Para tokens con
> reestructuración (un campo que cambia de tipo o se mueve de nodo), no uses `sed`: edita
> a mano siguiendo el perfil destino y deja que el linter (`--agent`) guíe la migración.

**Alternativa con jq** (si trabajas sobre el JSON exportado, no sobre el `GAME.md`):

```sh
node tools/game-export.js GAME.md /tmp/game.json
jq 'walk(if type=="object" and has("moves") then .actions=.moves | del(.moves) else . end)' \
  /tmp/game.json > /tmp/game.migrated.json
```

### Ejemplo (antes → después)

`GAME.md` (0.1, `moves`):

```yaml
version: "0.1"
profile: monster-rpg
moves:
  TACKLE: { power: 40, type: NORMAL }
species:
  RATA:
    type: NORMAL
    moves: [TACKLE]
```

`GAME.md` (migrado, `actions`):

```yaml
version: "0.2"
profile: monster-rpg
actions:
  TACKLE: { power: 40, type: NORMAL }
species:
  RATA:
    type: NORMAL
    actions: [TACKLE]
```

Tras migrar, corre:

```sh
node tools/game-lint.js GAME.md        # 0 errores → listo
node tools/game-export.js GAME.md examples/game-data.generated.js
```

---

## 5. Checklist de migración

- [ ] Bump `version:` al destino.
- [ ] Aplicar cada receta de renombrado de la entrada de versión (§3).
- [ ] Sustituir toda regla deprecada por su reemplazo (ver `### Reglas deprecadas`).
- [ ] Eliminar tokens removidos (ver `### Tokens removidos`).
- [ ] `node tools/game-lint.js GAME.md --agent` → 0 errores.
- [ ] Regenerar el artefacto exportado (CI verifica sin-drift).

> Si el linter reporta `version-migration` como **error** (no warn), tu `version` es
> **mayor** que la soportada por el tooling: actualiza el tooling (`git pull` / nueva
> release) en lugar de intentar migrar hacia atrás.