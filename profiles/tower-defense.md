# Profile: tower-defense

> A second-genre profile, included to prove the GAME Protocol core is genre-agnostic.
> Nothing in this profile required changing the core: it is expressed entirely as
> token schema + reference graph + bounds + section order + derived keys.

## Token schema (front-matter)

```yaml
# towers the player can build
towers:
  <NAME>: { cost: number, range: number, damage: number, rate: number, dmgType: DMGTYPE, sprite?: sprite_name }

# damage types and how effective each is vs each armor class
dmgTypes:
  <DMGTYPE>: { <ARMOR>: multiplier }   # parallels monster-rpg's type chart — same broken-ref + symmetry families

# enemies that walk the path
enemies:
  <NAME>: { hp: number, speed: number, armor: ARMOR, bounty: number, sprite?: sprite_name }

armors: [ARMOR, ...]                    # flow list of armor class ids

# waves: ordered spawns per level
waves:
  <level>:
    spawns: [{ enemy: ENEMY, count: number, gap: number }, ...]
    reward: number

# the path enemies follow (reuses the core map/legend/dims machinery)
maps:
  <id>:
    fill: { tile: number, pal: number }
    legend: { <char>: { tile: number, pal: number } }
    rows: [...]
    path: [{ col, row }, ...]           # ordered waypoints; profile rule: contiguous + starts at spawn, ends at base

economy: { startGold: number, startLives: number }
balance: { sellRatio: number, interestRate: number }
```

## Section order (Markdown body)

`Overview · Towers · DamageTypes · Enemies · Waves · Maps · Economy & Balance · Do's and Don'ts`

## Reference graph (feeds core `broken-ref`)

- `towers.*.dmgType` → `dmgTypes`
- `dmgTypes.*.<armor>` → `armors`
- `enemies.*.armor` → `armors`
- `waves.*.spawns[].enemy` → `enemies`
- `towers.*.sprite` / `enemies.*.sprite` → `sprites`
- `maps.*.legend` / `fill` → `tiles`

## Bounds & dimensions (feed core `range` / `dims`)

- `towers.*.cost`, `.range`, `.damage`, `.rate` > 0
- `enemies.*.hp`, `.speed`, `.bounty` > 0; `0 ≤ armor index < len(armors)`
- `waves.*.spawns[].count` > 0; `.gap` ≥ 0
- `balance.sellRatio` ∈ [0,1]; `balance.interestRate` ≥ 0
- sprites `16×16`, tileArt `8×8` (same as monster-rpg — platform-level, not domain)

## Profile-specific rules

- `dmgtype-symmetry` (warn): damage multiplier table roughly symmetric — *literally the same family as monster-rpg's `type-symmetry`, pointed at `dmgTypes`.*
- `path-contiguous` (error): each `maps.*.path` is a sequence of orthogonally-adjacent cells from a spawn tile to a base tile.
- `wave-monotonic` (warn): total wave HP is non-decreasing across levels (balance smell).

## Derived keys (feed core `export`)

| Key | Origin | Derivation |
|---|---|---|
| `TOWERS` | `towers` | direct |
| `DMG_CHART` | `dmgTypes` | direct |
| `ENEMIES` | `enemies` | direct |
| `WAVES` | `waves` | spawns expanded with full enemy stats |
| `MAPS` | `maps` | rows+legend+fill → `{tilemap, attrs}`; `path` → waypoint list |
| `ECONOMY` / `BALANCE` | resp. | direct |
| `SPRITES` / `TILE_ART` / `TILES` | resp. | direct (core-shared) |

## Why this matters

Compare to `monster-rpg`: `dmgTypes` ↔ `types`, `enemies` ↔ `species`, `waves` ↔ `encounters`,
`armor` ↔ defensive typing. **Different vocabulary, identical machinery.** The fact that this
profile needed zero core changes is the proof that the protocol — not the Pokémon vocabulary —
is the actual contribution.
