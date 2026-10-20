#!/usr/bin/env node
// Generate the Dune Punk theme JSONs + icon theme from the Daemon 2.0 palette.
// One source of truth: edit palette.mjs / variants.mjs (or the templates below), run `node build.mjs`.
//
// Daemon / Cyberpunk 2077 HUD grammar encoded here:
//   - no rounded corners anywhere; corners are CUT at 45° (chamfers drawn with linear-gradients)
//   - 1px neon outlines around dark cards (Daemon outlines, it doesn't fill)
//   - corner brackets with barcode ticks frame the window (always-on frame-corner images)
//   - saturated segment blocks carry dark type; light type lives only on dark surfaces
//   - chrome labels are condensed UPPERCASE with wide tracking; content keeps its case
//   - motion is short and snappy (HUD hover), plus a cursor-blink readout and an alert blink
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { D, a, mix, enc, contrast } from "./palette.mjs";
import { VARIANTS } from "./variants.mjs";
import { buildIcons } from "./icons.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const T = "#00000000";

// Tokens can't carry media queries, so viewport math does it: `len` at/above Dune's phone breakpoint
// (width >= 600 and height >= 500, agentForwardLayout.tish PHONE_MEDIA_QUERY), 0 on phones.
const notPhone = (len) => `clamp(0px, min(100vw - 599px, 100vh - 499px) * 1000, ${len})`;

// Both-corner chamfer (top-left + bottom-right), the signature 2077 block.
const cut = (c, s = 7) =>
  `linear-gradient(135deg, transparent 0 ${s}px, ${c} ${s}px calc(100% - ${s}px), transparent calc(100% - ${s}px))`;
// Single bottom-right chamfer.
const cutBR = (c, s = 9) => `linear-gradient(315deg, transparent 0 ${s}px, ${c} ${s}px)`;
// Left neon stripe (rail / nav marker).
const stripe = (c, w = 3) => `linear-gradient(90deg, ${c} 0 ${w}px, transparent ${w}px)`;
// Solid corner-marker triangle on a square card.
const marker = (c, deg = 135, s = 6) => `linear-gradient(${deg}deg, ${c} 0 ${s}px, transparent ${s}px)`;

// Kvantum frame: 1px outline chamfered top-left + bottom-right, a solid tick in each cut corner.
// Inner fill inset 1px; the outer cut sits 0.4px further out so the diagonal edge stays 1px wide.
const kbox = (border, fill, s = 6, tick = border) => {
  const o = s + 0.4;
  return [
    `linear-gradient(135deg, ${tick} 0 3px, transparent 3px)`,
    `linear-gradient(315deg, ${tick} 0 3px, transparent 3px)`,
    `linear-gradient(135deg, transparent 0 ${s}px, ${fill} ${s}px calc(100% - ${s}px), transparent calc(100% - ${s}px)) 1px 1px / calc(100% - 2px) calc(100% - 2px) no-repeat`,
    `linear-gradient(135deg, transparent 0 ${o}px, ${border} ${o}px calc(100% - ${o}px), transparent calc(100% - ${o}px))`
  ].join(", ");
};

// Kvantum push button: 1px outline with only the bottom-right corner cut, plus Daemon's 3px red bar
// riding the left edge (60% height, centred). Fill inset 1px so the outline stays a crisp line.
const boxBR = (border, fill, s = 7) => {
  const o = s + 0.4;
  return [
    `linear-gradient(315deg, transparent 0 ${s}px, ${fill} ${s}px) 1px 1px / calc(100% - 2px) calc(100% - 2px) no-repeat`,
    `linear-gradient(315deg, transparent 0 ${o}px, ${border} ${o}px)`
  ].join(", ");
};
// Kvantum push button, as in the Daemon widget gallery: a detached full-height bar on the left (3px,
// 2px gap), then ONE-colour 1px outline with the bottom-right corner cut; optional solid corner tick.
const kbtn = (bar, border, fill, tick) => [
  ...(tick ? [`linear-gradient(315deg, ${tick} 0 4px, transparent 4px)`] : []),
  `linear-gradient(${bar}, ${bar}) 0 0 / 3px 100% no-repeat`,
  `linear-gradient(315deg, transparent 0 7px, ${fill} 7px) 6px 1px / calc(100% - 7px) calc(100% - 2px) no-repeat`,
  `linear-gradient(315deg, transparent 0 7.4px, ${border} 7.4px) 5px 0 / calc(100% - 5px) 100% no-repeat`
].join(", ");
// Kvantum checkbox: four corner brackets (5px arms, 1.5px), and an X for the checked state.
const brackets = (c) => {
  const g = `linear-gradient(${c}, ${c})`;
  return [
    `${g} left top / 5px 1.5px no-repeat`, `${g} left top / 1.5px 5px no-repeat`,
    `${g} right top / 5px 1.5px no-repeat`, `${g} right top / 1.5px 5px no-repeat`,
    `${g} left bottom / 5px 1.5px no-repeat`, `${g} left bottom / 1.5px 5px no-repeat`,
    `${g} right bottom / 5px 1.5px no-repeat`, `${g} right bottom / 1.5px 5px no-repeat`
  ].join(", ");
};
const xmark = (c) =>
  `linear-gradient(45deg, transparent calc(50% - 1px), ${c} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 3px 3px / calc(100% - 6px) calc(100% - 6px) no-repeat, ` +
  `linear-gradient(-45deg, transparent calc(50% - 1px), ${c} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 3px 3px / calc(100% - 6px) calc(100% - 6px) no-repeat`;
// Kvantum tab: teal fill, cyan outline (open at the bottom), bottom-left cut, solid tick top-right.
const ktab = (border, fill) => [
  `linear-gradient(225deg, ${border} 0 5px, transparent 5px)`,
  `linear-gradient(45deg, transparent 0 7px, ${fill} 7px) 1px 1px / calc(100% - 2px) calc(100% - 1px) no-repeat`,
  `linear-gradient(45deg, transparent 0 7.4px, ${border} 7.4px)`
].join(", ");

// Daemon buttons are dark outlined cards: frame border, accent label (body text if the accent
// can't hold 4.5:1 on the dark fill).
const btnFg = (p) => (contrast(p.accent, p.button ?? p.widget) >= 4.5 ? p.accent : p.text);

// Barcode ticks (a nod to Daemon's barcode assets): [x, width] pairs inside the bracket's top arm.
const BARCODE = [[52, 1.5], [55, 0.8], [57, 2.4], [61, 0.8], [63, 1.2], [66, 2.4], [70, 0.8], [72, 1.5], [75, 0.8], [77, 3], [82, 0.8], [84, 1.5]];

function cornerSvg(p, mirror) {
  const y = (v) => (mirror ? 160 - v : v);
  const pts = (list) => list.map(([x, yy]) => `${x} ${y(yy)}`).join(" L");
  // Bold chamfer cap + thin arms, a hot square, barcode ticks along the top arm.
  const cap = `M${pts([[0, 18], [18, 0], [40, 0], [36, 4], [20, 4], [4, 20], [4, 44], [0, 48]])} Z`;
  const topArm = `<rect x='40' y='${mirror ? 158.5 : 0}' width='60' height='1.5' fill='${enc(p.frame)}'/>`;
  const leftArm = `<rect x='0' y='${mirror ? 0 : 48}' width='1.5' height='112' fill='${enc(p.frame)}'/>`;
  const hot = `<rect x='7' y='${mirror ? 160 - 31 : 26}' width='5' height='5' fill='${enc(!mirror && p.titleIsBlock ? p.titleFg : p.frame2)}'/>`;
  const ticks = BARCODE.map(([x, w]) => `<rect x='${x}' y='${mirror ? 160 - 8 : 4}' width='${w}' height='4' fill='${enc(p.frame)}' fill-opacity='0.7'/>`).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 160'><path fill='${enc(p.frame)}' d='${cap}'/>${topArm}${leftArm}${hot}${ticks}</svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
}

// Window canvas wallpaper (Daemon 2.0 wallpaper): a dot-matrix grid fading out toward the bottom,
// faint 45°-bending circuit traces in the dim frame color, over a bg0 → near-black vertical wash.
// No CRT scanlines — Daemon never uses them.
const svgUrl = (svg) => `url("data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23")}")`;
function canvasImage(p) {
  const dots = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><rect x='5' y='5' width='1.5' height='1.5' fill='${p.frame}' fill-opacity='0.16'/></svg>`);
  const traces = svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420' fill='none' stroke='${p.frameDim}' stroke-width='1.5' stroke-opacity='0.55'>` +
      `<path d='M0 60H180L240 120H420L470 70H640'/>` +
      `<path d='M0 300H90L150 240H300L360 300H520L580 360H640'/>` +
      `<path d='M260 0V40L300 80V160L340 200' stroke-width='1'/>` +
      `<path d='M520 420V380L480 340V250L440 210' stroke-width='1'/>` +
      `<rect x='176' y='56' width='8' height='8' fill='${p.frameDim}'/><rect x='356' y='296' width='8' height='8' fill='${p.frameDim}'/>` +
      `</svg>`
  );
  const fade = `linear-gradient(180deg, transparent 0 35%, ${p.deep} 100%)`;
  return `${fade}, ${dots}, ${traces}, linear-gradient(180deg, ${p.raised} 0%, #0A0A12 100%)`;
}

function duneChrome(p) {
  const onTitle = p.titleIsBlock;
  const K = p.kvantum === true;
  const seg = (i) => (p.plainStatus ? "transparent" : K ? kbox(p.frame, p.button, 5) : cut(p.seg[i], 6));
  const navSeg = (i) => (K ? "transparent" : stripe(p.seg[i], 2));
  return {
    "// ——— dune.* semantic tokens ———": "",
    "dune.surface-editor": p.editor,
    "dune.surface-sidebar": p.sidebar,
    "dune.surface-panel": p.panel,
    "dune.surface-activityBar": p.sidebar,
    // Mirror of the title band: bottom-right corner cut at 45° with a solid tick in the corner.
    "dune.surface-statusBar": p.seamlessStatus ? `linear-gradient(315deg, ${p.frame} 0 5px, transparent 5px), linear-gradient(180deg, ${p.frame} 0 1px, transparent 1px), linear-gradient(315deg, transparent 0 12px, ${p.sidebar} 12px)` : p.plainStatus ? `linear-gradient(180deg, ${p.error} 0 1px, transparent 1px), ${p.sidebar}` : p.sidebar,
    "dune.surface-widget": p.widget,
    "dune.surface-overlay": p.widget,
    "dune.surface-input": p.input,
    "dune.surface-raised": p.raised,
    "dune.surface-hover": mix(p.text, p.sidebar, 0.08),
    "dune.surface-selection": p.selection,
    "dune.surface-selectionInactive": a(p.selection, "").slice(0, 7) + "66",
    "dune.surface-deep": p.deep,
    "dune.text": p.text,
    "dune.text-bright": p.textBright,
    "dune.text-muted": p.textMuted,
    "dune.text-faint": p.textFaint,
    "dune.text-link": p.link ?? p.data,
    "dune.text-code": p.syntax.string,
    "dune.text-onAccent": p.accentFg,
    "dune.text-lineNumber": p.textFaint,
    "dune.border": p.frame,
    "dune.border-strong": p.frame,
    "dune.border-subtle": a(p.frame, "40"),
    "dune.border-input": p.frame,
    "dune.border-focus": p.focus ?? p.hot,
    "dune.separator": a(p.frame, "55"),
    "dune.accent": p.accent,
    "dune.accent-fg": p.accentFg,
    "dune.accent-hover": p.accentHover,
    "dune.accent-2": p.data,
    "dune.accent-3": p.hot,
    "dune.state-error": p.error,
    "dune.state-warning": p.warning,
    "dune.state-success": p.success,
    "dune.state-info": p.info,
    "dune.state-added": D.green0,
    "dune.state-modified": p.data,
    "dune.state-deleted": D.red2,
    "dune.state-conflict": D.orange,
    "dune.window-bg": K ? "transparent" : p.deep,
    "dune.window-border": p.frame,
    "dune.palette-kbd-bg-top": p.raised,
    "dune.palette-kbd-bg-bottom": p.widget,
    "dune.palette-kbd-border": a(p.frame, "88"),
    "dune.palette-kbd-shadow": p.frameDim,
    "dune.fileicon-default": p.textMuted,
    "dune.fileicon-rust": D.orange,
    "dune.fileicon-markdown": D.ice,
    "dune.fileicon-typescript": D.blue0,
    "dune.fileicon-javascript": D.yellow0,
    "dune.fileicon-tish": D.red2,
    "dune.fileicon-browser-page-bg": D.white,
    "// ——— Derived ———": "",
    "dune.accent-muted": a(p.accent, "38"),
    "dune.fill-subtle": a(p.text, "0A"),
    "dune.fill": a(p.text, "12"),
    "dune.fill-strong": K ? mix(p.frame, p.button, 0.16) : a(p.text, "1F"),
    "dune.hairline": a(p.frame, "33"),
    "dune.hairline-strong": a(p.frame, "66"),
    "dune.overlay-scrim": a(p.deep, "B3"),
    "dune.shadow-window": `0 0 0 1px ${p.frame}, 0 0 14px ${a(p.frame, "8C")}, 0 0 32px ${a(p.frame, "33")}, 0 12px 32px ${a("#000000", "99")}`,
    "dune.zone-drop-glow": a(p.hot, "2E"),
    // Transparent canvas = transparent window (like LCARS): square edges, no rounded opaque window.
    "dune.app-canvas": K ? "transparent" : p.deep,
    "dune.app-canvas-2": K ? "transparent" : mix(p.frame, p.deep, 0.14),
    "dune.app-canvas-image": K ? "none" : canvasImage(p),
    "dune.welcome-glow": mix(p.frame, p.deep, 0.35),
    "dune.welcome-glow-opacity": "0.4",
    "dune.welcome-dune-1": mix(p.frame, p.deep, 0.22),
    "dune.welcome-dune-2": mix(p.frame2, p.deep, 0.12),
    "dune.welcome-dune-3": p.deep,
    "dune.welcome-dust-opacity": "0.5",

    "// ——— Geometry: hard edges, no radii ———": "",
    "dune.radius-sm": "0px",
    "dune.radius-md": "0px",
    "dune.radius-lg": "0px",
    "dune.radius-pill": "2px",
    "dune.radius-control": "0px",
    "dune.radius-item": "0px",
    "dune.radius-surface": "0px",
    "dune.radius-overlay": "0px",
    "dune.field-radius": "0px",
    "dune.btn-radius": "0px",
    "dune.seg-radius": "0px",
    "dune.row-radius-hl": "0px",
    "dune.ctrl-radius": "0px",
    "dune.bubble-radius": "0px",
    "dune.bubble-tail-radius": "0px",
    "dune.part-radius": "0px",
    // Daemon: ONE line between panes, never two. Kvantum drops per-pane outlines and lets a 1px gap
    // over a frame-colored canvas draw the single divider (and the outer window frame).
    "dune.part-border-width": K ? "0px" : "1px",
    // Outer window margin stays 6px (transparent window edge / corners untouched); panes butt
    // against the title band and status bar, and the pane grid shows a solid 1px red gutter.
    "dune.canvas-pad": "6px",
    "dune.part-gap": K ? "0px" : "6px",
    "dune.part-pad": K ? "0px" : "6px",
    "dune.split-size": K ? "1px" : "6px",
    "dune.center-bg": K ? p.frame : "transparent",
    "dune.elev-1": `0 0 0 1px ${a(p.frame, "33")}`,
    "dune.elev-2": `0 0 0 1px ${a(p.frame, "77")}, 0 10px 28px ${a("#000000", "99")}`,
    "dune.elev-3": `0 0 0 1px ${p.frame}, 0 0 24px ${a(p.frame, "33")}, 0 20px 48px ${a("#000000", "AA")}`,

    "// ——— Motion: short, snappy HUD easing ———": "",
    "dune.dur-fast": "90ms",
    "dune.dur-med": "180ms",
    "dune.dur-slow": "280ms",
    "dune.ease-out": "cubic-bezier(0.2, 0.9, 0.1, 1)",
    "dune.ease-spring": "cubic-bezier(0.3, 1.2, 0.5, 1)",
    "dune.alert-anim": "dune-alert-blink 1.2s step-end infinite",
    "dune.frame-label-anim": "dune-lcars-blink 3s step-end infinite",
    "dune.activity-anim": p.activityAnim ? "dune-lcars-pulse 4.8s ease-in-out infinite" : "none",

    "// ——— Frame: chamfered corner brackets ———": "",
    // Daemon windows are a plain 1px frame — no decorative corner brackets.
    "dune.frame-corner-size": K ? "0px" : notPhone("100px"),
    "dune.frame-corner-h-tl": notPhone("160px"),
    "dune.frame-corner-img-tl": cornerSvg(p, false),
    "dune.frame-corner-img-bl": cornerSvg(p, true),
    "dune.statusbar-lead-pad": K ? "0px" : notPhone("26px"),
    "dune.view-header-lead": "14px",

    "// ——— Title bar ———": "",
    "dune.titleBar.controlsPadX": K ? "14" : "26",
    // Measured: band spans y 6–42 (6px canvas gap + 36px bar) → centre 24; 14px disc → top 17.
    "dune.titleBar.controlsPadY": K ? "17" : "17",
    "dune.titleBar.controlsColorClose": p.lights[0],
    "dune.titleBar.controlsColorMinimize": p.lights[1],
    "dune.titleBar.controlsColorZoom": p.lights[2],
    "dune.titleBar.controlsDiameter": K ? "14" : "12",
    "dune.titlebar-traffic-pad": K ? "80px" : "96px",
    "dune.titlebar-h": "36px",
    "dune.titlebar-radius": "0px",
    // Aurorae band: top-left corner cut at 45°.
    "dune.surface-titleBar": K && onTitle
      ? `linear-gradient(135deg, ${p.titleBg} 0 5px, transparent 5px), linear-gradient(135deg, transparent 0 12px, ${p.titleBg} 12px)`
      : K && !onTitle
      ? `linear-gradient(180deg, ${p.frame} 0 3px, transparent 3px), linear-gradient(0deg, ${p.frame} 0 1px, transparent 1px), ${p.titleBg}`
      : `linear-gradient(0deg, ${p.frame} 0 1px, transparent 1px), ${p.titleBg}`,
    "dune.titlebar-fg": p.titleFg,
    "dune.titlebar-fg-muted": onTitle ? p.titleFg : p.omnibarFg,
    "dune.titlebar-accent": onTitle ? p.titleFg : K ? p.focus : p.hot,
    "dune.titlebar-run-fg": onTitle ? p.titleFg : K ? p.text : D.green0,
    "dune.titlebar-card-bg": "transparent",
    "dune.titlebar-ws-bg": onTitle ? "transparent" : K ? kbox(p.frame, p.button) : `${marker(p.frame)}, ${p.widget}`,
    "dune.titlebar-tools-bg": onTitle ? "transparent" : K ? kbox(p.frame, p.button) : `${marker(p.frame, 315)}, ${p.widget}`,
    "dune.titlebar-omnibar-bg": onTitle && K
      ? `linear-gradient(135deg, transparent 0 6px, ${p.omnibarBg} 6px calc(100% - 6px), transparent calc(100% - 6px)) 0 50% / 100% 24px no-repeat`
      : onTitle
      ? `${marker(p.titleFg)}, ${marker(p.titleFg, 315)}, ${p.omnibarBg ?? p.hot}`
      : K ? kbox(p.frame, p.input) : `${marker(p.hot)}, ${marker(p.frame, 315)}, ${p.input}`,
    "dune.titlebar-omnibar-max-w": "560px",
    // Pressed toggles on a colored band invert (ink square, band-colored glyph) like Aurorae's
    // square window glyphs; the ⌘P chip does the same.
    "dune.titlebar-btn-active-bg": onTitle ? "transparent" : p.accent,
    "dune.titlebar-btn-active-fg": onTitle ? p.titleFg : p.accentFg,
    "dune.titlebar-kbd-bg": onTitle ? p.titleFg : p.raised,
    "dune.titlebar-kbd-fg": onTitle ? p.titleBg : p.text,

    "// ——— Activity rail: neon stripe segments ———": "",
    "dune.activity-col": "48px",
    "dune.activity-pad": "8px 0",
    "dune.activity-item-bg": "transparent",
    "dune.activity-item-radius": "0px",
    "dune.activity-item-gap": "2px",
    "dune.activity-item-fg": p.text,
    "dune.activity-item-hover-bg": K ? kbox(p.frame2, mix(p.text, p.sidebar, 0.07), 5) : `${stripe(p.hot)}, ${a(p.text, "14")}`,
    "dune.activity-item-active-bg": K ? kbox(p.frame2, p.accent, 5) : `${stripe(p.accent)}, ${cutBR(a(p.accent, "30"), 8)}`,
    "dune.activity-item-radius-top": "0px",
    "dune.activity-item-fg-top": p.textMuted,
    // Top-mode rail buttons (the default layout): the same Kvantum button as everywhere else.
    "dune.activity-item-active-bg-top": K ? kbtn(p.frame2, p.frame2, p.accent, p.frame2) : a(p.text, "14"),
    "dune.activity-item-hover-bg-top": K ? kbtn(p.frame, p.frame, p.button) : a(p.text, "0F"),
    "dune.activity-seg-1": K ? "transparent" : stripe(a(p.seg[0], "AA"), 2),
    "dune.activity-seg-2": K ? "transparent" : stripe(a(p.seg[1], "AA"), 2),
    "dune.activity-seg-3": K ? "transparent" : stripe(a(p.seg[2], "AA"), 2),
    "dune.activity-seg-4": K ? "transparent" : stripe(a(p.seg[3], "AA"), 2),
    "dune.activity-fill-bg": "transparent",
    "dune.frame-label-1": p.labels[0],
    "dune.frame-label-2": p.labels[1],

    "// ——— Status bar: chamfered segment blocks ———": "",
    "dune.statusbar-radius": "0px",
    "dune.statusbar-item-bg": "transparent",
    "dune.statusbar-item-radius": "0px",
    "dune.statusbar-item-gap": "3px",
    "dune.statusbar-item-pad": "0 12px",
    "dune.statusbar-item-fg": p.plainStatus ? p.text : p.segFg,
    "dune.statusbar-seg-1": seg(0),
    "dune.statusbar-seg-2": seg(1),
    "dune.statusbar-seg-3": seg(2),
    "dune.statusbar-seg-4": seg(3),

    "// ——— Sidebar view headers ———": "",
    "dune.view-header-bg": K
      ? `linear-gradient(0deg, ${a(p.frame, "66")} 0 1px, transparent 1px)`
      : `${stripe(p.frame)}, ${cutBR(p.raised, 10)}`,
    "dune.view-header-radius": "0px",
    "dune.view-header-justify": "flex-start",
    "dune.view-header-fg": K ? p.textBright : p.frame,
    "dune.view-header-height": "28px",

    "// ——— Typography ———": "",
    "dune.ui-font-family": "'Rajdhani', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    "dune.chrome-transform": "none",
    "dune.chrome-letter-spacing": "0.02em",
    "dune.section-header-letter-spacing": "0.1em",
    "dune.weight-medium": "600",
    "dune.weight-bold": "700",

    "// ——— File tree ———": "",
    "dune.tree-transform": "none",
    "dune.tree-row-fg": p.text,
    "dune.tree-arrow-color": "transparent",
    "dune.tree-toggle-collapsed": "'[+]'",
    "dune.tree-toggle-open": "'[-]'",
    "dune.tree-toggle-color": p.hot,
    "dune.tree-twistie-w": "2.4em",
    "dune.row-radius": "0px",
    "dune.row-inset": "4px",

    "// ——— Editor tabs ———": "",
    "dune.tab-radius": "0px",
    "dune.tab-row-h": "36px",
    "dune.tab-inset": "0px",
    "dune.tab-gap": "2px",
    "dune.tab-divider-width": "0px",
    "dune.tab-strip-pad": "0px",
    "dune.tab-strip-border-width": "1px",
    "dune.tab-pad-x": "10px",
    // Active tab: slate-teal fill, a 2px neon top rule, bottom-right corner cut (Kvantum tab).
    "dune.tab-active-bg": K ? ktab(p.frame2, p.tabActiveBg) : `linear-gradient(180deg, ${p.tabTop ?? p.hot} 0 2px, transparent 2px), ${cutBR(p.tabActiveBg, 8)}`,
    "dune.tab-active-border": "transparent",
    // Kit buttons / segmented controls / checkboxes (Kvantum widget set).
    "dune.btn-bg": K ? kbtn(p.frame, p.frame, p.button) : (p.button ?? p.widget),
    "dune.btn-bg-hover": K ? kbtn(p.frame2, p.frame2, p.button) : mix(p.text, p.button ?? p.widget, 0.12),
    "dune.btn-border": "transparent",
    "dune.btn-primary-bg": K ? kbtn(p.frame2, p.frame2, p.accent, p.frame2) : p.accent,
    "dune.btn-primary-bg-hover": K ? kbtn(p.frame2, p.frame2, mix(p.frame2, p.accent, 0.12), p.frame2) : p.accentHover,
    "dune.seg-active-bg": K ? cutBR(p.accent, 6) : p.accent,
    "dune.check-radius": "0px",
    // Kvantum inputs: outline with bottom-right cut + solid tick top-left; cyan on focus.
    "dune.field-bg": K ? `linear-gradient(135deg, ${p.frame} 0 5px, transparent 5px), ${boxBR(p.frame, p.input, 7)}` : p.input,
    "dune.field-bg-focus": K ? `linear-gradient(135deg, ${p.frame2} 0 5px, transparent 5px), ${boxBR(p.frame2, p.input, 7)}` : p.input,
    "dune.field-border": K ? "transparent" : p.frame,
    "dune.field-border-focus": K ? "transparent" : p.focus ?? p.hot,
    "dune.select-chevron": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${enc(p.frame2)}' stroke-width='2.5' stroke-linecap='square'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    // Checkboxes: Kvantum corner brackets [ ]; checked adds an X.
    "dune.check-appearance": K ? "none" : "auto",
    "dune.check-size": K ? "15px" : "auto",
    "dune.check-bg": K ? brackets(p.frame2) : p.input,
    "dune.check-on-bg": K ? `${xmark(p.frame2)}, ${brackets(p.frame2)}` : p.accent,
    "dune.check-border": K ? "transparent" : p.frame,
    "dune.check-on-border": K ? "transparent" : p.accent,
    // Chat composer: chamfered Kvantum card, neon focus glow.
    "dune.composer-bg": K ? kbox(p.frame, p.input, 8, p.frame) : p.input,
    "dune.composer-border": K ? "transparent" : p.frame,
    "dune.composer-focus-shadow": K ? `0 0 12px ${a(p.frame2, "55")}` : "none",
    "dune.panel-tab-active-bg": K ? ktab(p.frame2, p.accent) : a(p.text, "14"),
    "dune.panel-tab-active-border": K ? "transparent" : p.frame,
    // ——— Motion (all reduced-motion guarded by the app) ———
    // Buttons glitch (RGB split) once on hover; a newly selected row flickers like a neon tube;
    // a faint light band sweeps the title band every 9s.
    "dune.btn-hover-anim": K ? "dune-glitch 0.32s steps(3, end) 1" : "none",
    "dune.row-selected-anim": K ? "dune-flicker 0.7s linear 1" : "none",
    "dune.titlebar-scan": K ? `linear-gradient(90deg, transparent, ${a("#FFFFFF", "2E")}, transparent) 0 0 / 22% 100% no-repeat` : "none",
    "dune.titlebar-anim": K ? "dune-scan 9s linear infinite" : "none",
    // Selected tree row: Daemon's 3px neon bar on the left of a slate-teal fill.
    "dune.tree-row-selected-bg": `${stripe(p.rowBar ?? p.hot)}, ${p.selection}`,
    // Square, thin, red idle → cyan on hover (Kvantum scrollbar).
    "dune.scrollbar-size": "8px",
    "dune.scrollbar-radius": "0px",
    // WebKit draws plain-element scrollbars natively (it ignores ::-webkit-scrollbar here), so tint them;
    // Monaco scrollables get the square thumb + track via scrollbar-radius/-track.
    "dune.scrollbar-width": "thin",
    "dune.scrollbar-color": `${p.scroll ?? p.frame} ${K ? p.input : "transparent"}`,
    "dune.statusbar-lang-bg": p.plainStatus ? "transparent" : p.accent,
    "dune.statusbar-lang-fg": p.plainStatus ? p.text : p.accentFg,
    "dune.statusbar-lang-bg-hover": p.accent,
    "dune.scrollbar-track": K ? p.input : "transparent",
    "dune.scrollbar-thumb": p.scroll ?? p.frame,
    "dune.scrollbar-thumb-hover": p.scrollHover ?? p.focus ?? p.hot,

    "// ——— Settings ———": "",
    "dune.settings-title-fg": p.frame,
    "dune.settings-nav-radius": "0px",
    "dune.settings-nav-fg": p.text,
    "dune.settings-nav-gap": "2px",
    "dune.settings-nav-transform": "none",
    "dune.settings-nav-seg-1": navSeg(0),
    "dune.settings-nav-seg-2": navSeg(1),
    "dune.settings-nav-seg-3": navSeg(2),
    "dune.settings-nav-seg-4": navSeg(3),
    "dune.settings-nav-hover-bg": K ? kbox(p.frame2, mix(p.text, p.sidebar, 0.07), 5) : `${stripe(p.hot)}, ${a(p.text, "12")}`,
    "dune.settings-nav-active-bg": K ? kbox(p.frame2, p.accent, 5) : cut(p.accent, 6),
    "dune.settings-nav-active-fg": p.accentFg,
    "dune.settings-scope-active-bg": p.accent,
    "dune.settings-scope-active-fg": p.accentFg,
    "dune.settings-scope-radius": "0px",

    "// ——— Repo slots ———": "",
    "dune.repo-color-1": p.seg[0],
    "dune.repo-color-2": p.seg[2],
    "dune.repo-color-3": p.seg[1]
  };
}

function colors(p) {
  const s = p.syntax;
  return {
    "// ——— Base ———": "",
    "foreground": p.text,
    "descriptionForeground": p.textMuted,
    "disabledForeground": p.textFaint,
    "errorForeground": p.error,
    "focusBorder": p.focus ?? p.hot,
    "contrastBorder": T,
    "selection.background": p.selection,
    "icon.foreground": p.text,
    "widget.shadow": a("#000000", "80"),
    "widget.border": p.frame,
    "sash.hoverBorder": p.sash ?? p.hot,
    "window.activeBorder": p.frame,
    "window.inactiveBorder": p.frameDim,
    "// ——— Editor ———": "",
    "editor.background": p.editor,
    "editor.foreground": p.text,
    "editorLineNumber.foreground": p.textFaint,
    "editorLineNumber.activeForeground": p.hot,
    "editorCursor.foreground": p.hot,
    "editorCursor.background": p.editor,
    "editor.selectionBackground": p.selection,
    "editor.selectionHighlightBackground": a(p.data, "26"),
    "editor.inactiveSelectionBackground": a(p.data, "1F"),
    "editor.wordHighlightBackground": a(p.frame, "26"),
    "editor.wordHighlightStrongBackground": a(p.frame, "3D"),
    "editor.findMatchBackground": a(p.hot, "55"),
    "editor.findMatchBorder": p.hot,
    "editor.findMatchHighlightBackground": a(p.hot, "26"),
    "editor.findRangeHighlightBackground": a(p.data, "1A"),
    "editor.hoverHighlightBackground": a(p.frame, "22"),
    "editor.lineHighlightBackground": a(p.frame, "12"),
    "editor.lineHighlightBorder": T,
    "editor.rangeHighlightBackground": a(p.data, "1A"),
    "editor.foldBackground": a(p.frame, "14"),
    "editorWhitespace.foreground": a(p.textFaint, "66"),
    "editorIndentGuide.background1": a(p.frame, "26"),
    "editorIndentGuide.activeBackground1": a(p.frame, "99"),
    "editorRuler.foreground": a(p.frame, "33"),
    "editorCodeLens.foreground": p.textFaint,
    "editorBracketMatch.background": a(p.data, "33"),
    "editorBracketMatch.border": p.data,
    "editorBracketHighlight.foreground1": p.seg[0],
    "editorBracketHighlight.foreground2": p.seg[1],
    "editorBracketHighlight.foreground3": p.seg[2],
    "editorBracketHighlight.foreground4": p.seg[3],
    "editorBracketHighlight.foreground5": D.purple0,
    "editorBracketHighlight.foreground6": D.green0,
    "editorBracketHighlight.unexpectedBracket.foreground": p.error,
    "editorBracketPairGuide.activeBackground1": a(p.seg[0], "99"),
    "editorBracketPairGuide.activeBackground2": a(p.seg[1], "99"),
    "editorBracketPairGuide.activeBackground3": a(p.seg[2], "99"),
    "editorStickyScroll.background": p.editor,
    "editorStickyScroll.border": a(p.frame, "55"),
    "editorStickyScroll.shadow": T,
    "editorStickyScrollHover.background": a(p.frame, "1A"),
    "editorGutter.background": p.editor,
    "editorGutter.modifiedBackground": p.data,
    "editorGutter.addedBackground": D.green0,
    "editorGutter.deletedBackground": D.red2,
    "editorGutter.foldingControlForeground": p.hot,
    "editorError.foreground": p.error,
    "editorWarning.foreground": p.warning,
    "editorInfo.foreground": p.info,
    "editorHint.foreground": p.data,
    "editorUnnecessaryCode.opacity": "#00000088",
    "editorLightBulb.foreground": p.hot,
    "editorLightBulbAutoFix.foreground": D.green0,
    "editorGhostText.foreground": p.textFaint,
    "editorInlayHint.foreground": p.textMuted,
    "editorInlayHint.background": a(p.frame, "14"),
    "editorLink.activeForeground": p.hot,
    "editorOverviewRuler.border": T,
    "editorOverviewRuler.background": p.editor,
    "editorOverviewRuler.findMatchForeground": a(p.hot, "AA"),
    "editorOverviewRuler.errorForeground": p.error,
    "editorOverviewRuler.warningForeground": p.warning,
    "editorOverviewRuler.infoForeground": p.info,
    "editorOverviewRuler.modifiedForeground": p.data,
    "editorOverviewRuler.addedForeground": D.green0,
    "editorOverviewRuler.deletedForeground": D.red2,
    "textLink.foreground": p.link ?? p.data,
    "textLink.activeForeground": p.hot,
    "// ——— Minimap ———": "",
    "minimap.background": p.editor,
    "minimap.findMatchHighlight": a(p.hot, "99"),
    "minimap.selectionHighlight": a(p.data, "99"),
    "minimap.errorHighlight": p.error,
    "minimap.warningHighlight": p.warning,
    "minimapGutter.addedBackground": D.green0,
    "minimapGutter.modifiedBackground": p.data,
    "minimapGutter.deletedBackground": D.red2,
    "minimapSlider.background": a(p.frame, "22"),
    "minimapSlider.hoverBackground": a(p.frame, "33"),
    "minimapSlider.activeBackground": a(p.frame, "44"),
    "// ——— Title / activity / side bars ———": "",
    "titleBar.activeBackground": p.titleBg,
    "titleBar.activeForeground": p.titleFg,
    "titleBar.inactiveBackground": p.titleBg,
    "titleBar.inactiveForeground": p.titleFgMuted,
    "titleBar.border": p.frame,
    "activityBar.background": p.sidebar,
    "activityBar.foreground": p.text,
    "activityBar.inactiveForeground": p.textMuted,
    "activityBar.border": p.frame,
    "activityBar.activeBorder": p.accent,
    "activityBar.activeBackground": a(p.accent, "26"),
    "activityBarBadge.background": p.seg[0],
    "activityBarBadge.foreground": p.segFg,
    "sideBar.background": p.sidebar,
    "sideBar.foreground": p.text,
    "sideBar.border": p.frame,
    "sideBarTitle.foreground": p.frame,
    "sideBarSectionHeader.background": p.raised,
    "sideBarSectionHeader.foreground": p.text,
    "sideBarSectionHeader.border": a(p.frame, "55"),
    "sideBarStickyScroll.background": p.sidebar,
    "sideBarStickyScroll.border": a(p.frame, "55"),
    "sideBar.dropBackground": a(p.hot, "1F"),
    "// ——— Lists & trees ———": "",
    "list.activeSelectionBackground": p.selection,
    "list.activeSelectionForeground": p.textBright,
    "list.inactiveSelectionBackground": a(p.selection, "").slice(0, 7) + "66",
    "list.inactiveSelectionForeground": p.text,
    "list.hoverBackground": a(p.frame, "1A"),
    "list.hoverForeground": p.textBright,
    "list.focusBackground": p.selection,
    "list.focusForeground": p.textBright,
    "list.focusOutline": p.hot,
    "list.focusAndSelectionOutline": p.hot,
    "list.highlightForeground": p.hot,
    "list.focusHighlightForeground": p.hot,
    "list.warningForeground": p.warning,
    "list.errorForeground": p.error,
    "list.dropBackground": a(p.hot, "1F"),
    "tree.indentGuidesStroke": a(p.frame, "55"),
    "tree.inactiveIndentGuidesStroke": a(p.frame, "26"),
    "listFilterWidget.background": p.widget,
    "listFilterWidget.outline": p.hot,
    "listFilterWidget.noMatchesOutline": p.error,
    "// ——— Editor groups & tabs ———": "",
    "editorGroup.border": p.frame,
    "editorGroupHeader.tabsBackground": p.editor,
    "editorGroupHeader.tabsBorder": a(p.frame, "88"),
    "editorGroupHeader.noTabsBackground": p.editor,
    "editorGroup.dropBackground": a(p.hot, "1F"),
    "editorGroup.emptyBackground": p.editor,
    "tab.activeBackground": p.tabActiveBg,
    "tab.activeForeground": p.tabActiveFg,
    "tab.activeBorder": T,
    "tab.activeBorderTop": p.tabTop ?? p.hot,
    "tab.inactiveBackground": p.tabInactiveBg,
    "tab.inactiveForeground": p.tabInactiveFg,
    "tab.hoverBackground": a(p.frame, "26"),
    "tab.hoverForeground": p.textBright,
    "tab.hoverBorder": p.frame,
    "tab.border": T,
    "tab.unfocusedActiveBackground": p.tabActiveBg,
    "tab.unfocusedActiveForeground": p.tabActiveFg,
    "tab.unfocusedActiveBorderTop": a(p.hot, "66"),
    "tab.unfocusedInactiveBackground": p.tabInactiveBg,
    "tab.unfocusedInactiveForeground": p.textFaint,
    "tab.lastPinnedBorder": a(p.frame, "55"),
    "tab.activeModifiedBorder": p.hot,
    "tab.inactiveModifiedBorder": a(p.hot, "80"),
    "tab.dragAndDropBorder": p.hot,
    "// ——— Breadcrumbs ———": "",
    "breadcrumb.background": p.editor,
    "breadcrumb.foreground": p.textMuted,
    "breadcrumb.focusForeground": p.textBright,
    "breadcrumb.activeSelectionForeground": p.hot,
    "breadcrumbPicker.background": p.widget,
    "// ——— Status bar ———": "",
    "statusBar.background": p.sidebar,
    "statusBar.foreground": p.text,
    "statusBar.border": p.frame,
    "statusBar.focusBorder": p.hot,
    "statusBar.noFolderBackground": p.sidebar,
    "statusBar.noFolderForeground": p.text,
    "statusBar.debuggingBackground": p.frame,
    "statusBar.debuggingForeground": p.segFg,
    "statusBarItem.hoverBackground": p.plainStatus ? p.accent : p.textBright,
    "statusBarItem.hoverForeground": p.plainStatus ? p.accentFg : p.segFg,
    "statusBarItem.activeBackground": p.plainStatus ? p.accentHover : a(p.textBright, "CC"),
    "statusBarItem.remoteBackground": p.plainStatus ? T : p.seg[2],
    "statusBarItem.remoteForeground": p.plainStatus ? p.text : p.segFg,
    "statusBarItem.prominentBackground": p.plainStatus ? T : p.seg[0],
    "statusBarItem.prominentForeground": p.plainStatus ? p.text : p.segFg,
    "statusBarItem.prominentHoverBackground": p.plainStatus ? p.accent : p.textBright,
    "statusBarItem.errorBackground": D.red1,
    "statusBarItem.errorForeground": D.bg2,
    "statusBarItem.warningBackground": D.yellow0,
    "statusBarItem.warningForeground": D.bg2,
    "// ——— Inputs / dropdowns / buttons ———": "",
    "input.background": p.input,
    "input.foreground": p.text,
    "input.border": p.frame,
    "input.placeholderForeground": p.textFaint,
    "inputOption.activeBorder": p.hot,
    "inputOption.activeBackground": a(p.hot, "26"),
    "inputOption.activeForeground": p.textBright,
    "inputValidation.infoBackground": p.widget,
    "inputValidation.infoBorder": p.info,
    "inputValidation.infoForeground": p.text,
    "inputValidation.warningBackground": p.widget,
    "inputValidation.warningBorder": p.warning,
    "inputValidation.warningForeground": p.text,
    "inputValidation.errorBackground": p.widget,
    "inputValidation.errorBorder": p.error,
    "inputValidation.errorForeground": p.text,
    "dropdown.background": p.input,
    "dropdown.foreground": p.text,
    "dropdown.border": p.frame,
    "dropdown.listBackground": p.widget,
    "button.background": p.button ?? p.widget,
    "button.foreground": btnFg(p),
    "button.hoverBackground": mix(btnFg(p), p.button ?? p.widget, 0.16),
    "button.border": p.frame,
    "button.separator": a(p.frame, "66"),
    "button.secondaryBackground": p.button ?? p.widget,
    "button.secondaryForeground": p.text,
    "button.secondaryHoverBackground": mix(p.text, p.button ?? p.widget, 0.12),
    "checkbox.background": p.input,
    "checkbox.foreground": p.hot,
    "checkbox.border": a(p.text, "66"),
    "checkbox.selectBackground": p.widget,
    "checkbox.selectBorder": p.hot,
    "radio.activeForeground": p.accentFg,
    "radio.activeBackground": p.accent,
    "radio.activeBorder": p.accent,
    "radio.inactiveForeground": p.text,
    "radio.inactiveBorder": a(p.text, "55"),
    "// ——— Badges / progress / scrollbar ———": "",
    "badge.background": p.seg[0],
    "badge.foreground": p.segFg,
    "progressBar.background": p.frame,
    "scrollbar.shadow": T,
    "scrollbarSlider.background": a(p.scroll ?? D.teal, "99"),
    "scrollbarSlider.hoverBackground": a(p.scrollHover ?? D.teal, "CC"),
    "scrollbarSlider.activeBackground": a(p.focus ?? p.hot, "AA"),
    "// ——— Panels / terminal ———": "",
    "panel.background": p.panel,
    "panel.border": p.frame,
    "panel.dropBorder": p.hot,
    "panelTitle.activeForeground": p.hot,
    "panelTitle.activeBorder": p.hot,
    "panelTitle.inactiveForeground": p.textMuted,
    "panelInput.border": a(p.text, "55"),
    "panelSection.border": a(p.frame, "55"),
    "panelSection.dropBackground": a(p.hot, "1F"),
    "panelSectionHeader.background": p.raised,
    "panelSectionHeader.foreground": p.text,
    "terminal.background": p.panel,
    "terminal.foreground": p.text,
    "terminal.selectionBackground": p.selection,
    "terminal.inactiveSelectionBackground": a(p.data, "33"),
    "terminal.border": a(p.frame, "55"),
    "terminal.dropBackground": a(p.hot, "1F"),
    "terminal.tab.activeBorder": p.hot,
    "terminalCursor.foreground": p.hot,
    "terminalCursor.background": p.panel,
    "terminalCommandDecoration.defaultBackground": p.textFaint,
    "terminalCommandDecoration.successBackground": D.green0,
    "terminalCommandDecoration.errorBackground": D.red1,
    "terminal.ansiBlack": p.ansi.black,
    "terminal.ansiRed": p.ansi.red,
    "terminal.ansiGreen": p.ansi.green,
    "terminal.ansiYellow": p.ansi.yellow,
    "terminal.ansiBlue": p.ansi.blue,
    "terminal.ansiMagenta": p.ansi.magenta,
    "terminal.ansiCyan": p.ansi.cyan,
    "terminal.ansiWhite": p.ansi.white,
    "terminal.ansiBrightBlack": p.ansi.brBlack,
    "terminal.ansiBrightRed": p.ansi.brRed,
    "terminal.ansiBrightGreen": p.ansi.brGreen,
    "terminal.ansiBrightYellow": p.ansi.brYellow,
    "terminal.ansiBrightBlue": p.ansi.brBlue,
    "terminal.ansiBrightMagenta": p.ansi.brMagenta,
    "terminal.ansiBrightCyan": p.ansi.brCyan,
    "terminal.ansiBrightWhite": p.ansi.brWhite,
    "// ——— Widgets ———": "",
    "editorWidget.background": p.widget,
    "editorWidget.foreground": p.text,
    "editorWidget.border": p.frame,
    "editorWidget.resizeBorder": p.hot,
    "editorSuggestWidget.background": p.widget,
    "editorSuggestWidget.border": p.frame,
    "editorSuggestWidget.foreground": p.text,
    "editorSuggestWidget.selectedBackground": p.selection,
    "editorSuggestWidget.selectedForeground": p.textBright,
    "editorSuggestWidget.highlightForeground": p.hot,
    "editorSuggestWidget.focusHighlightForeground": p.hot,
    "editorHoverWidget.background": p.widget,
    "editorHoverWidget.foreground": p.text,
    "editorHoverWidget.border": p.frame,
    "editorHoverWidget.statusBarBackground": p.raised,
    "editorMarkerNavigation.background": p.widget,
    "editorMarkerNavigationError.background": D.red1,
    "editorMarkerNavigationWarning.background": D.yellow0,
    "editorMarkerNavigationInfo.background": D.blue0,
    "peekView.border": p.frame,
    "peekViewEditor.background": p.panel,
    "peekViewEditor.matchHighlightBackground": a(p.hot, "44"),
    "peekViewEditorGutter.background": p.panel,
    "peekViewResult.background": p.widget,
    "peekViewResult.fileForeground": p.text,
    "peekViewResult.lineForeground": p.textMuted,
    "peekViewResult.selectionBackground": p.selection,
    "peekViewResult.selectionForeground": p.textBright,
    "peekViewResult.matchHighlightBackground": a(p.hot, "44"),
    "peekViewTitle.background": p.raised,
    "peekViewTitleLabel.foreground": p.textBright,
    "peekViewTitleDescription.foreground": p.textMuted,
    "// ——— Git / diff / merge ———": "",
    "gitDecoration.modifiedResourceForeground": p.data,
    "gitDecoration.deletedResourceForeground": D.red2,
    "gitDecoration.untrackedResourceForeground": D.green0,
    "gitDecoration.ignoredResourceForeground": p.textFaint,
    "gitDecoration.conflictingResourceForeground": D.orange,
    "gitDecoration.addedResourceForeground": D.green0,
    "gitDecoration.stageModifiedResourceForeground": p.data,
    "gitDecoration.stageDeletedResourceForeground": D.red2,
    "gitDecoration.submoduleResourceForeground": D.purple0,
    "diffEditor.insertedTextBackground": a(D.green0, "40"),
    "diffEditor.removedTextBackground": a(D.red2, "40"),
    "diffEditor.insertedLineBackground": a(D.green0, "1F"),
    "diffEditor.removedLineBackground": a(D.red2, "1F"),
    "diffEditor.border": a(p.frame, "55"),
    "diffEditor.diagonalFill": a(p.frame, "26"),
    "diffEditor.unchangedRegionBackground": p.editor,
    "merge.currentHeaderBackground": a(D.green0, "66"),
    "merge.currentContentBackground": a(D.green0, "26"),
    "merge.incomingHeaderBackground": a(D.blue0, "66"),
    "merge.incomingContentBackground": a(D.blue0, "26"),
    "merge.commonHeaderBackground": a(D.grey, "66"),
    "merge.commonContentBackground": a(D.grey, "26"),
    "merge.border": T,
    "// ——— Menus / notifications / banner ———": "",
    "menu.background": p.widget,
    "menu.foreground": p.text,
    "menu.selectionBackground": p.menuSel ?? p.accent,
    "menu.selectionForeground": p.menuSelFg ?? p.accentFg,
    "menu.selectionBorder": T,
    "menu.separatorBackground": a(p.frame, "66"),
    "menu.border": p.frame,
    "menubar.selectionBackground": a(p.frame, "26"),
    "menubar.selectionForeground": p.textBright,
    "notificationCenter.border": p.frame,
    "notificationCenterHeader.background": p.raised,
    "notificationCenterHeader.foreground": p.text,
    "notifications.background": p.widget,
    "notifications.foreground": p.text,
    "notifications.border": a(p.frame, "66"),
    "notificationToast.border": p.frame,
    "notificationLink.foreground": p.data,
    "notificationsErrorIcon.foreground": p.error,
    "notificationsWarningIcon.foreground": p.warning,
    "notificationsInfoIcon.foreground": p.info,
    "banner.background": p.frameDim,
    "banner.foreground": D.white,
    "banner.iconForeground": p.hot,
    "// ——— Command center / quick input ———": "",
    "commandCenter.foreground": p.text,
    "commandCenter.activeForeground": p.textBright,
    "commandCenter.inactiveForeground": p.textMuted,
    "commandCenter.background": p.input,
    "commandCenter.activeBackground": a(p.frame, "1A"),
    "commandCenter.border": a(p.frame, "88"),
    "commandCenter.inactiveBorder": a(p.frame, "44"),
    "commandCenter.activeBorder": p.hot,
    "quickInput.background": p.widget,
    "quickInput.foreground": p.text,
    "quickInputList.focusBackground": p.selection,
    "quickInputList.focusForeground": p.textBright,
    "quickInputList.focusIconForeground": p.hot,
    "quickInputTitle.background": p.raised,
    "pickerGroup.foreground": p.hot,
    "pickerGroup.border": a(p.frame, "55"),
    "keybindingLabel.background": p.raised,
    "keybindingLabel.foreground": p.text,
    "keybindingLabel.border": a(p.frame, "66"),
    "keybindingLabel.bottomBorder": p.frame,
    "// ——— Settings ———": "",
    "settings.headerForeground": p.textBright,
    "settings.modifiedItemIndicator": p.hot,
    "settings.dropdownBackground": p.input,
    "settings.dropdownBorder": a(p.text, "55"),
    "settings.dropdownListBorder": p.frame,
    "settings.textInputBackground": p.input,
    "settings.textInputBorder": a(p.text, "55"),
    "settings.numberInputBackground": p.input,
    "settings.numberInputBorder": a(p.text, "55"),
    "settings.checkboxBackground": p.input,
    "settings.checkboxBorder": a(p.text, "66"),
    "settings.focusedRowBackground": a(p.frame, "14"),
    "settings.focusedRowBorder": a(p.frame, "66"),
    "settings.headerBorder": a(p.frame, "66"),
    "settings.sashBorder": p.frame,
    "// ——— Debug ———": "",
    "debugToolBar.background": p.widget,
    "debugToolBar.border": p.frame,
    "debugExceptionWidget.background": a(D.red1, "26"),
    "debugExceptionWidget.border": D.red1,
    "debugConsole.errorForeground": p.error,
    "debugConsole.warningForeground": p.warning,
    "debugConsole.infoForeground": p.info,
    "debugConsole.sourceForeground": p.text,
    "debugConsoleInputIcon.foreground": p.hot,
    "debugTokenExpression.name": s.property,
    "debugTokenExpression.value": p.text,
    "debugTokenExpression.string": s.string,
    "debugTokenExpression.number": s.number,
    "debugTokenExpression.boolean": s.constant,
    "debugTokenExpression.error": p.error,
    "debugIcon.startForeground": D.green0,
    "debugIcon.pauseForeground": D.blue0,
    "debugIcon.stopForeground": D.red1,
    "debugIcon.disconnectForeground": D.red1,
    "debugIcon.restartForeground": D.green0,
    "debugIcon.stepOverForeground": D.blue0,
    "debugIcon.stepIntoForeground": D.blue0,
    "debugIcon.stepOutForeground": D.blue0,
    "debugIcon.continueForeground": D.blue0,
    "debugIcon.stepBackForeground": D.blue0,
    "debugIcon.breakpointForeground": D.red1,
    "debugIcon.breakpointDisabledForeground": a(D.red1, "80"),
    "debugIcon.breakpointUnverifiedForeground": D.grey,
    "debugIcon.breakpointCurrentStackframeForeground": D.yellow0,
    "debugIcon.breakpointStackframeForeground": D.yellow1,
    "editor.stackFrameHighlightBackground": a(D.yellow0, "26"),
    "editor.focusedStackFrameHighlightBackground": a(D.green0, "33"),
    "// ——— Testing ———": "",
    "testing.iconPassed": D.green0,
    "testing.iconFailed": D.red1,
    "testing.iconErrored": D.red1,
    "testing.iconQueued": D.yellow0,
    "testing.iconSkipped": D.grey,
    "testing.iconUnset": D.grey,
    "testing.runAction": D.green0,
    "testing.peekBorder": D.red1,
    "testing.peekHeaderBackground": a(D.red1, "1A"),
    "testing.message.error.lineBackground": a(D.red1, "26"),
    "testing.message.info.lineBackground": a(D.blue0, "1F"),
    "testing.coveredBackground": a(D.green0, "26"),
    "testing.coveredGutterBackground": a(D.green0, "66"),
    "testing.uncoveredBackground": a(D.red2, "26"),
    "testing.uncoveredGutterBackground": a(D.red2, "66"),
    "// ——— Symbol icons ———": "",
    "symbolIcon.fileForeground": p.textMuted,
    "symbolIcon.folderForeground": p.frame,
    "symbolIcon.moduleForeground": s.type,
    "symbolIcon.namespaceForeground": s.type,
    "symbolIcon.packageForeground": s.type,
    "symbolIcon.classForeground": s.type,
    "symbolIcon.interfaceForeground": s.iface,
    "symbolIcon.structForeground": s.type,
    "symbolIcon.typeParameterForeground": s.iface,
    "symbolIcon.functionForeground": s.func,
    "symbolIcon.methodForeground": s.func,
    "symbolIcon.constructorForeground": s.func,
    "symbolIcon.variableForeground": s.variable,
    "symbolIcon.fieldForeground": s.property,
    "symbolIcon.propertyForeground": s.property,
    "symbolIcon.keywordForeground": s.keyword,
    "symbolIcon.snippetForeground": s.regex,
    "symbolIcon.colorForeground": s.string,
    "symbolIcon.constantForeground": s.constant,
    "symbolIcon.enumeratorForeground": s.type,
    "symbolIcon.enumeratorMemberForeground": s.constant,
    "symbolIcon.stringForeground": s.string,
    "symbolIcon.numberForeground": s.number,
    "symbolIcon.booleanForeground": s.constant,
    "symbolIcon.arrayForeground": p.textMuted,
    "symbolIcon.objectForeground": p.textMuted,
    "symbolIcon.keyForeground": s.property,
    "symbolIcon.nullForeground": p.textMuted,
    "symbolIcon.operatorForeground": s.operator,
    "symbolIcon.referenceForeground": s.type,
    "symbolIcon.unitForeground": s.number,
    "symbolIcon.eventForeground": s.tag,
    "symbolIcon.textForeground": p.text,
    "// ——— Extensions / misc ———": "",
    "extensionButton.prominentBackground": p.accent,
    "extensionButton.prominentForeground": p.accentFg,
    "extensionButton.prominentHoverBackground": p.accentHover,
    "extensionButton.background": p.accent,
    "extensionButton.foreground": p.accentFg,
    "extensionButton.hoverBackground": p.accentHover,
    "extensionButton.separator": a(p.accentFg, "66"),
    "extensionIcon.starForeground": D.yellow0,
    "extensionIcon.verifiedForeground": D.blue0,
    "extensionIcon.preReleaseForeground": D.orange,
    "extensionIcon.sponsorForeground": D.pink0,
    "extensionBadge.remoteBackground": p.seg[2],
    "extensionBadge.remoteForeground": p.segFg,
    "textPreformat.foreground": s.string,
    "textPreformat.background": a(p.frame, "14"),
    "textBlockQuote.background": a(p.frame, "14"),
    "textBlockQuote.border": p.frame,
    "textCodeBlock.background": p.panel,
    "textSeparator.foreground": a(p.frame, "55"),
    "walkThrough.embeddedEditorBackground": p.panel,
    "welcomePage.background": p.editor,
    "welcomePage.tileBackground": p.widget,
    "welcomePage.tileHoverBackground": p.raised,
    "welcomePage.tileBorder": a(p.frame, "66"),
    "welcomePage.progress.background": a(p.frame, "33"),
    "welcomePage.progress.foreground": p.hot,
    "charts.foreground": p.text,
    "charts.lines": p.textFaint,
    "charts.red": D.red2,
    "charts.blue": D.blue0,
    "charts.yellow": D.yellow0,
    "charts.orange": D.orange,
    "charts.green": D.green0,
    "charts.purple": D.purple0,
    "table.headerBackground": p.raised,
    "table.headerForeground": p.textBright,
    "problemsErrorIcon.foreground": p.error,
    "problemsWarningIcon.foreground": p.warning,
    "problemsInfoIcon.foreground": p.info
  };
}

function tokenColors(p) {
  const s = p.syntax;
  const rule = (name, scope, settings) => ({ name, scope, settings });
  return [
    rule("Comments", ["comment", "punctuation.definition.comment", "string.comment"], { foreground: s.comment, fontStyle: "italic" }),
    rule("Variables", ["variable", "entity.name.variable", "string constant.other.placeholder", "support.other.variable"], { foreground: s.variable }),
    rule("Language variables (this/self)", ["variable.language", "variable.language.this", "variable.language.self", "variable.language.super"], { foreground: s.varSpecial, fontStyle: "italic" }),
    rule("Properties", ["variable.other.property", "variable.other.object.property", "support.variable.property", "meta.object-literal.key"], { foreground: s.property }),
    rule("Keywords", ["keyword", "keyword.control", "keyword.other", "storage.type.function.arrow"], { foreground: s.keyword }),
    rule("Storage", ["storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.operator.expression"], { foreground: s.storage }),
    rule("Operators", ["keyword.operator", "punctuation.accessor", "punctuation.separator.key-value"], { foreground: s.operator }),
    rule("Functions", ["entity.name.function", "support.function", "meta.function-call", "meta.function-call.generic", "variable.function", "keyword.other.special-method"], { foreground: s.func }),
    rule("Methods", ["entity.name.method", "meta.class-method entity.name.function", "variable.function.constructor"], { foreground: s.func, fontStyle: "italic" }),
    rule("Classes / types", ["entity.name.type", "entity.name.class", "entity.name.namespace", "entity.name.module", "support.type", "support.class", "entity.other.inherited-class", "storage.type.primitive", "storage.type.built-in"], { foreground: s.type }),
    rule("Interfaces / type params", ["entity.name.type.interface", "entity.name.type.parameter", "entity.name.type.alias", "entity.name.type.enum"], { foreground: s.iface }),
    rule("Strings", ["string", "string.quoted", "string.template", "punctuation.definition.string", "constant.other.symbol"], { foreground: s.string }),
    rule("Template interpolation", ["punctuation.definition.template-expression", "punctuation.section.embedded", "meta.template.expression"], { foreground: s.keyword }),
    rule("Numbers", ["constant.numeric", "keyword.other.unit"], { foreground: s.number }),
    rule("Constants", ["constant.language", "constant.character", "constant.other", "support.constant", "variable.other.constant", "variable.other.enummember"], { foreground: s.constant }),
    rule("Tags", ["entity.name.tag", "meta.tag.sgml", "punctuation.definition.tag"], { foreground: s.tag }),
    rule("Tag attributes", ["entity.other.attribute-name"], { foreground: s.attr }),
    rule("HTML attributes", ["text.html.basic entity.other.attribute-name.html", "entity.other.attribute-name.class", "entity.other.attribute-name.id"], { foreground: D.yellow0 }),
    rule("Components", ["support.class.component", "entity.name.tag.jsx", "entity.name.tag.tsx"], { foreground: s.iface }),
    rule("Decorators", ["meta.decorator", "punctuation.decorator", "entity.name.function.decorator", "tag.decorator.js entity.name.tag.js"], { foreground: s.deco, fontStyle: "italic" }),
    rule("JSON keys", ["support.type.property-name.json", "source.json meta.structure.dictionary.json support.type.property-name.json"], { foreground: s.jsonKey }),
    rule("JSON nested keys", ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"], { foreground: D.yellow0 }),
    rule("JSON deep keys", ["source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"], { foreground: D.yellow1 }),
    rule("CSS properties", ["support.type.property-name.css", "support.type.property-name.scss", "support.type.property-name.sass", "support.type.property-name.less"], { foreground: D.ice }),
    rule("CSS selectors", ["entity.other.attribute-name.class.css", "entity.other.attribute-name.id.css", "entity.name.tag.css", "entity.other.attribute-name.pseudo-class.css"], { foreground: s.func }),
    rule("CSS values", ["support.constant.property-value.css", "constant.other.color.rgb-value"], { foreground: s.constant }),
    rule("Markdown headings", ["markup.heading", "entity.name.section.markdown", "markup.heading.markdown punctuation.definition.heading.markdown"], { foreground: D.yellow1, fontStyle: "bold" }),
    rule("Markdown bold", ["markup.bold"], { foreground: D.coral, fontStyle: "bold" }),
    rule("Markdown italic", ["markup.italic"], { foreground: D.coral, fontStyle: "italic" }),
    rule("Markdown links", ["markup.underline.link", "string.other.link.title.markdown"], { foreground: D.blue0 }),
    rule("Markdown link text", ["string.other.link.description.title.markdown"], { foreground: D.purple0 }),
    rule("Markdown quote", ["markup.quote"], { foreground: s.comment, fontStyle: "italic" }),
    rule("Markdown code", ["markup.inline.raw", "markup.fenced_code.block", "markup.raw.block"], { foreground: D.purple0 }),
    rule("Markdown list", ["punctuation.definition.list.begin.markdown", "punctuation.definition.list_item.markdown"], { foreground: p.frame }),
    rule("Markdown separator", ["meta.separator"], { foreground: D.greyDim, fontStyle: "bold" }),
    rule("Inserted", ["markup.inserted"], { foreground: D.green0 }),
    rule("Deleted", ["markup.deleted"], { foreground: D.red2 }),
    rule("Changed", ["markup.changed"], { foreground: D.purple0 }),
    rule("Invalid", ["invalid", "invalid.illegal"], { foreground: s.invalid, fontStyle: "underline" }),
    rule("Punctuation", ["punctuation", "meta.brace", "punctuation.definition.parameters", "punctuation.terminator", "punctuation.separator"], { foreground: s.punct }),
    rule("Escapes", ["constant.character.escape"], { foreground: s.regex }),
    rule("Regex", ["string.regexp", "constant.other.character-class.regexp", "keyword.control.anchor.regexp"], { foreground: s.regex }),
    rule("Links", ["*url*", "*link*", "*uri*"], { fontStyle: "underline" })
  ];
}

function semanticTokenColors(p) {
  const s = p.syntax;
  return {
    "parameter": s.property,
    "property": s.property,
    "variable": s.variable,
    "variable.readonly": s.constant,
    "function": s.func,
    "method": s.func,
    "class": s.type,
    "interface": s.iface,
    "enum": s.type,
    "enumMember": s.constant,
    "type": s.type,
    "typeParameter": s.iface,
    "namespace": s.type,
    "decorator": s.deco,
    "regexp": s.regex,
    "keyword": s.keyword,
    "*.defaultLibrary": s.varSpecial
  };
}

// ——— Validation ———
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NATIVE = /^dune\.titleBar\.controls/;
const keysPath = process.env.DUNE_THEME_KEYS ?? join(homedir(), "Projects/dune/dune-ide/apps/tauri-ide/schemas/dune-theme-keys.json");
const knownKeys = existsSync(keysPath)
  ? new Set(JSON.parse(readFileSync(keysPath, "utf8")).keys.flatMap((k) => [k.key, k.altKey].filter(Boolean)))
  : null;
const norm = (k) => k.replace(/^dune\./, "").split(".").join("-");
const knownNorm = knownKeys ? new Set([...knownKeys].map(norm)) : null;

function validate(p, c) {
  const errors = [];
  for (const [k, v] of Object.entries(c)) {
    if (k.startsWith("//")) continue;
    if (k.startsWith("dune.")) {
      if (String(v).includes("${")) errors.push(`${k}: value contains "\${"`);
      if (knownNorm && !NATIVE.test(k) && !knownNorm.has(norm(k)) && !knownKeys.has(k)) errors.push(`${k}: unknown dune.* key`);
      if (NATIVE.test(k) && knownKeys && !knownKeys.has(k)) errors.push(`${k}: unknown native key`);
    } else if (!HEX.test(v)) {
      errors.push(`${k}: "${v}" is not #hex (standard keys are hex-only)`);
    }
  }
  const pairs = [
    ["text / editor", p.text, p.editor, 4.5],
    ["text / sidebar", p.text, p.sidebar, 4.5],
    ["text / panel", p.text, p.panel, 4.5],
    ["text / widget", p.text, p.widget, 4.5],
    ["textMuted / editor", p.textMuted, p.editor, 4.5],
    ["textMuted / sidebar", p.textMuted, p.sidebar, 4.5],
    ["textFaint / editor", p.textFaint, p.editor, 2.5],
    ["accentFg / accent", p.accentFg, p.accent, 4.5],
    ["accentFg / accentHover", p.accentFg, p.accentHover, 4.5],
    ["tabActive", p.tabActiveFg, p.tabActiveBg, 4.5],
    ["tabInactive", p.tabInactiveFg, p.tabInactiveBg, 4.5],
    ["title fg / bg", p.titleFg, p.titleBg, 4.5],
    ["title muted / bg", p.titleFgMuted, p.titleBg, 4.5],
    ["omnibar fg", p.omnibarFg, p.titleIsBlock ? p.omnibarBg ?? p.hot : p.input, 4.5],
    ["title fg / title bar", p.titleFg, p.titleBg, 4.5],
    ["button fg / button", btnFg(p), p.button ?? p.widget, 4.5],
    ["view header fg / raised", p.frame, p.raised, 3],
    ...p.seg.map((sg, i) => [`segFg / seg${i + 1}`, p.segFg, p.kvantum ? p.button : sg, 4.5])
  ];
  for (const [label, fg, bg, min] of pairs) {
    const r = contrast(fg, bg);
    if (r < min) errors.push(`contrast ${label}: ${r.toFixed(2)} < ${min} (${fg} on ${bg})`);
  }
  return errors;
}

// ——— Emit ———
mkdirSync(join(root, "themes"), { recursive: true });
let failed = false;
for (const p of VARIANTS) {
  const c = { ...colors(p), ...duneChrome(p) };
  const errs = validate(p, c);
  if (errs.length) {
    failed = true;
    console.error(`✗ ${p.name}\n  - ` + errs.join("\n  - "));
  }
  const theme = {
    "$schema": "https://raw.githubusercontent.com/duneyou/dune-ide-new/main/apps/tauri-ide/schemas/dune-theme.schema.json",
    name: p.name,
    type: "dark",
    // Daemon: transparent window (square edges, desktop around the frame), same opt-in as LCARS.
    ...(p.kvantum ? { duneWindowTransparent: true } : {}),
    semanticHighlighting: true,
    colors: c,
    tokenColors: tokenColors(p),
    semanticTokenColors: semanticTokenColors(p)
  };
  writeFileSync(join(root, "themes", p.file), JSON.stringify(theme, null, 2) + "\n");
  console.log(`wrote themes/${p.file} (${Object.keys(c).length} color keys)`);
}
const icons = buildIcons(root);
console.log(`wrote icons/dune-punk-icon-theme.json (${icons.badges} icons)`);
console.log(`wrote icons/dune-punk-circles-icon-theme.json (${icons.circles} icons)`);
if (!knownKeys) console.warn(`! ${keysPath} not found — dune.* key names were not checked`);
if (failed) {
  console.error("validation failed");
  process.exit(1);
}
console.log("validation ok");
