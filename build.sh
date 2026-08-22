#!/usr/bin/env sh
set -eu

corepack enable
pnpm install --frozen-lockfile
pnpm build

echo "Build complete: dist/"
