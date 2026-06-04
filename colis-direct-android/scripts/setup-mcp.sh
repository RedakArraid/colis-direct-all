#!/usr/bin/env bash
# Vérifie les prérequis MCP Android (mobile-mcp) pour ColisDirect
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

echo "=== ColisDirect — setup MCP Android ==="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js requis (22+ recommandé pour mobile-mcp)"
  exit 1
fi
echo "✓ Node $(node -v)"

if [ ! -x "$SDK/platform-tools/adb" ]; then
  echo "❌ adb introuvable dans $SDK/platform-tools"
  echo "   Installez Android SDK Platform-Tools (Android Studio)"
  exit 1
fi
echo "✓ adb ($("$SDK/platform-tools/adb" version | head -1))"

export PATH="$SDK/platform-tools:$SDK/emulator:$PATH"
echo ""
echo "Appareils connectés :"
adb devices -l || true

echo ""
echo "AVD disponibles :"
if command -v emulator >/dev/null 2>&1; then
  emulator -list-avds || echo "(aucun AVD)"
else
  echo "⚠ emulator CLI absent — ajoutez \$SDK/emulator au PATH"
fi

echo ""
echo "Configuration MCP : $ROOT/.cursor/mcp.json"
if [ -f "$ROOT/.cursor/mcp.json" ]; then
  echo "✓ mobile-mcp configuré"
else
  echo "❌ Fichier .cursor/mcp.json manquant à la racine du monorepo"
  exit 1
fi

echo ""
echo "→ Redémarrez Cursor, puis Réglages → Features → MCP → mobile-mcp (vert)"
echo "→ Doc : .cursor/MCP_ANDROID.md"
