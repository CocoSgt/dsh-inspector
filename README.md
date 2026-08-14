# dsh-inspector

[简体中文](README.zh-CN.md) | English

npm package: `dsh-inspector` · GitHub repository:
[CocoSgt/dsh-inspector](https://github.com/CocoSgt/dsh-inspector)

A third-party plugin for DeepSeek Harness (dsh): an "Instruction Files" panel on
the right side of the Web UI that shows — and manages — the instruction chain
actually in effect for the current session, in the harness's **real load
order**: global `$DSH_HOME/AGENTS.md` → project root → … → the session's cwd,
one directory level at a time — plus the status of the four skill roots. The
information architecture mirrors the official `dsh-agent-instructions`
discovery algorithm exactly: what you see is what the model gets.

Open a session whose workspace sits in a project directory, then toggle the
"Instruction Files" button in the session header; the panel follows the current
session's workspace directory automatically. The UI ships in Chinese and
English (follows the harness language preference).

## The instruction-chain model (matches the harness exactly)

The layers, deduplication, and status flags shown by the panel align with the
real behavior of `packages/context/agent-instructions`:

1. **Global layer**: `$DSH_HOME/AGENTS.md` (default `~/.dsh/AGENTS.md`). Only
   AGENTS.md is recognized; it applies to every session and always loads first.
2. **Project chain**: starting from the session cwd, the nearest ancestor
   containing `.git` is the project root (the cwd itself if none is found);
   **every directory level from the project root down to the cwd** is probed
   for 4 candidates: `AGENTS.md` and `CLAUDE.md` (base), plus
   `AGENTS.local.md` and `CLAUDE.local.md` (local overlays, by convention not
   committed). Every candidate that exists is loaded; within one directory,
   candidates whose content is identical after trimming surrounding whitespace
   are collapsed into the first one (the panel flags this as
   "Same as X · collapsed to one").
3. **Order is priority**: global → cwd goes broad to specific, and the model is
   told that more specific instructions win; the panel is ordered and annotated
   accordingly. When the byte budget overflows, the harness omits the broadest
   entries first; a single file over 1 MB is ignored outright (the panel flags
   it as "Over 1 MB · not loaded").
4. **Subdirectory injection is on demand**: instruction files in subdirectories
   below the cwd are not preloaded; they are injected as additional
   instructions only when the model reads or writes a file inside that
   subdirectory — the panel footnote explains this instead of mixing
   non-preloaded files into the chain.

**Why there is no hooks.json / .env / .sessions**: the hooks bridge is not
mounted by default and its `configPath` is required with no default file name
(it is deployment configuration, not a project file); `.env` and `.sessions`
are resolved against the **dsh launch directory** and take effect
process-wide, unrelated to the session workspace. Listing them as "project
files" would invite users to create files nothing ever reads, so they were
removed from the panel. Files of other agent tools (GEMINI.md, .cursorrules,
…) are not read by dsh and are equally absent.

## Features

- **Instruction-chain view**: one card per layer, tagged with its identity
  (Global · all sessions / Project root / Current working directory), listing
  existing candidate files with status chips (local/not committed, duplicate
  collapsed, oversized-ignored) plus last-write time and size.
- **In-place creation**: the "+ New" button on each layer card expands the
  missing candidates (AGENTS.md marked recommended, local candidates marked
  gitignore-suggested), pre-seeds a template — in the current UI language —
  and writes to disk only on save. Templates seed the editor only for files
  that do not exist yet; editing an existing file never re-templates it.
- **Editor dirty guard**: navigating back with unsaved changes offers
  "Save and go back / Discard changes / Keep editing" — nothing is dropped
  silently; an unsaved dot shows in the title bar; Cmd/Ctrl+S saves; after a
  save the panel notes that "updates are injected at the session's next step"
  (the harness reconciles and injects the change on the next step).
- **Skill directory status**: the four skill roots — project-level
  `.dsh/skills` and `.agents/skills`, user-level `~/.dsh/skills` and
  `~/.agents/skills` — with existence and skill counts (SKILL.md counting,
  depth- and entry-capped scan). Skill `SKILL.md`/flat `.md` files can be
  viewed and edited in place; skill files reached through symlinks write
  through to their source file by design.
- **Floating right panel**: registered on `shell.overlay` (additive list
  slot); the session-header toggle is registered on
  `conversation.session.header.utilities`; switching sessions follows the new
  workspace automatically.
- **Path safety**: read/write addresses are the quadruple
  `cwd + scope + dir + name`. `name` must hit the 4-candidate whitelist;
  `dir` must hit the project-chain directory set recomputed from the cwd at
  call time (the global layer accepts only AGENTS.md); skill-file access is
  limited to `.md` inside the two project skill roots or the two user skill
  roots; the resolved path is prefix-checked as defense in depth.
- **Bilingual UI (zh/en)**: dictionaries are registered into the harness
  locale service; the panel and toggle read the standard reactive `t` seat
  and re-render on language switch. User-visible host failures travel the
  wire as stable dot-codes (`read.err.missing`, `address.err.offChain`, …)
  with the Chinese text as fallback, and are localized client-side.

## Architecture

One npm package, two faces:

- **Host side** (`lib/index.js`, the package main entry): `ProjectFilesGateway`
  extends `TypertRemoteService` (from `@deepseek-ai/dsh-typert-protocol`) and
  exposes the six RPC endpoints `projectFiles/overview`, `readFile`,
  `readSkillFile`, `writeSkillFile`, `writeFile`, and `removeFile`, probing and
  writing the instruction chain directly with `node:fs`. Layer discovery
  (`.git` marker walk-up, candidate order, trimmed-content dedup, 1 MB cap)
  matches the harness. Under the third-party dual-copy scenario SRC discovery
  is blind, so a weak (src-json) manifest is also registered into the host
  typert registry. User-visible failures are returned as data (see above), not
  thrown.
- **Browser side** (`lib/client.js`, `exports["./client"]`): a closure-factory
  bundle. On startup it `$mount`s hand-written strict zod call descriptors onto
  `ctx.remote`, registers its zh/en dictionaries into `ctx.locale`, and then
  registers the React UI onto two slots (each registration declares
  `locale:` so components receive the `t` seat); the panel reads the current
  session's `cwd` from the `ctx.sessions` list snapshot.

The built `lib/` output is pre-built and committed with the repository, so git
installs need no build step.

## Install

Install from npm:

```sh
dsh plugin --profile web add dsh-inspector
```

All three dsh plugins can be added in one command:

```sh
dsh plugin --profile web add dsh-skills dsh-attachments dsh-inspector
```

GitHub fallback:

```sh
dsh plugin --profile web add github:CocoSgt/dsh-inspector
```

> Note: a self-built profile's `~/.dsh/profiles/<name>/package.json` must list
> `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app` in
> `dsh.profile.bundles`, otherwise startup hangs silently.

Restart `dsh web` afterwards. Uninstall:
`dsh plugin --profile web remove dsh-inspector`.

## Companion plugins

The other two plugins from the same suite:

- [dsh-skills](https://github.com/CocoSgt/dsh-skills)
  ([npm](https://www.npmjs.com/package/dsh-skills)) — a skill hub: aggregate
  skills scattered across Claude Code directories, projects, and `.skill`
  packages into one global library, invocable from the "/" menu.
- [dsh-attachments](https://github.com/CocoSgt/dsh-attachments)
  ([npm](https://www.npmjs.com/package/dsh-attachments)) — bring any file
  into the conversation as cards above the composer; the model reads images
  by path via `read_image`, so even non-vision models are never blocked.

## Usage

1. Open a session whose workspace is a project directory (pick the directory
   when creating the session, or restore an old one).
2. Click the "Instruction Files" button in the session header; the panel opens
   on the right with the workspace path at the top.
3. The panel lists the instruction chain in load order; click a file to edit
   it, or "+ New" to create a missing candidate in place; deletion asks for
   confirmation and going back with unsaved changes raises the dirty guard.

With no current session (or a session without a workspace directory), the
panel prompts to open a project session.

## Known limitations

- The panel is a fixed floating right column in `shell.overlay`, not a
  draggable native pane; the width is fixed at `min(440px, 92vw)`.
- The host trusts the session cwd sent by the browser (a local-panel use
  case); the cwd must be an existing absolute directory path, but it is not
  checked against dsh's workspace list.
- "In effect" is inferred from existence + harness rules (dedup/size cap);
  the session's actual byte-budget truncation (64 KB baseline) is not
  reflected in the panel.
- The on-demand injection state of subdirectories below the cwd (which have
  been touched and injected) is not shown; only the footnote explains it.
- The editor is a plain textarea, with no Markdown preview or syntax
  highlighting.
- The panel does not watch the file system; returning from the edit view
  re-fetches, but external changes during editing are not synced live.

## Development

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsc (host side, downleveled decorators) + tsdown (browser bundle)
```

Source layout:

```
src/
  index.ts         Host-side gateway service (@Remote methods = RPC endpoints
                   + weak manifest registration + failure-code protocol)
  scoped-files.ts  Instruction-chain model and shared types (candidate list,
                   layers, overview shapes, FailureStatus)
  client/
    index.ts       Browser plugin body ($mount + dictionary registration +
                   slot registration)
    locales.ts     zh/en dictionaries (zh is the key-set source of truth;
                   UI copy, creation templates, and host failure codes)
    descriptors.ts Hand-written strict call descriptors (zod)
    panel.tsx      Instruction-chain panel, editors, and header toggle
    store.ts       Panel open/close and edit-target state
    styles.ts      Injected CSS (dsi- prefix, --dsw-alias-* design tokens)
    types.ts       Minimal client-side service type surface (incl. locale)
```

Note: the host-side methods' **parameter names are the RPC wire field names**
(the Gateway SRC mode reads them via `Function.prototype.toString`), so public
methods keep the plain-identifier parameter form and builds must not minify
parameter names (this repository's build does not minify). The RPC method is
named `removeFile`, not `remove`: `remove` is already taken on the client
namespace service's prototype, and a name clash would be rejected by the
gateway at mount time.

## License

MIT
