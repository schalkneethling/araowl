#!/usr/bin/env bash
# Run the visual regression tests inside the official Playwright Docker image.
#
# Font rasterization differs between operating systems, so screenshot
# baselines are only reproducible when every run renders on the same Linux
# image — locally and, later, in CI. Never run the VRT config on the host.
#
# Extra arguments pass through to Playwright:
#   pnpm test:vrt -- --update-snapshots
set -euo pipefail

cd "$(dirname "$0")/.."

# Derive versions from the lockfile-installed packages so the image can never
# drift from @playwright/test, and pnpm matches the devEngines pin.
PLAYWRIGHT_VERSION="$(node -p "require('@playwright/test/package.json').version")"
PNPM_VERSION="$(node -p "require('./package.json').devEngines.packageManager.version")"
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

# The repo is bind-mounted, but node_modules is overlaid with a named volume:
# the host install contains macOS-native binaries (Rolldown, Oxlint) that
# cannot run in the container. The pnpm store volume makes reinstalls fast.
exec docker run --rm --init --ipc=host \
  -v "$PWD":/repo \
  -v araowl-vrt-node-modules:/repo/node_modules \
  -v araowl-vrt-pnpm-store:/pnpm-store \
  -w /repo \
  -e CI=1 \
  -e TZ=UTC \
  "$IMAGE" \
  bash -c 'set -euo pipefail
    npm install --global "pnpm@$0" >/dev/null 2>&1
    # Explicit --store-dir: without it pnpm silently creates .pnpm-store/
    # inside the bind-mounted repo when its default store location is on a
    # different filesystem.
    pnpm install --frozen-lockfile --store-dir /pnpm-store
    pnpm exec playwright test --config playwright.vrt.config.ts "$@"' \
  "$PNPM_VERSION" "$@"
