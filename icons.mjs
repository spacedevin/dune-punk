// Dune Punk Icons — one grammar for every glyph: a cut-corner hex badge (top-left + bottom-right
// chamfers) with a neon 1.2px stroke, a 14% tint fill, and a short monospace label or glyph.
// Folders are chamfered tab folders. All SVGs are generated here; nothing is hand-copied.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { D } from "./palette.mjs";

const BADGE = "M4.5 1.5H14.5V11.5L11.5 14.5H1.5V4.5Z";
const FONT = "font-family='Menlo, Consolas, monospace' font-weight='700' text-anchor='middle'";

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>\n`;

function badge(color, label) {
  const n = label.replace(/&\w+;/g, "x").length;
  const size = n <= 2 ? 6.4 : n === 3 ? 5 : 4;
  return svg(
    `<path d="${BADGE}" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.2" stroke-linejoin="miter"/>` +
    `<text x="8" y="${8 + size * 0.36}" font-size="${size}" ${FONT} fill="${color}">${label}</text>`
  );
}

function glyph(color, inner) {
  return svg(
    `<path d="${BADGE}" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.2" stroke-linejoin="miter"/>` +
    `<g fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="square" stroke-linejoin="miter">${inner}</g>`
  );
}

const FOLDER = "M1.5 3H6L7.5 4.5H14.5V11.5L12 14H1.5Z";
const FOLDER_OPEN_BACK = "M1.5 14V3H6L7.5 4.5H13V7";
const FOLDER_OPEN_FRONT = "M1.5 14L4 7H15L12.5 14Z";

function folder(color, label, open) {
  const text = label
    ? `<text x="${open ? 9 : 8}" y="${open ? 12.4 : 11.6}" font-size="${label.length <= 2 ? 4.6 : 3.6}" ${FONT} fill="${color}">${label}</text>`
    : `<rect x="3" y="${open ? 9 : 8}" width="2" height="2" fill="${color}"/>`;
  const shape = open
    ? `<path d="${FOLDER_OPEN_BACK}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linejoin="miter"/>` +
      `<path d="${FOLDER_OPEN_FRONT}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.2" stroke-linejoin="miter"/>`
    : `<path d="${FOLDER}" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.2" stroke-linejoin="miter"/>`;
  return svg(shape + text);
}

// Glyph interiors (drawn inside the 16px badge).
const G = {
  file: `<path d="M5 5.5H11M5 8H11M5 10.5H9"/>`,
  image: `<path d="M4 11L6.5 7.5L8.5 10L10 8.5L12 11Z" fill="currentColor"/><rect x="9.6" y="4.4" width="1.6" height="1.6"/>`,
  lock: `<rect x="5" y="7.5" width="6" height="4.5"/><path d="M6 7.5V5.5L7 4.5H9L10 5.5V7.5"/>`,
  git: `<path d="M5.5 4.5V11.5M5.5 8H8.5L10.5 6"/><rect x="9.8" y="4.2" width="1.6" height="1.6"/><rect x="4.7" y="10.7" width="1.6" height="1.6"/>`,
  gear: `<path d="M8 4V5.3M8 10.7V12M4 8H5.3M10.7 8H12M5.2 5.2L6.1 6.1M9.9 9.9L10.8 10.8M5.2 10.8L6.1 9.9M9.9 6.1L10.8 5.2"/><rect x="6.6" y="6.6" width="2.8" height="2.8"/>`,
  info: `<path d="M8 7V11.5M8 4.6V5.4"/>`,
  key: `<rect x="4" y="6" width="3.5" height="3.5"/><path d="M7.5 7.75H12M10.5 7.75V9.5M12 7.75V9"/>`,
  terminal: `<path d="M4.5 5.5L7 8L4.5 10.5M8 11H11.5"/>`,
  docker: `<path d="M3.5 8.5H12.5L11.5 11.5H5Z"/><path d="M5 6.5H6.5V8.5M7 6.5H8.5V8.5M9 6.5H10.5V8.5M7 4.5H8.5V6.5"/>`,
  braces: `<path d="M6.5 4.5H5.5V7L4.5 8L5.5 9V11.5H6.5M9.5 4.5H10.5V7L11.5 8L10.5 9V11.5H9.5"/>`,
  table: `<rect x="4" y="4.5" width="8" height="7"/><path d="M4 7H12M4 9.3H12M7 4.5V11.5"/>`,
  font: `<path d="M5 11.5L8 4.5L11 11.5M6.2 9H9.8"/>`,
  audio: `<path d="M6 10.5V5L11 4V9.5"/><rect x="4.5" y="9.6" width="1.8" height="1.8"/><rect x="9.5" y="8.6" width="1.8" height="1.8"/>`,
  video: `<rect x="4" y="5" width="5.5" height="6"/><path d="M9.5 7L12 5.5V10.5L9.5 9"/>`,
  zip: `<path d="M8 4V12M7 5H8M8 6H9M7 7H8M8 8H9"/><rect x="6.8" y="9" width="2.4" height="2.4"/>`,
  pdf: `<path d="M5 4.5H9.5L11 6V11.5H5Z M9.5 4.5V6H11"/>`,
  test: `<path d="M4.5 8.5L7 11L11.5 5"/>`,
  agent: `<path d="M8 4L12 8L8 12L4 8Z"/><rect x="7.2" y="7.2" width="1.6" height="1.6"/>`,
  license: `<path d="M5 4.5H11V11.5H5ZM6.5 6.5H9.5M6.5 8.5H9.5"/>`
};

// [id, kind, color, label|glyph]
const FILES = [
  ["file", "glyph", D.ice, "file"],
  ["ts", "badge", D.blue0, "TS"],
  ["tsx", "badge", D.cyan0, "TSX"],
  ["dts", "badge", D.ice, "D.TS"],
  ["js", "badge", D.yellow0, "JS"],
  ["jsx", "badge", D.yellow1, "JSX"],
  ["rs", "badge", D.orange, "RS"],
  ["tish", "badge", D.red2, "TSH"],
  ["md", "badge", D.ice, "MD"],
  ["json", "glyph", D.yellow1, "braces"],
  ["py", "badge", D.cyan0, "PY"],
  ["go", "badge", D.blue0, "GO"],
  ["css", "badge", D.purple0, "CSS"],
  ["scss", "badge", D.pink0, "SCS"],
  ["html", "badge", D.coral, "&lt;&gt;"],
  ["vue", "badge", D.green0, "VUE"],
  ["svelte", "badge", D.red1, "SV"],
  ["yaml", "badge", D.pink0, "YML"],
  ["toml", "badge", D.amber, "TML"],
  ["xml", "badge", D.orange, "XML"],
  ["sh", "glyph", D.green0, "terminal"],
  ["swift", "badge", D.orange, "SW"],
  ["kt", "badge", D.purple0, "KT"],
  ["java", "badge", D.red2, "JV"],
  ["c", "badge", D.blue0, "C"],
  ["cpp", "badge", D.blue0, "C++"],
  ["h", "badge", D.purple0, "H"],
  ["cs", "badge", D.green0, "C#"],
  ["rb", "badge", D.red1, "RB"],
  ["php", "badge", D.purple0, "PHP"],
  ["lua", "badge", D.blue0, "LUA"],
  ["zig", "badge", D.amber, "ZIG"],
  ["sql", "glyph", D.yellow1, "table"],
  ["csv", "glyph", D.green0, "table"],
  ["wasm", "badge", D.purple0, "WSM"],
  ["svg", "badge", D.orange, "SVG"],
  ["image", "glyph", D.purple0, "image"],
  ["font", "glyph", D.ice, "font"],
  ["audio", "glyph", D.pink0, "audio"],
  ["video", "glyph", D.pink0, "video"],
  ["zip", "glyph", D.amber, "zip"],
  ["pdf", "glyph", D.red1, "pdf"],
  ["txt", "glyph", D.grey, "file"],
  ["log", "badge", D.grey, "LOG"],
  ["lock", "glyph", D.grey, "lock"],
  ["env", "glyph", D.yellow0, "key"],
  ["config", "glyph", D.ice, "gear"],
  ["git", "glyph", D.red2, "git"],
  ["docker", "glyph", D.blue0, "docker"],
  ["npm", "badge", D.red1, "NPM"],
  ["readme", "glyph", D.blue0, "info"],
  ["license", "glyph", D.yellow1, "license"],
  ["test", "glyph", D.green0, "test"],
  ["agent", "glyph", D.magenta0, "agent"],
  ["make", "badge", D.orange, "MK"],
  ["graphql", "badge", D.pink0, "GQL"],
  ["proto", "badge", D.cyan0, "PB"]
];

// [id, color, label]
const FOLDERS = [
  ["folder", D.red2, ""],
  ["folder-src", D.blue0, "SRC"],
  ["folder-git", D.red2, "GIT"],
  ["folder-node", D.green0, "NM"],
  ["folder-dune", D.yellow0, "DN"],
  ["folder-test", D.green0, "TST"],
  ["folder-docs", D.ice, "DOC"],
  ["folder-assets", D.purple0, "AST"],
  ["folder-config", D.ice, "CFG"],
  ["folder-dist", D.grey, "OUT"],
  ["folder-scripts", D.green0, "SH"],
  ["folder-components", D.cyan0, "CMP"],
  ["folder-styles", D.pink0, "CSS"],
  ["folder-public", D.yellow1, "PUB"],
  ["folder-github", D.ice, "GH"],
  ["folder-vscode", D.blue0, "VS"],
  ["folder-lib", D.orange, "LIB"],
  ["folder-api", D.magenta0, "API"],
  ["folder-themes", D.pink0, "THM"],
  ["folder-icons", D.orange, "ICO"]
];

const EXT = {
  ts: "ts", mts: "ts", cts: "ts", "d.ts": "dts", tsx: "tsx",
  js: "js", mjs: "js", cjs: "js", jsx: "jsx",
  rs: "rs", tish: "tish", md: "md", mdx: "md", markdown: "md",
  json: "json", jsonc: "json", json5: "json", jsonl: "json",
  py: "py", pyi: "py", go: "go", css: "css", scss: "scss", sass: "scss", less: "css",
  html: "html", htm: "html", vue: "vue", svelte: "svelte",
  yml: "yaml", yaml: "yaml", toml: "toml", xml: "xml", plist: "xml",
  sh: "sh", bash: "sh", zsh: "sh", fish: "sh", ps1: "sh",
  swift: "swift", kt: "kt", kts: "kt", java: "java", c: "c", cpp: "cpp", cc: "cpp", cxx: "cpp",
  h: "h", hpp: "h", cs: "cs", rb: "rb", php: "php", lua: "lua", zig: "zig",
  sql: "sql", csv: "csv", tsv: "csv", wasm: "wasm", svg: "svg",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", ico: "image", icns: "image", bmp: "image", avif: "image",
  ttf: "font", otf: "font", woff: "font", woff2: "font",
  mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio",
  mp4: "video", mov: "video", webm: "video", mkv: "video",
  zip: "zip", tar: "zip", gz: "zip", tgz: "zip", "7z": "zip", rar: "zip", dmg: "zip", vsix: "zip",
  pdf: "pdf", txt: "txt", log: "log", lock: "lock",
  env: "env", ini: "config", conf: "config", cfg: "config", editorconfig: "config",
  graphql: "graphql", gql: "graphql", proto: "proto", mk: "make"
};

const NAMES = {
  "package.json": "npm", "package-lock.json": "lock", "pnpm-lock.yaml": "lock", "yarn.lock": "lock", "bun.lockb": "lock", "bun.lock": "lock",
  "cargo.toml": "rs", "cargo.lock": "lock", "go.mod": "go", "go.sum": "lock",
  "tsconfig.json": "config", "jsconfig.json": "config", "vite.config.ts": "config", "vite.config.js": "config",
  ".gitignore": "git", ".gitattributes": "git", ".gitmodules": "git", ".gitkeep": "git",
  ".env": "env", ".env.local": "env", ".env.development": "env", ".env.production": "env", ".env.example": "env",
  "dockerfile": "docker", "docker-compose.yml": "docker", "docker-compose.yaml": "docker", "compose.yml": "docker", ".dockerignore": "docker",
  "readme.md": "readme", "readme": "readme", "changelog.md": "readme",
  "license": "license", "license.md": "license", "license.txt": "license",
  "makefile": "make", "justfile": "make",
  ".editorconfig": "config", ".prettierrc": "config", ".eslintrc": "config", "eslint.config.js": "config", "eslint.config.mjs": "config",
  ".npmrc": "config", ".nvmrc": "config",
  "claude.md": "agent", "agents.md": "agent", "llms.md": "agent", "skill.md": "agent", "mcp.json": "agent"
};

const FOLDER_NAMES = {
  src: "folder-src", source: "folder-src", app: "folder-src", apps: "folder-src",
  ".git": "folder-git", node_modules: "folder-node",
  ".dune": "folder-dune", ".cursor": "folder-dune", ".claude": "folder-dune",
  test: "folder-test", tests: "folder-test", __tests__: "folder-test", spec: "folder-test", e2e: "folder-test",
  docs: "folder-docs", doc: "folder-docs",
  assets: "folder-assets", images: "folder-assets", img: "folder-assets", media: "folder-assets",
  config: "folder-config", configs: "folder-config", ".config": "folder-config",
  dist: "folder-dist", build: "folder-dist", out: "folder-dist", target: "folder-dist", ".next": "folder-dist",
  scripts: "folder-scripts", bin: "folder-scripts",
  components: "folder-components", ui: "folder-components",
  styles: "folder-styles", css: "folder-styles",
  public: "folder-public", static: "folder-public",
  ".github": "folder-github", ".vscode": "folder-vscode",
  lib: "folder-lib", libs: "folder-lib", packages: "folder-lib", crates: "folder-lib",
  api: "folder-api", server: "folder-api",
  themes: "folder-themes", icons: "folder-icons"
};

// Dune Punk Circles — the Daemon-Icons look (Simply Circles): every glyph is one cyan line drawing
// inside a ring. Monochrome by design; expanded folders fill the ring.
const RING = (c, open) =>
  `<circle cx="8" cy="8" r="6.6" fill="${c}" fill-opacity="${open ? 0.22 : 0.08}" stroke="${c}" stroke-width="1.2"/>`;

function ringLabel(c, label, y = 8) {
  const n = label.replace(/&\w+;/g, "x").length;
  const size = n <= 2 ? 5.2 : n === 3 ? 4.1 : 3.4;
  return `<text x="8" y="${y + size * 0.36}" font-size="${size}" ${FONT} fill="${c}">${label}</text>`;
}

const ringGlyph = (c, inner) =>
  `<g transform="translate(8 8) scale(0.8) translate(-8 -8)" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="square" stroke-linejoin="miter">${inner.replace(/currentColor/g, c)}</g>`;

const RING_FOLDER = "M4.6 5.6H7L7.8 6.4H11.4V10.6H4.6Z";
const RING_FOLDER_TAB = "M5.6 4.4H7.2L7.8 5H10.4";

function ringFile(c, kind, what) {
  return svg(RING(c, false) + (kind === "badge" ? ringLabel(c, what) : ringGlyph(c, G[what])));
}

function ringFolder(c, label, open) {
  const body = label
    ? `<path d="${RING_FOLDER_TAB}" fill="none" stroke="${c}" stroke-width="1"/>` + ringLabel(c, label, 9)
    : `<path d="${RING_FOLDER}" fill="${open ? c : "none"}" fill-opacity="0.35" stroke="${c}" stroke-width="1.1" stroke-linejoin="miter"/>`;
  return svg(RING(c, open) + body);
}

function writeTheme(root, dirName, jsonName, render) {
  const dir = join(root, "icons", dirName);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const defs = {};
  const put = (id, content) => {
    writeFileSync(join(dir, `${id}.svg`), content);
    defs[id] = { iconPath: `./${dirName}/${id}.svg` };
  };
  for (const [id, kind, color, what] of FILES) put(id, render.file(color, kind, what));
  for (const [id, color, label] of FOLDERS) {
    put(id, render.folder(color, label, false));
    put(`${id}-open`, render.folder(color, label, true));
  }
  const folderNames = {}, folderNamesExpanded = {};
  for (const [name, id] of Object.entries(FOLDER_NAMES)) {
    folderNames[name] = id;
    folderNamesExpanded[name] = `${id}-open`;
  }
  const theme = {
    iconDefinitions: defs,
    file: "file",
    folder: "folder",
    folderExpanded: "folder-open",
    rootFolder: "folder",
    rootFolderExpanded: "folder-open",
    fileExtensions: EXT,
    fileNames: NAMES,
    folderNames,
    folderNamesExpanded,
    hidesExplorerArrows: false
  };
  writeFileSync(join(root, "icons", jsonName), JSON.stringify(theme, null, 2) + "\n");
  return Object.keys(defs).length;
}

export function buildIcons(root) {
  const badges = writeTheme(root, "svg", "dune-punk-icon-theme.json", {
    file: (c, kind, what) => (kind === "badge" ? badge(c, what) : glyph(c, G[what].replace(/currentColor/g, c))),
    folder
  });
  const circles = writeTheme(root, "circles", "dune-punk-circles-icon-theme.json", {
    file: (_c, kind, what) => ringFile(D.blue0, kind, what),
    folder: (_c, label, open) => ringFolder(D.blue0, label, open)
  });
  return { badges, circles };
}
