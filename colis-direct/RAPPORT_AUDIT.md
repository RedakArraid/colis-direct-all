# Rapport d'Audit — Colis Direct (24/05/2026)

Analyse exhaustive couvrant le frontend (React/TS), le backend (Node/Express/TS) et la base de données (PostgreSQL 15).

---

## Sommaire exécutif

| Domaine | Problèmes critiques | Problèmes moyens | Améliorations proposées |
|---------|--------------------|--------------------|------------------------|
| Frontend | 0 | 5 | 8 |
| Backend | 1 (CORS) ✅ corrigé | 4 | 6 |
| Base de données | 2 | 6 | 8 |

---

## 1. Frontend

### 1.1 Code mort confirmé

| Fichier | Élément | Statut |
|---------|---------|--------|
| `src/pages/RelayDashboard.tsx` | Import `Download` (lucide) | ✅ Supprimé |
| `src/lib/api.ts` | 38 méthodes jamais appelées | À supprimer en v2 |

**Méthodes API mortes (38)** — toutes définies dans `src/lib/api.ts` mais jamais appelées depuis les pages/composants :

```
assignShipmentToTransporter, createPricingSetting, createPromoCode,
deletePricingSetting, generateQRCode, getActivityLogs, getAddressBookEntry,
getAutomatedPaymentStatus, getChatbotMessages, getDailyStatistics,
getDefaultRecipientAddress, getDefaultSenderAddress, getJobPosting,
getMonthlyReports, getMyZones, getPricingSetting, getPricingSettings,
getRelayApplication, getRelayCashSummary, getRelayDeliveries,
getRelayPerformance, getRelayPickups, getShipmentQRCodes, getShipmentTrackingEvents,
getShippingAddress, getTrackingEvents, getTrackingHistory, getTransporter,
getUserByEmail, getZoneTransporters, listIncidents, listPromoCodes,
markDeparture, markShipmentPickedUp, resolveIncident, scanShipment,
togglePromoCode, updateChatbotMessage, updatePricingSetting
```

> **Note:** Ces méthodes correspondent à des routes backend existantes. Certaines pourraient devenir utiles pour de futures pages admin. À supprimer si aucune page admin ne les utilise d'ici la v2.

### 1.2 TypeScript — abus de `any`

**278 instances** de `as any` ou `: any` dans le codebase.

Zones critiques :
- `src/lib/api.ts` — réponses JSON non typées (toutes les réponses API retournent `any`)
- `src/components/admin/ZoneMapSelector.tsx` — ~20 instances (événements Leaflet)
- `src/utils/waybillUtils.ts` — `toast?: any` à typer

**Plan de correction :**
```typescript
// Au lieu de:
async getRelayPoints(): Promise<{ data: any; error: string | null }> { ... }

// Typer:
interface RelayPoint { id: string; name: string; commune: string; ... }
async getRelayPoints(): Promise<{ data: RelayPoint[] | null; error: string | null }> { ... }
```

### 1.3 Composants trop grands (> 300 lignes)

| Fichier | Lignes | Action recommandée |
|---------|--------|-------------------|
| `src/pages/RelayDashboard.tsx` | ~4400 | Extraire modales en composants séparés |
| `src/components/shipment/ShipmentForm.tsx` | ~850 | Extraire sections adresse/options |
| `src/pages/TransporterLoginPage.tsx` | ~1000 | Extraire colonnes livraison |
| `src/pages/CreateShipmentPage.tsx` | ~500 | Séparer les 5 étapes |
| `src/pages/support/CustomerSupportDashboard.tsx` | ~800 | Extraire panels tickets |

### 1.4 Problèmes useEffect

```typescript
// src/App.tsx:196 — currentPage dans les deps crée un risque de boucle
useEffect(() => { ... }, [user, loading, activeSpace, currentPage]); // ⚠️ currentPage se modifie dans l'effet

// src/contexts/CartContext.tsx:119 — timer de sauvegarde non annulé
useEffect(() => {
  const timer = setTimeout(() => saveToServer(), 2000);
  // return () => clearTimeout(timer); // ← manquant
}, [items, user]);
```

**Fix CartContext :**
```typescript
useEffect(() => {
  const timer = setTimeout(() => saveToServer(), 2000);
  return () => clearTimeout(timer); // Nettoyage du timer
}, [items, user]);
```

### 1.5 Gestion d'erreurs manquante

| Fichier | Contexte | Problème |
|---------|---------|---------|
| `src/pages/CartPage.tsx` | `Promise.all()` checkout | Pas de catch global — un envoi échoué bloque silencieusement |
| `src/pages/MyShipmentsPage.tsx` | `loadShipments()` | `console.error` seulement, rien affiché à l'utilisateur |
| `src/pages/ProDashboard.tsx` | Création shipment | Erreur API non affichée |

### 1.6 Améliorations proposées

**Performance :**
```typescript
// src/pages/CreateShipmentPage.tsx — props non mémoïsées passées aux enfants
const handleRelaySelection = useCallback((deliveryId, originId) => {
  setSelectedPickupRelay(originId);
  setSelectedDeliveryRelay(deliveryId);
}, []); // Mémoïser

// src/App.tsx — constantes recalculées à chaque render
const pagesWithOwnHeader = useMemo(() => ['home', 'tracking', ...], []);
```

**Accessibilité :**
```tsx
// Boutons sans label accessible
<button onClick={closeModal}>
  <X className="w-5 h-5" />
  {/* Ajouter: */}
</button>
<button onClick={closeModal} aria-label="Fermer">
  <X className="w-5 h-5" />
</button>

// Modales sans attribut
<div className="fixed inset-0 z-50">
  {/* Ajouter: role="dialog" aria-modal="true" aria-labelledby="modal-title" */}
</div>
```

**Feedback utilisateur :**
```tsx
// CartPage — double-clic possible pendant le checkout
<button onClick={handlePayment} disabled={loading}>
  {loading ? <Spinner /> : 'Payer'}
</button>
// Ajouter loading state pendant Promise.all
```

---

## 2. Backend

### 2.1 CORS trop permissif — ✅ CORRIGÉ

**Avant :**
```typescript
if (origin.startsWith('http://localhost') || origin.includes('colisdirect.com')) {
  callback(null, true); // Acceptait evil.colisdirect.com.attacker.com
}
```

**Après :**
```typescript
const allowedOrigins = [
  'https://colisdirect.com', 'https://www.colisdirect.com',
  'https://staging.colisdirect.com',
  'http://localhost:5173', 'http://localhost:3000', ...
];
// Rejet de toute origine non listée
```

### 2.2 Validation d'input manquante — PRIORITÉ HAUTE

**0 bibliothèque de validation** (pas de Joi, Zod, ajv). La validation est manuelle et incohérente.

Routes les plus exposées :

| Route | Champ non validé | Risque |
|-------|-----------------|--------|
| `POST /api/shipments` | `sender_phone`, `recipient_phone` | Format arbitraire stocké |
| `POST /api/payments/mobile-money/init` | `amount_fcfa` | Montant négatif possible |
| `POST /api/relay-applications` | `latitude`, `longitude` | Valeurs hors plage |

**Plan de correction (Zod recommandé) :**
```typescript
import { z } from 'zod';

const createShipmentSchema = z.object({
  sender_phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  recipient_phone: z.string().regex(/^\+?[0-9]{8,15}$/),
  weight: z.number().positive().max(100),
  price: z.number().nonnegative(),
  package_type: z.enum(['petit', 'moyen', 'grand']),
  pickup_method: z.enum(['relay_deposit', 'home_pickup']).optional(),
});

router.post('/', (req, res, next) => {
  const result = createShipmentSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  req.body = result.data;
  next();
});
```

### 2.3 Transactions DB manquantes

| Opération | Fichier | Risque si interruption |
|-----------|---------|----------------------|
| `POST /api/shipments` (création) | shipments.ts ~475 | Colis créé mais tracking_event manquant |
| `POST /api/shipments` (promo) | shipments.ts ~620 | Colis créé mais `uses_count` non incrémenté |

**Correction :**
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const shipmentResult = await client.query('INSERT INTO shipments...', [...]);
  await client.query('INSERT INTO tracking_events...', [...]);
  if (promoCode) await client.query('UPDATE promo_codes SET uses_count = uses_count + 1...', [...]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### 2.4 Logging — 281 console.log/error en production

```bash
$ grep -r "console\." backend/src/ | wc -l
281
```

**Plan : remplacer par Winston :**
```typescript
// backend/src/lib/logger.ts
import winston from 'winston';
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

// Usage:
// Avant: console.error('Shipment error:', error);
// Après: logger.error('Shipment creation failed', { error: error.message, userId });
```

### 2.5 Pagination manquante

Routes retournant des listes non paginées :

| Route | Table | Risque volume |
|-------|-------|--------------|
| `GET /api/shipments` | shipments | HAUTE — 100k+ en prod |
| `GET /api/users` | users | BASSE (admin seulement) |
| `GET /api/support/tickets` | support_tickets | MOYENNE |

**Pattern à implémenter :**
```typescript
router.get('/', authenticate, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await pool.query(
    'SELECT * FROM shipments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const total = await pool.query('SELECT COUNT(*) FROM shipments');
  res.json({ data: result.rows, total: parseInt(total.rows[0].count), limit, offset });
});
```

### 2.6 Upload — MIME type non vérifié

**Fichier :** `backend/src/routes/uploads.ts`

```typescript
// Avant (extension seulement):
const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);

// Après (MIME type + extension):
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
const extOk = allowedExts.includes(path.extname(file.originalname).toLowerCase());
if (allowedMimes.includes(file.mimetype) && extOk) cb(null, true);
else cb(new Error('Type de fichier non autorisé'));
```

### 2.7 JWT expiration — 7 jours

```typescript
// backend/src/routes/auth.ts
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // ⚠️ Trop long
```

**Recommandation :** Passer à 24h en production. Implémenter refresh token pour les sessions longues :
```
ACCESS_TOKEN_TTL=24h
REFRESH_TOKEN_TTL=30d
```

### 2.8 Améliorations proposées

1. **Caching Redis** pour relay_points et pricing_grids (données peu changeantes)
2. **Rate limiting** sur `POST /relay-applications` (spam possible)
3. **Pagination** sur `GET /api/shipments` (voir §2.5)
4. **Logging structuré** Winston/Pino (voir §2.4)
5. **Validation Zod** (voir §2.2)
6. **Transactions** sur création shipment (voir §2.3)

---

## 3. Base de données

### 3.1 Tables inutilisées / mortes

| Table | Statut | Action |
|-------|--------|--------|
| `relay_partners` | Jamais lue en code — remplacée par `users.relay_point_id` | À archiver/supprimer |
| `shipment_status_history` | Créée par trigger `log_shipment_state_change()` mais jamais lue | Supprimer ou exploiter |
| `shipment_tracking` | Doublon de `tracking_events` (table principale) | À archiver |
| `relay_point_metrics` | Conflit avec `relay_point_daily_metrics` | Supprimer |
| `customer_messages` | Remplacée par système tickets support | Archiver |

### 3.2 Colonnes orphelines

| Table.Colonne | Problème |
|---------------|---------|
| `shipments.status` | Colonne TEXT legacy, remplacée par `shipments.current_status` (ENUM). Jamais lue par le backend |
| `shipments.print_at_relay` | Jamais lue côté backend |
| `relay_partners.monthly_revenue` | Jamais mis à jour |
| `relay_partners.total_packages_handled` | Jamais mis à jour |

### 3.3 Index dupliqués à supprimer

```sql
-- PROBLÈME: deux index identiques sur tracking_events.shipment_id
-- idx_tracking_events_shipment        (à supprimer)
-- idx_tracking_events_shipment_id     (à garder)
CREATE INDEX CONCURRENTLY IF NOT EXISTS migration_drop_dup;
DROP INDEX IF EXISTS idx_tracking_events_shipment;
```

### 3.4 Index manquants critiques

```sql
-- tracking_events à forte croissance (1M+ lignes/an)
CREATE INDEX idx_tracking_events_timestamp_desc
  ON tracking_events(timestamp DESC);

CREATE INDEX idx_tracking_events_scanner_type_time
  ON tracking_events(scanner_type, timestamp DESC);

-- shipment_incidents (filtres fréquents)
CREATE INDEX idx_shipment_incidents_tracking
  ON shipment_incidents(tracking_number);

-- shipments — filtre "actifs" très fréquent dans tous les dashboards
CREATE INDEX idx_shipments_active
  ON shipments(id, origin_relay_id, destination_relay_id, created_at DESC)
  WHERE current_status NOT IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
    'CANCELLED', 'RETURN_TO_SENDER'
  );
```

### 3.5 Problèmes de persistance

**1. Audit trail ignoré :** `shipment_status_history` s'alimente via trigger mais aucune route ne la lit. Si vous avez besoin d'un historique des transitions de statut, utilisez cette table ; sinon supprimez le trigger pour éviter de l'écriture inutile.

**2. `current_packages` drift :** Le champ `transporters.current_packages` peut dériver. La migration `20260521020000` recalcule à chaque démarrage backend — acceptable mais coûteux si > 10k lignes. Envisager un recalcul uniquement si un drift est détecté.

**3. `assign_shipment_to_transporter()` bug** : Quand `relay_points.latitude` est NULL, la fonction `get_relay_distance()` retourne systématiquement 50km → tous les transporteurs ont le même score. Fix : utiliser une valeur de commune par défaut ou une table de centroides.

### 3.6 Migrations — cohérence

| Problème | Détail |
|---------|--------|
| Vues dans init + migrations | `shipment_statistics`, `daily_statistics`, etc. définies dans `01_init_schema.sql` ET redéfinies dans `20260521010000`. Les migrations font DROP CASCADE, OK. Mais le schéma init est désynchro. |
| Trigger dupliqué | `trg_decrement_transporter_packages` créé dans `20260520110000` puis redéfini dans `20260521020000` |
| `transporter_assignments.assignment_status` | CHECK étendu en `20260523000000` pour ajouter `'picked_up'`, absent du schéma initial |

### 3.7 Améliorations proposées

**A. Migration de nettoyage (à créer) :**
```sql
-- 20260601000000_db_cleanup.sql

-- 1. Supprimer index dupliqué
DROP INDEX IF EXISTS idx_tracking_events_shipment;

-- 2. Index manquants
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp_desc
  ON tracking_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_shipments_active
  ON shipments(id, origin_relay_id, destination_relay_id, created_at DESC)
  WHERE current_status NOT IN (
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
    'CANCELLED', 'RETURN_TO_SENDER'
  );

-- 3. Supprimer colonne legacy (APRÈS vérification côté code)
-- ALTER TABLE shipments DROP COLUMN IF EXISTS status;
```

**B. Stratégie d'archivage :**
- `tracking_events` > 90 jours → table `tracking_events_archive`
- `shipments` terminaux > 1 an → table `shipments_archive`
- Exécuter mensuellement via cron job ou worker

**C. RLS (Row-Level Security) pour conformité :**
```sql
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
-- Relay partenaire ne voit que SES colis
CREATE POLICY relay_shipments ON shipments FOR SELECT
  USING (
    origin_relay_id = (SELECT relay_point_id FROM users WHERE id = current_setting('app.current_user_id')::uuid)
    OR destination_relay_id = (SELECT relay_point_id FROM users WHERE id = current_setting('app.current_user_id')::uuid)
  );
```

**D. Partitionnement `tracking_events` :**
```sql
-- Pour DB > 1M lignes (prévoir dès 500k)
CREATE TABLE tracking_events_y2026m05 PARTITION OF tracking_events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

---

## 4. Corrections appliquées dans cet audit

| # | Correction | Fichier | Commit |
|---|-----------|---------|--------|
| 1 | Import `Download` mort supprimé | `src/pages/RelayDashboard.tsx` | ba995a2 |
| 2 | CORS : whitelist stricte, suppression pattern `.includes('colisdirect.com')` | `backend/src/index.ts` | à venir |
| 3 | Migration `20260524010000` : `transporter_id` nullable, `relay_partner_id` ajouté | `database/migrations/` | ba995a2 |

---

## 5. Roadmap technique recommandée

### Sprint 1 — Sécurité & Stabilité (1 semaine)
- [ ] Ajouter Zod pour validation input sur les 5 routes critiques
- [ ] Transactions atomiques sur `POST /shipments`
- [ ] Vérification MIME type sur upload
- [ ] Reducer JWT TTL à 24h

### Sprint 2 — Performance (1 semaine)
- [ ] Ajouter index manquants (migration)
- [ ] Pagination sur `GET /api/shipments` et `GET /api/users`
- [ ] Supprimer index dupliqué `tracking_events`

### Sprint 3 — Dette technique frontend (2 semaines)
- [ ] Supprimer les 38 méthodes API mortes
- [ ] Diviser `RelayDashboard.tsx` en composants (extraire modales)
- [ ] Corriger les 3 `useEffect` problématiques
- [ ] Typer les réponses API (supprimer les `any`)

### Sprint 4 — Observabilité (1 semaine)
- [ ] Remplacer `console.*` par Winston (backend)
- [ ] Ajouter Sentry ou équivalent pour tracking erreurs frontend
- [ ] Alertes sur drift `current_packages`

### Sprint 5 — Archivage & Scale (2 semaines)
- [ ] Archivage `tracking_events` > 90 jours
- [ ] Supprimer colonnes mortes (`shipments.status`)
- [ ] Archiver tables inutilisées (`relay_partners`, `shipment_status_history`)
- [ ] Envisager partitionnement si > 500k tracking_events

---

*Généré le 24/05/2026 — Analyse par agents IA spécialisés + validation manuelle*
