# GAME Protocol — Core Specification

> **Status:** draft · **Spec version:** `0.1` (semver) · **Lineage:** hybrid contract inspired by Google's `design.md`

## 0. What this is (read this first)

GAME Protocol is a **genre-agnostic format for declaring game content and balance as data**.

It is a **hybrid contract**: a single `GAME.md` file is *both*

- a **machine-enforceable data contract** (the YAML front-matter: tokens), and
- a **human-canonical design document** (the Markdown body: rationale, sections, do's & don'ts).

This dual nature is inherited from Google's `design.md` pattern: one file that the team reads as documentation and that tooling reads as a contract. The data and its explanation never drift apart because they live in the same file and are validated together.

**The protocol does not know what a "species" or a "tile" is.** Those belong to a *domain profile* (see §6). The core defines the file shape, the validation/compilation pipeline, the fallback contract, versioning, and extensibility — everything that is true regardless of genre.

```
GAME.md ──lint──> (valid?) ──export──> window.GAME ──consume──> engine (with embedded fallback)
   │                                                                  │
   └────────────── single source of truth ───────────────────────────┘
```

## 1. File format

`GAME.md` = YAML front-matter + Markdown body, separated by `---` fences.

```
---
# tokens: the machine-readable contract
version: 0.1
name: "My Game"
...
---

# Overview
...human-canonical documentation...
```

- **Front-matter (tokens):** the authoritative data. Edited here, *never* in generated output.
- **Body (Markdown):** canonical prose. Section order is enforced by the active profile, not by the core.

### 1.1 Supported YAML subset

The reference parser (`yaml-min.js`) supports, by design:

- block maps (2-space indent, arbitrary nesting)
- flow maps and flow lists (single line)
- scalars: number, boolean, string (quoted/unquoted)
- line comments (`# …`)

Not supported: block sequences (`- item`), anchors/aliases, multiline strings. In flow context, commas inside text must be quoted.

> **Known limitation.** This is a strict subset, not standard YAML. Implementations MAY swap in a full YAML parser; conformance only requires that the documented subset parses identically.

## 2. Core tokens (genre-agnostic)

Only these tokens are defined by the core. Everything else is profile-defined.

| Token | Type | Required | Meaning |
|---|---|---|---|
| `version` | string (semver) | yes | Spec version this file targets |
| `name` | string | yes | Game title |
| `description` | string | no | Free-text summary |
| `profile` | string | yes | Domain profile id (e.g. `monster-rpg`, `tower-defense`) |
| `platform` | object | no | Presentation target (mode, dimensions, etc.) — shape defined by profile |

A file with no `profile` is validated only against the core structural rules (§4).

## 3. Compilation contract

`game-export.js` transforms tokens into a single global object (`window.GAME`, or the platform-appropriate namespace). Two guarantees:

1. **Determinism.** Output is a pure function of the source. Same `GAME.md` → byte-identical output. CI rejects drift.
2. **Fallback contract.** The engine reads every key with an embedded default:

   ```js
   const X = (window.GAME && window.GAME.X) || /* embedded fallback */;
   ```

   If generated data is missing or partial, the game degrades gracefully instead of crashing.

The *set of derived keys* and how each is derived is defined by the profile, not the core.

### 3.1 CLI exit codes

Every CLI in `tools/` shares one exit-code contract (also shown by each `--help`):

| Code | Meaning | When |
|---|---|---|
| `0` | OK | The command succeeded (lint: 0 errors; export/manifest/schema: file written; render-png: PNG written). |
| `1` | Validation | `game-lint.js` only: the source parsed and loaded, but the linter found `error`-level findings. |
| `2` | Input / profile / syntax | File unreadable, front-matter missing or unparseable, `profile` unknown or unloadable, unknown CLI flag, or (for `render-png.js`) a generated file whose profile the renderer does not support. |

`game-export.js`, `game-manifest.js`, `game-schema.js`, `build-standalone.js`, and `render-png.js` never emit `1`: they either produce output (`0`) or fail on input/profile/syntax (`2`). Only `game-lint.js` distinguishes "ran but found problems" (`1`) from "could not run" (`2`). Scripts that consume these CLIs can rely on this table.

**Usage notes.**

- Every CLI accepts `--help` / `-h` (prints usage + the exit-code line above and exits `0`) and rejects unknown flags with a clear `flag desconocido` message on stderr (exit `2`).
- `game-lint.js` prints a JSON report on stdout. A non-existent file exits `2` (`No se pudo leer <file>`); a parseable file with a broken front-matter exits `1` and the report contains a `parse-error` finding; an unknown/invalid `profile` exits `1` with a `profile-known` (unknown id) or `profile-load-error` (invalid id / broken syntax) finding.
- `game-export.js` writes the generated artifact only on success (`0`). A non-existent source, unparseable front-matter, or an unknown/invalid profile all exit `2` with a one-line stderr message; no artifact is written.
- `build-standalone.js` inlines every local `<script src="...">` (relative path resolved against the HTML file's directory) and leaves `http(s)://` CDN scripts untouched. A missing input file or a missing local script exits `2`; the latter still reports `externos sin inlinar` so the build is auditable.
- `render-png.js` only supports the `adventure` profile (it reads `G.SCENE.tilemap`/`attrs`). A generated file of another profile, a missing `genFile`, or a `genFile` outside `examples/` exits `2` with an actionable message (not a raw `TypeError`).
- All exit codes are verified by `test/cli-errors.js` (run in CI).

## 4. Core validation rules (genre-agnostic)

These rules apply to **every** `GAME.md` regardless of profile. Profiles add their own (§6).

| Rule | Level | Description |
|---|---|---|
| `frontmatter-present` | error | `---` fences present and parseable |
| `required-fields` | error | `version`, `name`, `profile` exist |
| `profile-known` | error | `profile` resolves to a loadable profile (emitted by `lintGame` when `opts.profileId` is passed but no profile loaded) |
| `version-migration` | warn/error | `version` vs the spec version supported by the tooling (`profile.specVersion`, core default `0.1`): **warn** if the GAME.md is older (file `<` supported → consult `MIGRATION.md`); **error** if the GAME.md is newer than the tooling supports (file `>` supported → upgrade tooling) |
| `deprecated` | deprecated | A token/rule/profile marked `deprecated: {since, removedIn}` emits a lifecycle finding with `since`/`removedIn` (not an error; the rule still applies until `removedIn`) |
| `section-order` | error/warn | `##` sections match the order declared by the profile |
| `broken-ref` | error | Every cross-reference resolves to a declared token |
| `dims` | error | Matrix/grid tokens match their declared dimensions |
| `range` | error | Numeric tokens fall within declared bounds |
| `dead-token` | warn | Tokens not referenced by engine code (optional, via `GAME_ENGINE`) |
| `text-valid` | error | Declared text entries are non-empty strings |
| `no-drift` | error (CI) | Generated artifact matches current `GAME.md` |

> `broken-ref`, `dims`, `range` are **rule families**: the profile supplies *which* tokens they apply to and *what* the bounds/dimensions are. The core supplies the checking machinery.

> `profile-known` and `version-migration` are emitted by `lintGame` itself (not only by the CLI wrapper), so a direct consumer of the core (browser, other tool) that calls `lintGame(data, body, {profile, profileId})` receives them. The CLI wrapper still owns `profile-load-error` (a syntax error in a profile module), which requires filesystem access and does not belong in the isomorphic core.

## 5. Cross-validation with the engine (optional)

When `GAME_ENGINE` points at engine source, the linter can check synchronization between declared data and code (e.g. a token marked one way that the engine treats another, or balance keys the engine never reads). This is the core's `dead-token` family; profiles may extend it.

## 6. Domain profiles

A **profile** is a declarative description of a genre's vocabulary. It specifies:

1. **Token schema** — the tokens this genre adds (types, shapes, required/optional).
2. **Section order** — the canonical `##` sequence for the Markdown body.
3. **Reference graph** — which tokens reference which (drives the `broken-ref` family).
4. **Bounds & dimensions** — feeds the `range` and `dims` families.
5. **Derived keys** — how `export` turns tokens into the runtime object.
6. **Profile-specific rules** — checks that only make sense in this genre.

The core ships with **9 reference profiles** under `profiles/` (each a loadable `.js` module; `monster-rpg` and `tower-defense` also carry a human-readable `.md` companion). They exist to prove the core is genre-agnostic — every genre is expressed as a profile, never as a core change:

| Profile | Genre | Key derived keys (subset) |
|---|---|---|
| `profiles/monster-rpg.js` (`monster-rpg.md`) | creature-collector RPG | `SPECIES`, `TYPE_CHART`, `MOVES`, `EVOLUTIONS`, `ENCOUNTERS`, `MAPS`, `ECONOMY` |
| `profiles/adventure.js` | tile-based adventure / escape room | `SCENE`, `ENTITIES`, `PLAYER`, `TEXT`, `WIN` |
| `profiles/dungeon.js` | dungeon crawler | `SCENES`, `ANIMATE`, `PLAYER`, `TEXT`, `WIN` |
| `profiles/platformer.js` | 2D platformer | `TILESETS`, `ENEMIES`, `LEVELS`, `PHYSICS`, `SFX` |
| `profiles/crafting.js` | crafting / recipe tree | `MATERIALS`, `ITEMS`, `STATIONS`, `RECIPES` |
| `profiles/papers-please.js` | border-control / document inspection | `COUNTRIES`, `DOCUMENTS`, `RULES`, `ENTRANTS`, `DAYS` |
| `profiles/roguelike.js` | procedural roguelike | `GENERATOR`, `ENEMY_POOL`, `ITEM_POOL`, `PLAYER`, `WIN` |
| `profiles/voxel.js` | voxel / 3D structures | `MATERIALS`, `PREFABS`, `STRUCTURES`, `VOXELS` |
| `profiles/tower-defense.js` (`tower-defense.md`) | tower defense | `TOWERS`, `DMG_CHART`, `ENEMIES`, `ARMORS`, `WAVES`, `MAPS`, `ECONOMY`, `BALANCE` |

`monster-rpg` is the *first* application profile (the protocol grew out of a real mini-Pokémon engine), not the protocol itself. `tower-defense` was the second genre added, deliberately orthogonal to the first, to demonstrate that the core is genre-agnostic; the remaining seven broaden the coverage to platformer, crafting, document-inspection, roguelike and voxel genres.

> **Design intent.** If you can express a new genre as a profile without touching the core, the core is doing its job. If you cannot, that is a core bug.

## 7. Versioning & extensibility

- **Spec version** uses semver. During `0.x` (pre-`1.0`): **breaking changes bump the minor** (`0.1` → `0.2`), **fixes and additive changes are a patch** (`0.1.0` → `0.1.1`). At `1.0` the core tokens are **frozen**: every removal of a core token or rule is a major bump and must go through the deprecation policy (§7.1) first.
- **Profiles version independently** of the core; a `GAME.md` declares both (`version` for core, profile carries its own `specVersion`).
- **The linter migrates, not rejects.** The core rule `version-migration` compares `data.version` against `profile.specVersion` (core default `0.1`): a GAME.md written for an older version is a **warning** pointing at `MIGRATION.md`, not an error — old files keep linting clean while the author migrates. A GAME.md using a version newer than the tooling is an **error** (upgrade the tooling).
- **Extension fields** use an `x-` prefix and are ignored by validation, allowing experiments without forking the spec.

### 7.0 Semver by example

The two versioning regimes, concretely:

| Change | `0.x` (pre-`1.0`) | `1.0`+ (frozen core) |
|---|---|---|
| New token / section / rule (additive) | **patch** `0.1.0 → 0.1.1` | **minor** `1.0.0 → 1.1.0` |
| Fix / clarification (no shape change) | **patch** `0.1.0 → 0.1.1` | **patch** `1.0.0 → 1.0.1` |
| Rename / reshape a token or rule (breaking) | **minor** `0.1 → 0.2` (+ deprecation recommended) | **major** `1.0 → 2.0` (deprecation **mandatory** in `1.x` first) |
| Remove a core token / rule | **minor** `0.1 → 0.2` (deprecation recommended) | **major** `1.0 → 2.0` (deprecation **mandatory** in `1.x` first) |

Worked examples:

- **Add `BALANCE` to a profile (additive).** `0.x`: `0.1.0 → 0.1.1`; `1.0`+: `1.0.0 → 1.1.0`. Old `GAME.md` files keep linting clean (the new token is optional with a fallback).
- **Rename `MOVES` → `ACTIONS` (breaking).** `0.x`: bump to `0.2`, mark `MOVES` `deprecated: {since: 0.2, removedIn: 0.3}`, add `MIGRATION.md` recipe; `1.0`+: mark deprecated in `1.1` (`removedIn: 2.0`), actually remove in `2.0`.
- **Tighten a `range` bound from `1..99` to `1..50` (breaking, narrows valid inputs).** Treated as a reshape: same path as the rename row above. Files that used values in `51..99` must migrate.
- **Fix `version-migration` false positive (fix, no shape change).** `patch` in both regimes.

### 7.1 Deprecation policy

The protocol has a lifecycle: tokens, rules, and profiles can be **deprecated** (slated for removal) before they are **removed**. Deprecation is a contract between maintainers and authors — it says "this still works today, but migrate; it disappears in `removedIn`."

- **How to deprecate.** A profile rule is marked by attaching `rule.deprecated = { since, removedIn }` to the rule function. The linter emits a finding at the `deprecated` level:

  ```js
  function ruleOldX(ctx) { /* still validates... */ }
  ruleOldX.deprecated = { since: '0.1', removedIn: '1.0' };
  ```

  ```json
  { "level": "deprecated", "rule": "ruleOldX",
    "since": "0.1", "removedIn": "1.0",
    "msg": "regla deprecada: se remueve en 1.0 (desde 0.1)" }
  ```

- **The `deprecated` level is not an error.** It does not break the gate: a deprecated file still lints with `errors: 0`. This is the one-major grace period. The rule keeps applying (it still validates data) until `removedIn`; only the finding signals the lifecycle.

- **Semver contract for removal.**
  - A token/rule/profile deprecated at `since: S` is **supported through every release from `S` up to (but not including) `removedIn`**.
  - Example: a rule deprecated `since: 0.2`, `removedIn: 1.0` is supported in `0.2`–`0.9.x` and **becomes a hard error / is removed in `1.0`**.
  - During `0.x`, the actual removal is a **minor bump** (breaking, allowed pre-`1.0`). At `1.0`+, removal is a **major bump** and deprecation is **mandatory** the major before.

- **`manifest.json` exposes the lifecycle.** Each profile lists its `deprecatedRules: [{rule, since, removedIn}]`, and the top-level `migrations: { supported: [...], doc: 'MIGRATION.md' }` field declares which spec versions the current tooling supports and where the migration recipe lives.

- **Changelog: deprecation vs. breaking.**
  - A deprecation is logged under `### Deprecated` in `CHANGELOG.md` (`[Unreleased]`): "Rule `X` deprecated (`since`, `removedIn`); use `Y` instead."
  - The actual removal is logged under `### Removed` **and is a breaking entry** — bump minor in `0.x`, major in `1.0`. Never remove without a prior deprecation entry.


## 8. Design philosophy

1. **Hybrid contract** — one file is both the data contract and its canonical documentation (the `design.md` lineage).
2. **Core vs. profile** — the protocol is genre-agnostic; genres are profiles.
3. **Data, not logic** — the contract says *what*; the engine implements *how*.
4. **Single source of truth** — tokens edited once, never in generated output.
5. **Graceful fallback** — the game never breaks if generated data is missing.
6. **Determinism** — output is a pure function of source; CI rejects drift.
7. **Zero dependencies** — custom parser, pure Node CLI.
