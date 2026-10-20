// Daemon 2.0 palette — verbatim from MathisP75/daemon-kde-mk2 `Color Scheme/cyberpunk-colors.css`
// plus the handful of extra values the Daemon VS Code theme uses (selection teal, syntax greys).
// Every color in every Dune Punk variant comes from this table; build.mjs only remixes roles
// and derives tints (mix/alpha) from these values.
export const D = {
  black0: "#272932",
  red0: "#710100",
  red1: "#FB3048",
  red2: "#FF5048",
  yellow0: "#FDF500",
  yellow1: "#CFED58",
  green0: "#28C775",
  cyan0: "#1AC5B0",
  blue0: "#5DF4FE",
  purple0: "#9370DB",
  pink0: "#E455AE",
  magenta0: "#CB1DCD",
  bg0: "#331319",
  bg1: "#210E15",
  bg2: "#040A10",
  surface0: "#14101F",
  // Daemon VS Code theme extras
  teal: "#355D65",
  slate: "#262832",
  coral: "#F07178",
  orange: "#F78C6C",
  ice: "#B2CCD6",
  white: "#EEFFFF",
  grey: "#909094",
  greyDim: "#65737E",
  amber: "#CD9731",
  // Daemon 2.0 KDE packages (Aurorae title text, Kvantum links/buttons, Konsole color0)
  ink: "#070D19",
  link: "#2EB8E6",
  button: "#130F1E",
  night: "#200D14"
};

const hex = (h) => h.replace("#", "");
const toRgb = (h) => {
  const s = hex(h).slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

// a(color, "AA") → hex8 with alpha
export const a = (h, aa) => "#" + hex(h).slice(0, 6).toUpperCase() + aa;

// mix(fg, bg, t) → solid color t of the way from bg to fg
export const mix = (fg, bg, t) => {
  const f = toRgb(fg), b = toRgb(bg);
  return toHex(f.map((v, i) => b[i] + (v - b[i]) * t));
};

const lum = (h) => {
  const c = toRgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export const contrast = (x, y) => {
  const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
};

// SVG data-URI color escaping
export const enc = (c) => c.replace("#", "%23");
