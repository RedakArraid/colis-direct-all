# Préparation production — Android natif

## Flavors et API

| Flavor | Package | API par défaut | Usage |
|--------|---------|----------------|--------|
| **dev** | `ci.colisdirect.app.dev` | `https://staging-api.colisdirect.com/api/` | Développement + E2E (`dev.api.base.url` surcharge possible) |
| **staging** | `ci.colisdirect.app.staging` | `https://staging-api.colisdirect.com/api/` | QA pré-prod |
| **prod** | `ci.colisdirect.app` | `https://api.colisdirect.com/api/` | Store / utilisateurs finaux |

## Builds

```bash
cd colis-direct/android

# Dev (staging API)
./scripts/build-dev.sh

# Prod release (keystore requis dans local.properties)
chmod +x scripts/build-prod.sh
./scripts/build-prod.sh

# Play Store (AAB)
./gradlew bundleProdRelease
```

### Signature release (`local.properties`)

```properties
storeFile=/chemin/vers/colisdirect-release.keystore
storePassword=***
keyAlias=colisdirect
keyPassword=***
```

Voir aussi `local.properties.example`.

## Parcours métier branchés API

| Rôle | Actions |
|------|---------|
| Client | Auth, colis, création, paiement Paystack, suivi, carnet adresses |
| Relais | Réception (`scan/relay-intake`), remise client (`scan/relay/complete-delivery`) — saisie texte |
| Transporteur | Ramassage (`scan/carrier-pickup`), domicile, **livraison** (`POST shipments/{tn}/deliver`) |
| Livreur (UI) | `CourierMainScreen` + preuve livraison → même API `deliver` |

## Avant mise en prod (checklist)

- [ ] QA complète flavor **staging** puis **prod** sur API réelle
- [ ] `./gradlew assembleProdRelease` + test install APK signé
- [ ] Vérifier Paystack / callbacks en prod
- [ ] Confirmer que l’app **native** est bien celle publiée (vs Capacitor historique)
- [ ] Pas de boutons « Connexion rapide » en release prod (`DevE2EAccounts` = DEBUG + ENV dev uniquement)

## Écarts connus (non bloquants store si acceptés produit)

- Maquette UI : hero accueil, profil (moyens paiement, paramètres), code promo
- Paiement : UI maquette + redirect Paystack (pas API OM/MTN natives)
- App livreur : shell « courses » branché sur API logistique existante

*Mis à jour : juin 2026*
