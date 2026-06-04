#!/usr/bin/env bash
# Build APK dev (API staging par défaut ; voir local.properties → dev.api.base.url)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=_android-env.sh
source "$(dirname "$0")/_android-env.sh"

./gradlew assembleDevDebug "$@"
echo ""
echo "APK: app/build/outputs/apk/dev/debug/app-dev-debug.apk"
