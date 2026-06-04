#!/usr/bin/env bash
# Installe l'outil MCP Installer + pré-télécharge mobile-mcp pour ColisDirect
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
MCP_INSTALLER_PKG="@mcp-installer/cli"
MOBILE_MCP_PKG="@mobilenext/mobile-mcp@latest"

echo "=== ColisDirect — installation MCP ==="
echo ""

# 1. MCP Installer (CLI pour gérer les serveurs MCP dans Cursor, Claude, etc.)
if command -v mcp-installer >/dev/null 2>&1; then
  echo "✓ mcp-installer déjà installé ($(mcp-installer --version 2>/dev/null || echo ok))"
else
  echo "→ Installation globale de ${MCP_INSTALLER_PKG}..."
  npm install -g "${MCP_INSTALLER_PKG}"
  echo "✓ mcp-installer installé ($(mcp-installer --version))"
fi

echo ""
mcp-installer doctor 2>/dev/null | tail -8 || true

# 2. Binaire global mobile-mcp (Cursor ne voit pas toujours npx depuis le Finder)
echo ""
echo "→ Installation globale de ${MOBILE_MCP_PKG}..."
npm install -g "${MOBILE_MCP_PKG}"
MCP_BIN="$(command -v mcp-server-mobile)"
echo "✓ mcp-server-mobile : ${MCP_BIN} ($("${MCP_BIN}" --version 2>/dev/null || true))"

# 3. Config projet (prioritaire quand le workspace est colisdirect-all)
PROJECT_MCP="${ROOT}/.cursor/mcp.json"
if [ -f "${PROJECT_MCP}" ]; then
  echo "✓ Config projet : ${PROJECT_MCP}"
else
  echo "→ Création de ${PROJECT_MCP}..."
  mkdir -p "${ROOT}/.cursor"
  cat > "${PROJECT_MCP}" <<EOF
{
  "mcpServers": {
    "mobile-mcp": {
      "type": "stdio",
      "command": "${MCP_BIN}",
      "args": ["--stdio"],
      "env": {
        "ANDROID_HOME": "${SDK}",
        "PATH": "${SDK}/platform-tools:${SDK}/emulator:${HOME}/.local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "MOBILEMCP_DISABLE_TELEMETRY": "1"
      }
    }
  }
}
EOF
  echo "✓ ${PROJECT_MCP} créé"
fi

# 4. Vérification adb
export PATH="${SDK}/platform-tools:${SDK}/emulator:${PATH}"
if [ -x "${SDK}/platform-tools/adb" ]; then
  echo ""
  echo "Appareils :"
  adb devices -l | sed 's/^/  /' || true
fi

echo ""
echo "=== Terminé ==="
echo "• CLI : mcp-installer list --available | mcp-installer install <nom> --clients=cursor"
echo "• mobile-mcp n'est pas dans le registre mcp-installer → config manuelle dans .cursor/mcp.json (déjà fait)"
echo "• Redémarrer Cursor → Réglages → MCP → mobile-mcp (vert)"
echo "• Doc : ${ROOT}/.cursor/MCP_ANDROID.md"
