# The 28 rules: core vs. profile

The current linter hardcodes all 28 rules to the monster-RPG domain. To make the protocol genre-agnostic, each rule is classified as **core** (genre-independent machinery) or **profile** (monster-RPG–specific). Core rules stay in `game-lint-core.js`; profile rules move to a loadable profile module that feeds data into the core rule *families*.

| # | Rule | Now → | Notes |
|---|---|---|---|
| 1 | `frontmatter-present` | **core** | structural |
| 2 | `required-fields` | **core** | + add `profile` to required set |
| 3 | `section-order` | **core (family)** | profile supplies the canonical section list (replaces hardcoded `CANON`) |
| 4 | `palette-range` | **core (family: range)** | profile declares the token + bound |
| 5 | `palette-color-range` | **core (family: range)** | bound `[0,31]` is a *profile/platform* value, not core |
| 6 | `solid-sync` | **core (family: dead-token / engine-sync)** | mechanism is generic; `solid` field is profile |
| 7 | `type-symmetry` | **profile** | only meaningful with a type chart |
| 8 | `move-type-valid` | **profile** | (→ `broken-ref` instance) |
| 9 | `species-type-valid` | **profile** | (→ `broken-ref` instance) |
| 10 | `moves-exist` | **profile** | (→ `broken-ref` instance) |
| 11 | `broken-ref` | **core (family)** | the engine; profile supplies the reference graph |
| 12 | `trainer-team-valid` | **profile** | (→ `broken-ref` instance) |
| 13 | `trainer-bounds` | **profile** | (→ `range` instance: prize > 0) |
| 14 | `sprite-ref` | **core (family: broken-ref)** | sprites are arguably core-art, but keep in profile until art layer is factored out |
| 15 | `sprite-dims` | **core (family: dims)** | profile declares `16×16` |
| 16 | `item-effect-valid` | **profile** | effect enum is domain-specific |
| 17 | `encounter-ref` | **profile** | (→ `broken-ref` instance) |
| 18 | `map-dims` | **core (family: dims)** | drop the global single-size constraint; profile declares per-map dims |
| 19 | `map-legend-ref` | **core (family: broken-ref)** | generic legend→tile resolution |
| 20 | `map-meta` | **profile** | doormat = tile 46 is domain magic; move to profile |
| 21 | `overworld-ref` | **profile** | npc/trainer/warp graph is domain |
| 22 | `player-ref` | **profile** | starter/inventory are domain |
| 23 | `tileart-ref` | **core (family: broken-ref + range)** | id range 16–63 is profile/platform |
| 24 | `tileart-dims` | **core (family: dims)** | profile declares `8×8` |
| 25 | `text-valid` | **core** | generic |
| 26 | `sfx-valid` | **core (family: range)** | freq>0, dur 0–5 are profile/platform bounds |
| 27 | `economy-bounds` | **profile** | catchBase/catchScale is domain |
| 28 | `dead-token` | **core (family)** | generic engine-sync |

## Summary

- **Core machinery (rule families):** `frontmatter-present`, `required-fields`, `version-valid`, `profile-known`, `section-order`, `broken-ref`, `dims`, `range`, `dead-token`, `text-valid`, `no-drift`.
- **Everything genre-specific** (type charts, moves, evolution, trainers, encounters, catch rates, doormats, starters) becomes **data in `profiles/monster-rpg.*`**, consumed by the core families.

## The refactor in one sentence

Replace ~18 hardcoded rule functions with **~10 generic rule families** that read a **profile descriptor** (token schema + reference graph + bounds + dimensions + section order). The monster-RPG behavior is preserved exactly — it just becomes the first profile instead of the protocol.
