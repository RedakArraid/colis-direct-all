# Tests E2E staging

Ces tests se lancent en local et pilotent le site staging avec Playwright.

## Premiere installation

```bash
npm install
npm run test:e2e:install
cp .env.e2e.example .env.e2e.local
```

Renseigner ensuite les comptes de test dans `.env.e2e.local`.

## Comptes staging dedies

Les comptes E2E reserves sur staging utilisent le domaine `colisdirect.test` :

| Role test | Email | Donnees associees |
| --- | --- | --- |
| Client | `e2e+client@colisdirect.test` | utilisateur client standard |
| Admin | `e2e+admin@colisdirect.test` | role `admin` |
| Point relais | `e2e+relay@colisdirect.test` | rattache a `E2E Point Relais Test` |
| Transporteur | `e2e+transporter@colisdirect.test` | profil transporteur `moto` |
| Support | `e2e+support@colisdirect.test` | role `support` |

Les mots de passe sont stockes uniquement dans `.env.e2e.local` sur la machine locale.
Ne pas les ajouter dans Git, dans les docs ou dans les tickets.

## Authentification des tests

Deux modes existent :

- `E2E_AUTH_MODE=api` : appelle `/auth/signin`. Utile pour tester le formulaire/login API, mais sensible au rate limiter.
- `E2E_AUTH_MODE=jwt` : genere un token localement avec `E2E_JWT_SECRET` et les `E2E_*_USER_ID`.

Pour les runs frequents contre staging, preferer `jwt` afin de ne pas bloquer les comptes avec
`Trop de tentatives`. Le secret JWT et les IDs utilisateurs restent uniquement dans `.env.e2e.local`.

## Lancer les tests

```bash
npm run test:e2e:staging
```

Rapport HTML :

```bash
npm run test:e2e:report
```

Mode navigateur visible :

```bash
npm run test:e2e:headed
```

Mode interactif :

```bash
npm run test:e2e:ui
```

## Workflow recommande

1. Coder sur `dev`.
2. Merger/deployer sur `staging`.
3. Lancer `npm run test:e2e:staging` en local.
4. Lire `test-results/e2e-summary.md` et le rapport HTML.
5. Corriger sur `dev`, puis refaire le cycle.

Les secrets restent dans `.env.e2e.local`, ignore par Git.

## Rapports generes

Apres chaque run, Playwright produit :

- `test-results/e2e-summary.md` : synthese courte pour savoir quoi corriger.
- `playwright-report/index.html` : rapport interactif.
- `test-results/**/trace.zip` : trace rejouable pour chaque echec.

## Etat attendu actuellement

Tant que `https://staging.colisdirect.com` presente le certificat par defaut Traefik, le test
`frontend staging presente un certificat TLS valide` reste desactive avec `E2E_CHECK_FRONTEND_TLS=false`.
Les tests navigateur continuent avec `E2E_IGNORE_HTTPS_ERRORS=true` afin de verifier les parcours
applicatifs. Mettre `E2E_CHECK_FRONTEND_TLS=true` quand le certificat staging devra etre controle.

## Authentification des comptes partenaires

### Compte Relais (`relay_partner`)

Le compte relais utilise le **même formulaire de login** que les clients standard (bouton "Connexion" dans la navbar).
Après une connexion réussie, l'app redirige **automatiquement** vers le dashboard relais — pas de navigation manuelle nécessaire.

```typescript
// Via le helper :
await loginAsRelay(page, 'e2e+relay@colisdirect.test', process.env.E2E_PASSWORD!);
// ou manuellement :
await page.goto('/');
await page.getByRole('navigation').getByRole('button', { name: /Connexion/i }).click();
// ... remplir le formulaire ...
// Attendre la redirection automatique vers le dashboard
await expect(page.getByText(/Tableau de bord relais/i)).toBeVisible({ timeout: 8000 });
```

> ⚠️ **Piège fréquent** : ne pas cliquer sur "Connexion" plusieurs fois. L'app a un rate-limiter côté API.
> Préférer `E2E_AUTH_MODE=jwt` pour les runs fréquents.

### Compte Transporteur (`transporter`)

Le transporteur a un **parcours de login dédié**. `TransporterLoginPage` s'affiche automatiquement
pour tout utilisateur `role=transporter`, remplaçant la page home normale. Il ne faut **pas** chercher
le bouton "Connexion" standard.

```typescript
// Via le helper :
await loginAsTransporter(page, 'e2e+transporter@colisdirect.test', process.env.E2E_PASSWORD!);
// ou avec injection JWT directe (recommandé) :
// Utiliser E2E_AUTH_MODE=jwt + E2E_TRANSPORTER_USER_ID
```

> ⚠️ **Piège fréquent** : le subagent cherche le bouton "Connexion" standard — inexistant pour un
> transporteur. L'app bascule automatiquement sur le composant PIN. Attendre le texte "Tournée"
> ou "Ramassage" comme signal de succès.

