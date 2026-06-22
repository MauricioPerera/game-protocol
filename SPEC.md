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

## 4. Core validation rules (genre-agnostic)

These rules apply to **every** `GAME.md` regardless of profile. Profiles add their own (§6).

| Rule | Level | Description |
|---|---|---|
| `frontmatter-present` | error | `---` fences present and parseable |
| `required-fields` | error | `version`, `name`, `profile` exist |
| `profile-known` | error | `profile` resolves to a loadable profile (emitted by `lintGame` when `opts.profileId` is passed but no profile loaded) |
| `version-compatible` | error | `version` matches the spec version supported by the tooling (`profile.specVersion`, core default `0.1`) |
| `section-order` | error/warn | `##` sections match the order declared by the profile |
| `broken-ref` | error | Every cross-reference resolves to a declared token |
| `dims` | error | Matrix/grid tokens match their declared dimensions |
| `range` | error | Numeric tokens fall within declared bounds |
| `dead-token` | warn | Tokens not referenced by engine code (optional, via `GAME_ENGINE`) |
| `text-valid` | error | Declared text entries are non-empty strings |
| `no-drift` | error (CI) | Generated artifact matches current `GAME.md` |

> `broken-ref`, `dims`, `range` are **rule families**: the profile supplies *which* tokens they apply to and *what* the bounds/dimensions are. The core supplies the checking machinery.

> `profile-known` and `version-compatible` are emitted by `lintGame` itself (not only by the CLI wrapper), so a direct consumer of the core (browser, other tool) that calls `lintGame(data, body, {profile, profileId})` receives them. The CLI wrapper still owns `profile-load-error` (a syntax error in a profile module), which requires filesystem access and does not belong in the isomorphic core.

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

The core ships with reference profiles under `profiles/`:

- `profiles/monster-rpg.md` — the original creature-collector vocabulary (species, types, moves, evolution, trainers, encounters, catch rates). This is the *first* application profile, not the protocol itself.
- `profiles/tower-defense.md` — a second genre, included to demonstrate that the core is genre-agnostic.

> **Design intent.** If you can express a new genre as a profile without touching the core, the core is doing its job. If you cannot, that is a core bug.

## 7. Versioning & extensibility

- **Spec version** uses semver. Breaking changes to core tokens or pipeline bump the major.
- **Profiles version independently** of the core; a `GAME.md` declares both (`version` for core, profile carries its own).
- **Extension fields** use an `x-` prefix and are ignored by validation, allowing experiments without forking the spec.

## 8. Design philosophy

1. **Hybrid contract** — one file is both the data contract and its canonical documentation (the `design.md` lineage).
2. **Core vs. profile** — the protocol is genre-agnostic; genres are profiles.
3. **Data, not logic** — the contract says *what*; the engine implements *how*.
4. **Single source of truth** — tokens edited once, never in generated output.
5. **Graceful fallback** — the game never breaks if generated data is missing.
6. **Determinism** — output is a pure function of source; CI rejects drift.
7. **Zero dependencies** — custom parser, pure Node CLI.
