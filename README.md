# Dune Punk

A full-application cyberpunk theme collection for the [Dune IDE](https://dune.you), built on the
palette of [Daemon 2.0](https://github.com/MathisP75/daemon-kde-mk2) — the Cyberpunk 2077 KDE
theme. It isn't just editor colors: the whole workbench becomes a neon HUD with chamfered corner
brackets, cut-corner segment blocks, 1px neon card outlines, a scanline canvas, uppercase chrome
type, and a matching file icon theme.

| Theme | Look |
|---|---|
| **Dune Punk Daemon** | Faithful Daemon 2.0 — the red Aurorae title band with ink type, burgundy night, red neon outlines, pale type, slate-teal for anything active, Konsole terminal colors |
| **Dune Punk Netrunner** | Deep-net black, cyan ICE lines, magenta accent, a slow rail pulse |
| **Dune Punk Arasaka** | Indigo-black surfaces, red frames, a deep red header bar, yellow accent |
| **Dune Punk Samurai** | The 2077 HUD — a yellow command bar with dark type, red accent, cyan data |

Plus two icon themes (≈100 SVGs each):

- **Dune Punk Icons** (`dune-punk-icons`): color-coded cut-corner hex badges and chamfered tab folders.
- **Dune Punk Circles** (`dune-punk-circles`): the Daemon-Icons look — monochrome cyan line glyphs
  in rings, expanded folders filled.

Daemon references: the [Aurorae decorations](https://www.opendesktop.org/p/2213955/),
[color scheme](https://www.opendesktop.org/p/2213953/), [Plasma style](https://www.opendesktop.org/p/2213923/),
[Kvantum theme](https://www.opendesktop.org/p/2211151/), [icon theme](https://www.opendesktop.org/p/2213960/),
and [Konsole colors](https://www.opendesktop.org/p/2214176/).

## Install

From [Open VSX](https://open-vsx.org/extension/spacedevin/dune-punk):

```sh
dune --install-extension spacedevin.dune-punk
```

In VS Code, VSCodium or Cursor, search the extensions view for **Dune Punk**.

### What you get where

| | Dune | VS Code / VSCodium / Cursor |
|---|---|---|
| Editor, syntax, terminal, git, diff colors | ✓ | ✓ |
| Workbench colors (side bar, tabs, status bar, menus, inputs) | ✓ | ✓ |
| Icon themes (`dune-punk-icons`, `dune-punk-circles`) | ✓ | ✓ |
| Chamfered frames, Kvantum buttons / inputs / tabs, title band, scanlines, motion | ✓ | — |
| Transparent window, per-panel accent edges (Edgerunner) | ✓ | — |

The Dune-only parts live in `dune.*` color keys and top-level theme fields that other editors ignore.

## Publishing

Tag a release (`git tag v0.1.1 && git push --tags`); the **Publish** workflow builds, packages and
publishes to Open VSX with the `OVSX_PAT` repository secret. Locally: `OVSX_PAT=… npm run publish:ovsx`.

For local development:

```sh
npm run dev-install   # builds, then copies into ~/.dune/extensions/dune.dune-punk
```

Reload the Dune window, then pick a theme in **Settings → Appearance** (or `workbench.colorTheme`)
and the icons via `workbench.iconTheme: "dune-punk-icons"` (or `"dune-punk-circles"`).

Typography follows Daemon's recommended setup: [Rajdhani](https://fonts.google.com/specimen/Rajdhani)
for the UI and [Hack](https://sourcefoundry.org/hack/) for code. Dune themes can name a font but not
ship one, so install both; without Rajdhani the UI falls back to the system font. Set the editor and
terminal font yourself, since themes can't:

```jsonc
"editor.fontFamily": "Hack, Menlo, monospace",
"terminal.integrated.fontFamily": "Hack, Menlo, monospace"
```

In plain VS Code or Cursor the themes still work as ordinary color themes (editor, terminal,
syntax, workbench colors); the structural chrome appears in Dune, which exposes its geometry to
themes through the `dune.*` token namespace.

## Design notes

- **No radii.** Every corner is square or cut at 45°. Chamfers are drawn with linear-gradients on
  the tokens Dune renders as `background` (status segments, settings nav, rail, view headers,
  title-bar cards).
- **Outlines, not fills.** Parts are dark cards with a 1px neon border; saturated color is
  reserved for segment blocks, which carry dark type.
- **Frame.** The always-on corner images are chamfered brackets with a bold cap, thin arms, a
  barcode strip, and a hot square.
- **Motion.** Short, snappy HUD easing (90/180/280ms), a cursor-blink readout in the rail, and a
  square-wave blink on the problems item while errors exist. All of it is off under
  `prefers-reduced-motion`.
- **Every device shell.** Themes only supply tokens; Dune's own layout handles desktop, iPad,
  iPhone, and foldable postures, so the same theme applies everywhere.

## Build

```sh
node build.mjs
```

This regenerates `themes/*.json` and `icons/` from `palette.mjs` + `variants.mjs`, then validates:

- every `dune.*` key against Dune's `schemas/dune-theme-keys.json` (when the dune-ide checkout is
  at `~/Projects/dune/dune-ide`)
- every standard key is `#hex` (Dune drops anything else)
- WCAG AA contrast (4.5:1) on text, tab, title-bar, accent, and segment pairs

## License

MIT. Color assignments follow Daemon 2.0 by MathisP75 (GPL-3.0); no artwork from that project is
included. Fan work; not affiliated with CD PROJEKT RED.
