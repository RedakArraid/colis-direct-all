# Processus global — Points relais (candidature → exploitation)

Ce document décrit le flux métier et technique pour intégrer un commerce comme point relais COLISDIRECT, de la candidature à l’accès au tableau de bord partenaire.

## 1. Candidature publique

- Un commerce soumet une candidature via l’API publique `POST /api/relay-applications` (sans authentification).
- Les champs obligatoires incluent identité du contact, commerce, téléphone, e-mail, commune, quartier, adresse, etc.
- La validation côté API reste **simple** (champs requis, coordonnées GPS si présentes, format e-mail par regex).
- À l’enregistrement :
  - e-mail de confirmation au candidat ;
  - notification à l’équipe support (si e-mail / n8n configurés).

**Important :** la candidature ne crée **pas** encore de ligne `relay_points` ni de compte `users` avec rôle partenaire.

## 2. Examen par admin / support

- Liste et détail : `GET /api/relay-applications` et `GET /api/relay-applications/:id` (rôles `admin`, `support`).
- Le statut peut évoluer : `pending`, `on_hold`, `rejected`, `approved`.
- Mise à jour libellés / notes : `PATCH /api/relay-applications/:id` sur les champs autorisés.

## 3. Première approbation (`approved`)

Lorsqu’un staff passe le statut à `approved` **pour la première fois** (la candidature n’était pas déjà approuvée), le backend enchaîne dans une **transaction** :

1. **Vérifications de conflit** (avant la transaction) :
   - si un utilisateur existe avec le même e-mail et le rôle `admin`, `support` ou `transporter` → erreur `409` (éviter de piéger un compte interne ou livreur) ;
   - si **aucun** utilisateur n’existe pour cet e-mail mais le **téléphone** est déjà utilisé par un autre compte → `409` (évite un doublon téléphone à la création).

2. **Création du point relais** : `INSERT` dans `relay_points` (type normalisé : cybercafé / imprimerie / supérette, lien `application_id`, etc.).

3. **Compte partenaire** :
   - **E-mail déjà connu** (`client`, `pro`, `relay_partner`, `user`, …) : `UPDATE users` → `role = 'relay_partner'`, `relay_point_id` = nouvel ID, téléphone mis à jour si fourni.
   - **E-mail inconnu** : `INSERT users` avec rôle `relay_partner`, mot de passe **provisoire** généré de façon aléatoire, hash bcrypt.

4. **Mise à jour de la candidature** : statut `approved`, `approved_relay_point_id`, `reviewed_by`, `reviewed_at`.

5. **Journal** : entrée d’activité admin (`approve_relay_application`).

6. **E-mail au candidat** : message d’approbation **avec** soit le mot de passe temporaire (nouveau compte), soit l’indication de se connecter avec le compte existant (lien vers `FRONTEND_URL/login` si défini).

En cas d’erreur SQL, la transaction est annulée : aucun relais orphelin ni utilisateur partiel.

## 4. Connexion et exploitation

- Après approbation, le partenaire ouvre la **page de connexion** classique (`LoginPage`).
- Le JWT indique `role: relay_partner` → redirection vers **`RelayDashboard`** (`App.tsx` / `AuthContext`).
- Le tableau de bord s’appuie sur `relay_point_id` du profil pour afficher et scanner les colis du point.

## 5. Inscription grand public (contexte sécurité)

- `POST /api/auth/signup` force le rôle **`client`** : impossible de s’inscrire comme admin ou partenaire via le body.
- Mot de passe signup : longueur minimale (ex. 6 caractères), unicité du **téléphone** si renseigné.

## 6. API utilisateur par e-mail

- `GET /api/users/by-email/:email` : **authentification obligatoire** ; un utilisateur ne peut consulter que **son propre** e-mail ; les **admin** peuvent consulter n’importe quel e-mail (évite l’énumération d’utilisateurs).

## 7. Création manuelle transporteur (admin)

- Lors de la création d’un utilisateur transporteur depuis l’admin, un mot de passe temporaire **aléatoire** est généré côté client (plus de mot de passe fixe partagé).

---

*Pour le détail des statuts colis et scans au relais, voir `FLUX_STATUTS_ET_SCANS.md` et `CONDITIONS_RECEPTION_RELAIS.md`.*
