# Analyse : stabilité du frontend en développement (Docker / macOS)

## Symptôme historique

Erreurs du type **`Unknown system error -35`** lors de lectures de fichiers sous Docker Desktop sur **macOS**, souvent liées au volume qui montait tout le dépôt et au watcher de **Vite**.

---

## État du dépôt (mai 2026)

Les mesures ci‑dessous sont **en place** dans ce projet :

### 1. `docker-compose.dev.yml` — service `frontend`

- Montages **ciblés** (`./src`, `./public`, fichiers de config à la racine, pas tout le repo).
- Volume nommé pour **`node_modules`** (`frontend_node_modules`).
- Variables **`CHOKIDAR_USEPOLLING`** côté backend ; pour le frontend le polling est porté par la config Vite.
- Limites **`deploy.resources`** (mémoire / CPU) pour limiter les OOM.

### 2. `vite.config.ts`

- `server.watch.usePolling: true`, `useFsEvents: false`, `interval: 1000`.
- `server.watch.ignored` inclut `node_modules`, `dist`, `.git`, `backend`, `database`, `docs`, `*.md`, etc.

### 3. `.dockerignore` à la racine

- Exclut `node_modules`, `dist`, `backend`, `docs`, `.git`, fichiers d’environnement, caches, etc.

---

## Si le problème réapparaît

1. Mettre à jour **Docker Desktop** et tester **VirtioFS** / options de partage de fichiers macOS.
2. Lancer le frontend **hors Docker** : `npm install && npm run dev` (contournement simple).
3. Vérifier qu’aucun plugin ou script ne remonte un bind-mount du repo entier sur `./app`.

---

## Références

- [Options serveur Vite — watch](https://vite.dev/config/server-options.html)
- Documentation Docker Desktop pour le partage de fichiers sur macOS

---

*Mis à jour en mai 2026 pour refléter la configuration actuelle du repo.*
