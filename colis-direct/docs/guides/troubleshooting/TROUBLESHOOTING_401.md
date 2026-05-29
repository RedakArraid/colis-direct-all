# Dépannage - Erreurs 401 (Authentication)

Ce document explique comment diagnostiquer et résoudre les erreurs 401 liées à l'authentification.

> **Staging** : les conteneurs peuvent s’appeler `colisdirect-backend-staging`, `colisdirect-frontend-staging`, etc. Adaptez les commandes `docker exec` et `docker logs` au nom réel (`docker ps`).

## Symptômes

- Erreur dans la console : `api.colisdirect.com/api/auth/me:1 Failed to load resource: the server responded with a status of 401`
- L'utilisateur est automatiquement déconnecté après une connexion
- Impossible de rester connecté après un rafraîchissement de page

## Causes possibles

### 1. Token JWT expiré
- **Cause** : Le token JWT stocké dans le localStorage a expiré (par défaut, expiration après 7 jours)
- **Solution** : L'utilisateur doit se reconnecter. Le système supprime automatiquement les tokens expirés.

### 2. JWT_SECRET différent
- **Cause** : Le `JWT_SECRET` utilisé pour signer le token est différent de celui utilisé pour le vérifier
- **Symptômes** : L'utilisateur ne peut pas se connecter même avec des identifiants valides
- **Solution** : Vérifier que `COLISDIRECT_JWT_SECRET` dans `.env.production` est identique à celui utilisé lors de la création du token

### 3. Token invalide ou corrompu
- **Cause** : Le token stocké dans le localStorage est corrompu ou invalide
- **Solution** : Supprimer le token manuellement ou laisser le système le faire automatiquement

### 4. Problème CORS
- **Cause** : Les headers CORS ne permettent pas l'envoi du header `Authorization`
- **Symptômes** : Les requêtes OPTIONS échouent ou le header Authorization n'est pas envoyé
- **Solution** : Vérifier la configuration CORS dans `docker-compose.prod.yml`

## Solutions immédiates

### Solution 1 : Vider le cache et se reconnecter

1. Ouvrir la console du navigateur (F12)
2. Exécuter :
```javascript
localStorage.removeItem('auth_token');
location.reload();
```

3. Se reconnecter avec vos identifiants

### Solution 2 : Vérifier la configuration JWT_SECRET

1. Vérifier que le fichier `.env.production` existe sur le serveur (adapter le chemin ; exemple VPS : `/root/colis-direct/.env.production`) :
```bash
ls -la /chemin/vers/colis-direct/.env.production
```

2. Vérifier que `COLISDIRECT_JWT_SECRET` est défini :
```bash
grep COLISDIRECT_JWT_SECRET /chemin/vers/colis-direct/.env.production
```

3. Si le secret a changé, tous les utilisateurs doivent se reconnecter. Le système gère cela automatiquement.

### Solution 3 : Vérifier les logs du backend

1. Voir les logs du conteneur backend :
```bash
docker logs colisdirect-backend -f
```

2. Chercher les messages `[AUTH]` qui indiquent :
   - `Token expired` : Le token a expiré
   - `Invalid token signature` : Le JWT_SECRET ne correspond pas
   - `No token provided` : Le token n'est pas envoyé dans la requête

### Solution 4 : Rebuild avec la bonne configuration

Si le JWT_SECRET a changé en production :

1. Arrêter les services :
```bash
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod down
```

2. Vérifier/corriger `.env.production` :
```bash
nano /chemin/vers/colis-direct/.env.production
```

3. Rebuild et redémarrer :
```bash
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod build --no-cache
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod up -d
```

## Améliorations automatiques

Le système a été amélioré pour gérer automatiquement les erreurs 401 :

1. **Suppression automatique du token invalide** : Quand une erreur 401 est détectée, le token est automatiquement supprimé du localStorage
2. **Déconnexion automatique** : L'utilisateur est automatiquement déconnecté quand son token est invalide
3. **Logs détaillés** : Le backend logue précisément le type d'erreur (expiré, signature invalide, etc.)

## Vérification de la configuration

### Vérifier que le backend utilise le bon JWT_SECRET

1. Entrer dans le conteneur backend :
```bash
docker exec -it colisdirect-backend sh
```

2. Vérifier la variable d'environnement :
```bash
echo $JWT_SECRET
```

3. Si la valeur est vide ou incorrecte, vérifier le fichier `.env.production`

### Vérifier que le frontend communique avec le bon backend

1. Vérifier la variable `VITE_API_URL` dans le build :
```bash
docker exec -it colisdirect-frontend sh
cat /usr/share/nginx/html/index.html | grep -o 'https://api.colisdirect.com'
```

2. Si l'URL est incorrecte, rebuild le frontend avec la bonne URL :
```bash
# Modifier VITE_API_URL dans .env.production
# Puis rebuild :
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod build --no-cache colisdirect-frontend
docker compose -f docker-compose.prod.yml --project-name colisdirect-prod up -d colisdirect-frontend
```

## Prévention

1. **Ne jamais changer le JWT_SECRET en production** sans planifier une déconnexion de tous les utilisateurs
2. **Utiliser un secret fort** : Générer avec `openssl rand -base64 64`
3. **Garder une sauvegarde** du JWT_SECRET en sécurité
4. **Documenter les changements** de configuration

## Support

Si le problème persiste :
1. Collecter les logs : `docker logs colisdirect-backend > backend.log`
2. Vérifier la configuration : `cat .env.production | grep -E "JWT|API"`
3. Vérifier les headers de la requête dans la console du navigateur (onglet Network)

