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

> **Known limitation.** This is a strict subset, not standard YAML. Implementations MAY swap in a full YAML parser; conformance only requires that the documented subset parses identically (see the grammar in §1.2).

### 1.2 Formal grammar (normative)

The subset, as an EBNF-style grammar. This — not the reference parser's source — is the normative definition; `test/parser.js` is its executable companion.

```ebnf
document   = { line } ;
line       = blank | comment | pair-line ;
blank      = { sp } eol ;
comment    = { sp } "#" { any } eol ;
pair-line  = indent key ":" ( sp value | "" ) eol [ children ] ;
children   = { pair-line }        (* every child strictly more indented than its parent;
                                     siblings share the first child's indent; depth <= 64 *)
key        = scalar ;             (* no top-level ":"; unique within its block;
                                     never __proto__ / constructor / prototype *)
value      = flow-map | flow-list | scalar ;
flow-map   = "{" [ pair { "," pair } ] "}" ;
pair       = key ":" value ;      (* the ":" is the first top-level one outside quotes *)
flow-list  = "[" [ value { "," value } ] "]" ;
scalar     = quoted | number | boolean | plain ;
quoted     = '"' { char } '"' | "'" { char } "'" ;   (* commas and ":" allowed inside *)
number     = valid JS decimal ;   (* leading-zero integers ("007") stay strings *)
boolean    = "true" | "false" ;
plain      = unquoted text ;      (* in flow context: no top-level "," or ":" *)
```

Semantics and hard failures (MUST raise a clear parse error, never degrade silently):

- Indentation is spaces only; a **TAB in indentation** is an error. A line indented deeper than its block without an opening parent (**over-indentation**) is an error.
- **Block sequences** (`- item`) are not part of the subset — lists are flow-only (`[a, b]`).
- A front-matter line without a top-level `:`, a **duplicate key** within a block, an **unclosed quoted string**, a flow pair without `:`, nesting **deeper than 64 levels**, and the three forbidden keys are all errors.
- `\r\n` / `\r` line endings are normalized to `\n` before parsing. Line comments are stripped only on their own line — a `#` after a flow value is **not** a comment (it becomes part of the last scalar; see `tools/SPRITE_EXTRACTION.md`).

## 2. Core tokens (genre-agnostic)

Only these tokens are defined by the core. Everything else is profile-defined.

| Token | Type | Required | Meaning |
|---|---|---|---|
| `version` | string (semver) | yes | Spec version this file targets |
| `name` | string | yes | Game title |
| `description` | string | no | Free-text summary |
| `profile` | string | **yes** (since `2.0.0`; `≤1.x` had a deprecated CLI fallback) | Domain profile id (e.g. `monster-rpg`, `tower-defense`) |
| `platform` | object | no | Presentation target (mode, dimensions, etc.) — shape defined by profile |

**`profile` in practice.** `profile` is mandatory. When the token is missing, no profile descriptor is resolved: the file is validated only against the core structural rules (§4) and `required-fields` reports the missing `profile` as an **error** (`game-lint.js` exits `1`); `game-export.js` exits `2` without writing an artifact. A *loaded* profile supplies its own `required` list — the reference profiles use `['version', 'name']`, which is safe because a profile can only load when the token is present.

**History.** Up to `1.x` the reference CLI fell back to `monster-rpg` when the token was missing (backward compatibility with the original monster-rpg engine). The fallback was deprecated in `1.3.0` (`profile-fallback`, full §7.1 lifecycle) and **removed in `2.0.0`**. Migration recipe: `MIGRATION.md` (De 1.x → 2.0.0).

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
| `required-fields` | error | `version`, `name` exist — plus `profile` when no profile descriptor is resolved; a loaded profile supplies its own `required` list (see §2) |
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

> `broken-ref`, `dims`, `range` (and `enum`) are **rule families**: the profile supplies *which* tokens they apply to and *what* the bounds/dimensions/values are. The core supplies the checking machinery. All four are **declarative tables** in the profile descriptor (§6.1): `refs` (broken-ref; `msg` optional — the core generates a default message), `bounds` (range: `gt`/`min`/`max`/`integer`/`required` over collection or singleton fields), `dims` (fixed-shape matrices) and `enums` (closed value sets). Non-uniform logic stays in `rules` functions — a profile that needs none of them can ship as pure data (§6.1, §11).

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

> **Tenth profile.** `profiles/advance-wars.js` serves the GBA sprite-extraction pipeline (`tools/SPRITE_EXTRACTION.md`): its vocabulary is `palettes` (16 BGR555-quantized colors, `[r,g,b]` in `0..31`) and `units` (4bpp tiles: a `height`×`width` matrix of nibbles `0..15` indexing the palette). Rules: `palette-color-range`, `unit-palette-ref`, `unit-dims`, `unit-tiledata-range`. Derived keys: `PALETTES`, `UNITS`. Its one reference (`units.*.palette` → numeric `palettes` keys) is validated in `rules`, not `refs` — same reason as `armors` in tower-defense (the broken-ref family matches string keys).

> **Eleventh profile (pure-data).** `profiles/quiz.json` is the **data-only reference profile** (§6.1): no functions — loaded with `JSON.parse`, never executed (§10) — validating entirely through the declarative families (`refs` with default messages, `bounds`, `enums`). It exists to prove a genre can be a pure-data contract.

> Further application profiles follow the same two patterns (`.js` with code under review, or data-only `.json`); **`manifest.json` is the canonical list** — this section documents the nine reference profiles plus the pattern, not an exhaustive inventory.

> **Design intent.** If you can express a new genre as a profile without touching the core, the core is doing its job. If you cannot, that is a core bug.

### 6.1 Profile descriptor contract (normative)

A profile module exports one object. Its shape is validated on load (`validateProfile` in `tools/profile-helpers.js`); a malformed descriptor is reported as `profile-load-error` with the offending entry, never as a runtime `TypeError` mid-lint.

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | string | yes | kebab-case (`/^[a-z0-9-]+$/`); must match the filename |
| `specVersion` | string | no | spec version the profile targets (feeds `version-migration`) |
| `sections` | string[] | no | canonical `##` order for the body |
| `required` | string[] | no | front-matter tokens `required-fields` demands |
| `refs` | entry[] | no | each: `{ rule, level, src, target: { collection, allow? }, msg?(), optional? }` — broken-ref family; `msg` omitted → core default message |
| `bounds` | entry[] | no | each: `{ rule, level?, collection\|singleton, field, gt?, min?, max?, integer?, required?, msg?() }` — range family |
| `dims` | entry[] | no | each: `{ rule, level?, collection, shape: [h, w] }` — dims family |
| `enums` | entry[] | no | each: `{ rule, level?, collection\|singleton, field, values: [..], required? }` — closed value sets |
| `grids` | entry[] | no | each: `{ rule, emptyRule?, level?, collection\|singleton, rowsField?, legendField?, fillField?, shape?: { singleton, rowsField?, colsField? }, legend?: { rule, level?, tileField?, tileTarget: { collection, allow? }, palField?, palMax? } }` — grid/legend family (§11): without `shape`, validates uniform row width (`rule`) and empty rows (`emptyRule`, defaults to `rule`) self-consistently (against the grid's own first row); with `shape`, validates row/col count against another singleton's fields instead (e.g. `platform.rows`/`.cols` for `monster-rpg`/`tower-defense` maps) and does not treat empty rows as an error on its own. Either way, each legend/fill symbol's `tile` (and optional `pal`) is checked against a target collection |
| `rules` | function[] | no | non-uniform logic; each `fn(ctx)`, may carry `fn.deprecated = { since, removedIn }` (§7.1) |
| `derive` | entry[] | no | each: `{ key, from \| value \| fn(data, helpers) }` — compilation table, in output order |

**Trust note:** `refs`/`bounds`/`dims`/`enums`/`derive` are data, but `rules` and `derive.fn` are **executable code** — see §10.

**Pure-data profiles.** A descriptor with no functions at all (`rules: []`, no `derive.fn`, no `refs[].msg`) MAY be shipped as **`profiles/<id>.json`**: the CLIs load it with `JSON.parse` — **no code is ever executed** — making it safe to consume from untrusted sources (§10). `profiles/quiz.json` is the reference pure-data profile; `manifest.json` marks such profiles with `dataOnly: true`. Resolution order: `<id>.js` first, then `<id>.json`.

`test/profile-descriptor.js` is the executable reference: every shipped profile MUST validate, and each malformed shape MUST produce an actionable message.

## 7. Versioning & extensibility

- **Spec version** uses semver. During `0.x` (pre-`1.0`): **breaking changes bump the minor** (`0.1` → `0.2`), **fixes and additive changes are a patch** (`0.1.0` → `0.1.1`). At `1.0` the core tokens are **frozen**: every removal of a core token or rule is a major bump and must go through the deprecation policy (§7.1) first.
- **Profiles version independently** of the core; a `GAME.md` declares both (`version` for core, profile carries its own `specVersion`).
- **The linter migrates, not rejects.** The core rule `version-migration` compares `data.version` against `profile.specVersion` (core default `0.1`): a GAME.md written for an older version is a **warning** pointing at `MIGRATION.md`, not an error — old files keep linting clean while the author migrates. A GAME.md using a version newer than the tooling is an **error** (upgrade the tooling).
- **Extension fields** use an `x-` prefix and are ignored by validation, allowing experiments without forking the spec. They are **not** copied into the compiled artifact — compilation emits only the universal meta plus the profile's `derive` keys — but a profile MAY expose one explicitly (a `derive` entry can read any token, `x-` included). Tools that rewrite a `GAME.md` (migrators, formatters, agent editors) MUST preserve `x-` and other unknown tokens (see §9, round-trip).

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

## 9. Conformance

GAME Protocol distinguishes the **reference implementation** (`tools/`) from the protocol itself. An alternative implementation is **conformant** if it satisfies all of the following:

1. **Parser.** It parses the YAML subset of §1.1 identically to the reference parser, including the hard-failure cases: block sequences (`- item`), front-matter lines without `:`, duplicate keys, unclosed strings, tab indentation, over-indentation, nesting deeper than 64 levels, and the forbidden keys `__proto__`/`constructor`/`prototype`. `test/parser.js` is the executable definition of these cases. Implementations MAY substitute a full YAML parser as long as the documented subset parses identically.
2. **Linter.** It emits the core rules of §4 at the documented levels, executes the active profile's reference graph (`refs`, broken-ref family) and rule functions, and reports findings as `{level, rule, msg}` (plus `since`/`removedIn` at the `deprecated` level). A document is valid iff it produces zero `error`-level findings. `test/conformance.js` is the executable reference: every valid example MUST lint clean and every invalid case MUST trigger its rule.
3. **Compiler.** Its output is a pure function of the source (§3). For the reference artifact format (`window.GAME` as JSON), output MUST be byte-identical to `tools/game-export.js`: universal meta first (`generatedFrom`, `profile`, `name`, `description`, `platform`, `palettesCount`), then the profile's `derive` keys in declaration order, serialized as JSON with 2-space indent and LF line endings. The `profile` meta key lets multi-profile consumers dispatch a runtime without key-sniffing heuristics.
4. **Exit codes.** CLI surfaces follow the §3.1 contract (`0` OK / `1` validation, lint only / `2` input, profile or syntax). `test/cli-errors.js` is the executable reference.
5. **Tolerance.** A conformant consumer MUST NOT reject a document because of: `x-` extension tokens or other unknown top-level tokens; findings at the `warn` or `deprecated` level (including an older `version`, §7); or Markdown body content beyond what `section-order` checks.
6. **Round-trip.** A tool that rewrites a `GAME.md` (migrator, formatter, agent editor) MUST preserve tokens it does not understand — `x-` extensions and unknown keys included. Lossy rewriting breaks the experimentation contract of §7.

Points 1–4 are the strict half of the contract (the gate); points 5–6 are the permissive half (what must *not* be enforced). Both halves are normative.

## 10. Security & trust model

Two trust levels exist in the pipeline, and they must not be confused:

1. **`GAME.md` documents are untrusted input.** The tooling MUST be safe to run on a document from anywhere. The reference parser enforces this: forbidden keys (`__proto__`/`constructor`/`prototype`) block prototype pollution; the 64-level depth guard blocks stack-exhaustion input; every malformed construct fails fast with a parse error instead of degrading (§1.2). Neither lint nor export ever evaluates document content as code.
2. **JS profiles are executable code and therefore trusted like a dependency.** `rules` functions and `derive.fn` run with full process privileges. The profile id regex (`/^[a-z0-9-]+$/`) prevents path traversal into arbitrary modules, and §6.1 validates the descriptor's *shape* — but neither can vet what a rule function *does*. **Review a third-party `.js` profile before installing it, exactly as you would review a dependency.**
3. **Pure-data profiles (`.json`, §6.1) are safe to load from third parties.** They are parsed, never executed: the worst a malicious `quiz.json` can do is emit wrong findings or derive wrong keys. This is the supported path for community profiles; `.js` profiles remain in-repo under CODEOWNERS review.

Additional hardening in the reference tools: `render-png.js` loads generated artifacts via `require()` confined to `examples/` (no `eval`/`new Function`, path-checked against traversal); `GAME_ENGINE` cross-checks read engine source as **text** (tokenized, never executed); generated artifacts are written only after a successful compile, never partially.

## 11. Future directions (non-normative)

Documented so the trade-offs are explicit; none of this is part of `0.1`:

- **Multi-file bundles.** The single-file design (§0) is deliberate — one artifact, no drift between data and doc — but it has known costs at scale: inline art dominates large documents (mitigated, not solved, by the compact hex form) and single-file merges conflict. The designated evolution path is an OKF-style bundle (directory tree, concept-id = path, bundle-relative links), keeping the strict gate over the whole tree. This becomes worth its complexity only when real documents outgrow one file.
- **Pure-data rules — second stage shipped.** The `enums` family, optional `refs[].msg`, JSON profile loading and now the `grids` family (§6.1 — uniform row width or external `shape`, plus legend/fill tile+palette resolution) already make *simple* profiles fully data-only (`profiles/quiz.json` is the reference; `adventure`/`dungeon` moved their scene-grid checks and `monster-rpg`/`tower-defense` moved their map-grid checks to `grids`). What remains is growing cross-collection aggregates (e.g. dungeon's `warp.locked` requiring *some* pickup, across all scenes, to grant the item) until complex genres fit without `rules` functions.
