# Profile: monster-rpg

> El perfil original del Protocolo GAME: un RPG de colección de criaturas (estilo Pokémon).
> Es **un perfil**, no el protocolo. El core (ver [SPEC.md](../SPEC.md)) no conoce ninguno de
> estos tokens; los aporta este perfil. Fuente de verdad ejecutable: [`profiles/monster-rpg.js`](monster-rpg.js).

## Token schema (front-matter)

```yaml
profile: monster-rpg
platform: { mode, cols, rows, screenW, screenH }
palettesCount: <number>

tiles:
  <id 16..63>: { name, solid: bool, warp?: bool, encounter?: bool }

types:
  <TYPE>: { <TYPE>: <multiplier> }          # tabla de efectividad
moves:
  <NAME>: { type: TYPE, power: number, effect?: poison, chance?: number }
species:
  <NAME>: { type: TYPE, maxhp, pal?, moves: [MOVE,...], wild?: bool,
            sprite?: name, evolvesInto?: SPECIES, atLevel?: number }
trainers:
  <NAME>: { level, pal, prize, dialogue, team: [SPECIES,...] }
items:
  <NAME>: { price, effect: heal|cure|catch, amount?, cures? }
encounters:
  <area>: [SPECIES, ...]
economy: { startMoney }
balance: { catchBase, catchScale, xpCurveMul, encounterRate }

palettes:        { <idx>: [[r,g,b], ...] }   # 0..31 por canal, se rellena a 16
spritePalettes:  { <idx>: [[r,g,b], ...] }
sprites:         { <name>: [[...16x16...]] }
tileArt:         { <id>: [[...8x8...]] }
sfx:             { <event>: { freq, dur } }

maps:
  <id>:
    fill: { tile, pal }
    legend: { <char>: { tile, pal } }
    rows: ["...", ...]
    entry: { col, row }
    exit:  { col, row }     # debe caer sobre tile 46 (felpudo)
    return:{ col, row }
overworld:
  <area>:
    npcs:     [{ col, row, pal, range, timer, dialogue }, ...]
    trainers: [{ col, row, name: TRAINER, dir, sight }, ...]
    warps:    [{ col, row, target: area_o_interior, entry?: {col,row} }, ...]
player: { starter: SPECIES, level, start: {x,y}, inventory: { ITEM: number } }
text:   { <key>: "string" }
```

## Section order (cuerpo Markdown)

`Overview · Tiles · Types · Species · Maps · Player · Text · Economy & Balance · Do's and Don'ts`

## Reglas (28 originales)

Repartidas entre las **familias del core** (declarativas, vía `refs`) y las **reglas propias del perfil**
(lógica no uniforme, en `rules`). El reparto completo está en [RULE-SPLIT.md](../RULE-SPLIT.md).

- **Familia broken-ref (datos):** move-type-valid, species-type-valid, moves-exist, evolvesInto,
  trainer-team-valid, encounter-ref, sprite-ref, player.starter, player.inventory.
- **Reglas del perfil (funciones):** palette-range, palette-color-range, solid-sync, type-symmetry,
  trainer-bounds, sprite-dims, item-effect-valid, map-dims/legend-ref/map-meta, overworld-ref,
  tileart-ref/dims, sfx-valid, player.level/start, economy-bounds, dead-token.

## Derived keys (compilación)

`derive` produce el `window.GAME` (24 claves contando la meta del core). Pass-through directos
(`TYPE_CHART, MOVES, SPECIES, SPRITES, ITEMS, OVERWORLD, PLAYER, TILE_ART, TEXT, SFX, BALANCE, TILES`)
y derivados:

| Clave | Derivación |
|---|---|
| `WILD_LIST` | especies con `wild:true`; `moves` expandidos a objetos completos |
| `EVOLUTIONS` | desde `evolvesInto`/`atLevel`, con stats del destino |
| `TRAINERS` | equipos expandidos con stats completos por especie |
| `ENCOUNTERS` | listas por zona expandidas a objetos de combate |
| `ECONOMY` | `economy` + `prices` derivados de `items[*].price` |
| `PALETTES` / `SPRITE_PALETTES` | rellenados a 16 colores |
| `MAPS` | `rows`+`legend`+`fill` → `{tilemap, attrs}` |
| `SOLID_TILES` | ids con `solid:true`, ordenados |
