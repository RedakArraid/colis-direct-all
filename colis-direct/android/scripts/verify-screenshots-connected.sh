#!/usr/bin/env bash
# Vérification visuelle — utilisateur connecté (client E2E)
set -euo pipefail

DEVICE="${1:-emulator-5554}"
PKG="ci.colisdirect.app.dev"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/verification-screenshots/connected"
EMAIL="${E2E_CLIENT_EMAIL:-e2e+client@colisdirect.test}"
PASS="${E2E_PASSWORD:-admin123}"

mkdir -p "$OUT_DIR"
tap() { adb -s "$DEVICE" shell input tap "$1" "$2"; sleep 1.5; }
shot() { adb -s "$DEVICE" exec-out screencap -p > "$OUT_DIR/$1"; echo "✓ $1"; }

adb -s "$DEVICE" shell am force-stop "$PKG"
adb -s "$DEVICE" shell am start -n "$PKG/ci.colisdirect.app.MainActivity"
sleep 8

# Connexion (onglet Profil) — bouton debug « Connexion test (client E2E) »
tap 972 2220
sleep 2
tap 540 1410   # Connexion rapide (dev) → Client — premier bouton de la liste
sleep 6

tap 109 2220; sleep 2; shot "01_accueil_client.png"
tap 324 2220; sleep 2; shot "02_mes_colis.png"
tap 992 358; sleep 2; shot "08_creation_etape1.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1
tap 541 2220; shot "03_suivre.png"
tap 756 2220; shot "04_relais.png"
tap 972 2220; sleep 2; shot "05_profil_client.png"

tap 109 2220; sleep 1
tap 1000 150; sleep 2; shot "06_notifications.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1

adb -s "$DEVICE" shell input swipe 540 1400 540 700 400; sleep 1
shot "07_services_rapides.png"

# Profil → carnet / historique
tap 972 2220; sleep 1
adb -s "$DEVICE" shell input swipe 540 1600 540 800 400; sleep 1
tap 540 1050; sleep 2; shot "09_carnet_adresses.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1
tap 972 2220; sleep 1
adb -s "$DEVICE" shell input swipe 540 1600 540 800 400; sleep 1
tap 540 1150; sleep 2; shot "10_historique_paiements.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1

# Profil → infos / moyens / paramètres
tap 972 2220; sleep 1
adb -s "$DEVICE" shell input swipe 540 1600 540 700 500; sleep 1
tap 540 920; sleep 2; shot "12_profil_edit.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1
tap 972 2220; sleep 1
adb -s "$DEVICE" shell input swipe 540 1600 540 700 500; sleep 1
tap 540 980; sleep 2; shot "13_moyens_paiement.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1
tap 972 2220; sleep 1
adb -s "$DEVICE" shell input swipe 540 1600 540 700 500; sleep 1
tap 540 1180; sleep 2; shot "14_parametres.png"
adb -s "$DEVICE" shell input keyevent 4; sleep 1

# Pas de colis E2E → capture liste vide (évite tap aléatoire hors app)
tap 324 2220; sleep 2; shot "11_mes_colis_vide.png"

echo ""
echo "Captures client connecté : $OUT_DIR"
ls -la "$OUT_DIR"/*.png 2>/dev/null
