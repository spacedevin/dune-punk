#!/bin/sh
# Install this theme package into the local Dune extensions directory for development —
# the same layout `dune --install-extension dune.dune-punk` produces from a registry.
# Reload the Dune window afterwards to rescan themes.
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="$HOME/.dune/extensions/dune.dune-punk"
rm -rf "$DST"
mkdir -p "$DST/themes" "$DST/icons/svg" "$DST/icons/circles"
cp "$SRC/package.json" "$SRC/README.md" "$SRC/LICENSE" "$SRC/CHANGELOG.md" "$SRC/icon.png" "$DST/"
cp "$SRC"/themes/*.json "$DST/themes/"
cp "$SRC"/icons/*-icon-theme.json "$DST/icons/"
cp "$SRC"/icons/svg/*.svg "$DST/icons/svg/"
cp "$SRC"/icons/circles/*.svg "$DST/icons/circles/"
echo "Installed -> $DST"
