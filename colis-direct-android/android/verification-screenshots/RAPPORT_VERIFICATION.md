# Rapport de vérification visuelle — ColisDirect Android (dev)

**Date :** 4 juin 2026  
**Appareil :** `emulator-5554` (Pixel API 35)  
**Package :** `ci.colisdirect.app.dev`  
**APK :** `app/build/outputs/apk/dev/debug/app-dev-debug.apk`

## Synthèse

| Statut | Détail |
|--------|--------|
| **P1 + P2** | Livrés côté code (voir `MOBILE_UI.md`) |
| **Build** | `assembleDevDebug` OK |
| **Vérif. invité** | 9 écrans — `verification-screenshots/` |
| **Vérif. connecté** | 11 écrans — `verification-screenshots/connected/` (compte E2E) |

Connexion automatisée : bouton debug **« Connexion test (client E2E) »** (`BuildConfig.DEBUG`) + script `verify-screenshots-connected.sh` (tap `540,1463`).

Compte : `e2e+client@colisdirect.test` (API staging par défaut sur flavor dev).

---

## Captures invité

| # | Fichier | Écran | Résultat |
|---|---------|-------|----------|
| 1 | `01_accueil.png` | Accueil invité | OK |
| 2 | `02_mes_colis.png` | Mes colis (gate login) | OK |
| 3 | `03_suivre.png` | Suivre | OK |
| 4 | `04_relais.png` | Relais / carte OSM | OK |
| 5 | `05_profil_login.png` | Profil / Connexion | OK |
| 6 | `06_notifications.png` | Notifications invité | OK |
| 7 | `07_tarifs.png` | Tarifs | OK |
| 8 | `08_partenaire.png` | Partenaire | OK |
| 9 | `09_fab_invite_redirige_profil.png` | FAB invité → Profil | OK |

---

## Captures client connecté

| # | Fichier | Écran | Résultat |
|---|---------|-------|----------|
| 1 | `01_accueil_client.png` | Accueil | OK |
| 2 | `02_mes_colis.png` | Liste colis (vide) | OK — filtres + CTA envoi |
| 3 | `03_suivre.png` | Suivre | OK |
| 4 | `04_relais.png` | Carte relais | OK |
| 5 | `05_profil_client.png` | Profil client | OK — Client E2E, menu |
| 6 | `06_notifications.png` | Notifications | OK |
| 7 | `07_tarifs.png` | Tarifs | OK |
| 8 | `08_creation_etape1.png` | Création colis étape 1 | OK (via « + » Mes colis) |
| 9 | `09_carnet_adresses.png` | Carnet | OK |
| 10 | `10_historique_paiements.png` | Historique paiements | OK |
| 11 | `11_mes_colis_vide.png` | Mes colis (récap) | OK — pas de colis en base E2E |

**Non validé visuellement :** détail colis (aucun envoi sur le compte E2E), paiement Paystack, rôles relais/transporteur.

---

## Relancer

```bash
cd colis-direct-android/android
./scripts/verify-screenshots.sh emulator-5554
bash scripts/verify-screenshots-connected.sh emulator-5554
```

API flavor **dev** : `https://staging-api.colisdirect.com/api/` (ou backend local via `dev.api.base.url` dans `local.properties`).
