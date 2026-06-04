#!/usr/bin/env bash
# Désinstalle les anciennes apps ColisDirect (Capacitor / staging) sur l'émulateur.
set -euo pipefail
# shellcheck source=_android-env.sh
source "$(cd "$(dirname "$0")" && pwd)/_android-env.sh"

if ! command -v adb >/dev/null 2>&1; then
  echo "❌ adb introuvable. Voir android/scripts/_android-env.sh (ANDROID_HOME)."
  exit 1
fi

for pkg in ci.colisdirect.app ci.colisdirect.app.staging; do
  adb uninstall "$pkg" 2>/dev/null && echo "✓ Désinstallé $pkg" || true
done
echo "→ Conserver ci.colisdirect.app.dev (app native actuelle)"
