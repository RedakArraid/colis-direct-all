#!/usr/bin/env bash
# Répare variant IDE (devDebug) + artefacts redirect pour Android Studio.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=_android-env.sh
source "$(dirname "$0")/_android-env.sh"

echo "→ Build devDebug + compat redirect debug…"
./gradlew clean assembleDevDebug syncIdeDebugRedirect

REDIRECT="$ROOT/app/build/intermediates/apk_ide_redirect_file/debug/createDebugApkListingFileRedirect/redirect.txt"
if [ -f "$REDIRECT" ]; then
  echo "✓ redirect.txt (debug) : OK"
else
  echo "❌ redirect.txt (debug) manquant"
  exit 1
fi

# Réinitialiser le cache IDE local (variant souvent bloqué sur « debug »)
if [ -d "$ROOT/.idea" ]; then
  echo "→ Sauvegarde .idea → .idea.bak.$(date +%Y%m%d%H%M%S)"
  mv "$ROOT/.idea" "$ROOT/.idea.bak.$(date +%Y%m%d%H%M%S)"
fi

echo ""
echo "→ Ouvrez Android Studio sur : $ROOT"
echo "  Variant attendu : devDebug (flavor dev isDefault=true)"
echo "  Puis : File → Sync Project with Gradle Files"
open -a "Android Studio" "$ROOT" 2>/dev/null || true
