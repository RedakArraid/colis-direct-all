import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';

const router = express.Router();

// Get all pricing grids (admin only)
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_grids ORDER BY grid_type, COALESCE(package_size, \'\'), delivery_mode, display_order, weight_min ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get pricing grids error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active pricing grids (public)
router.get('/active', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_grids WHERE is_active = true ORDER BY grid_type, COALESCE(package_size, \'\'), delivery_mode, display_order, weight_min ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get active pricing grids error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Haversine (km) ──────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Marketplace : calcul du prix (distance × taille) ────────────────────────
// GET /api/pricing-grids/calculate?sender_commune=Cocody&recipient_commune=Bouaké&package_size=petit
// Params legacy conservés : weight (ignoré), grid_type (détermine package_size si absent)
router.get('/calculate', async (req, res) => {
  try {
    const { sender_commune, recipient_commune, package_size, grid_type } = req.query;

    if (!sender_commune || !recipient_commune) {
      return res.status(400).json({ error: 'Paramètres requis : sender_commune, recipient_commune' });
    }

    const senderName    = (sender_commune as string).trim();
    const recipientName = (recipient_commune as string).trim();

    // Résoudre la taille du colis :
    //   - package_size explicite (courrier | petit | moyen | grand)
    //   - ou inférer depuis grid_type ('courier' → 'courrier', 'colis' → 'petit' par défaut)
    let pkgSize = (package_size as string) || (grid_type === 'courier' ? 'courrier' : 'petit');
    if (!['courrier', 'petit', 'moyen', 'grand'].includes(pkgSize)) pkgSize = 'petit';

    // ── 1. Trouver les zones pour chaque commune ──────────────────────────────
    const findZone = async (commune: string) => {
      const res = await pool.query(
        `SELECT name,
                (min_latitude  + max_latitude)  / 2 AS lat,
                (min_longitude + max_longitude) / 2 AS lng
         FROM delivery_zones
         WHERE is_active = true
           AND communes @> ARRAY[$1]::text[]
         LIMIT 1`,
        [commune]
      );
      if (res.rows.length > 0) return res.rows[0];
      // Recherche insensible à la casse en fallback
      const res2 = await pool.query(
        `SELECT name,
                (min_latitude  + max_latitude)  / 2 AS lat,
                (min_longitude + max_longitude) / 2 AS lng
         FROM delivery_zones
         WHERE is_active = true
           AND EXISTS (
             SELECT 1 FROM unnest(communes) c
             WHERE lower(c) = lower($1)
           )
         LIMIT 1`,
        [commune]
      );
      return res2.rows[0] || null;
    };

    const [zoneFrom, zoneTo] = await Promise.all([
      findZone(senderName),
      findZone(recipientName),
    ]);

    // ── 2. Calculer la distance ───────────────────────────────────────────────
    let distanceKm = 0;
    let isSameZone = false;
    if (zoneFrom && zoneTo) {
      isSameZone = zoneFrom.name === zoneTo.name;
      distanceKm = isSameZone
        ? 0
        : haversineKm(
            parseFloat(zoneFrom.lat), parseFloat(zoneFrom.lng),
            parseFloat(zoneTo.lat),   parseFloat(zoneTo.lng)
          );
    }

    // ── 3. Trouver la tranche tarifaire correspondante ────────────────────────
    const tierRes = await pool.query(
      `SELECT * FROM delivery_price_tiers
       WHERE is_active = true
         AND distance_km_min <= $1
         AND (distance_km_max IS NULL OR distance_km_max >= $1)
       ORDER BY distance_km_min DESC
       LIMIT 1`,
      [distanceKm]
    );

    // Fallback : prendre la tranche la plus haute si distance hors plage
    const tier = tierRes.rows[0] || (
      await pool.query(
        `SELECT * FROM delivery_price_tiers WHERE is_active = true ORDER BY distance_km_min DESC LIMIT 1`
      )
    ).rows[0];

    if (!tier) {
      return res.status(404).json({ error: 'Aucune tranche tarifaire configurée. Veuillez contacter l\'administrateur.' });
    }

    const priceCol = `price_${pkgSize}` as keyof typeof tier;
    const standardPrice = Math.round(parseFloat(tier[priceCol] ?? tier.price_petit));

    // ── 4. Remises par mode (configurables via additional_pricing_options) ────
    const discountRes = await pool.query(
      `SELECT option_key, price_value FROM additional_pricing_options
       WHERE option_key IN ('discount_relay_to_relay','discount_home_to_relay','discount_relay_to_home')
         AND is_active = true`
    );
    const discountMap: Record<string, number> = {};
    for (const row of discountRes.rows) {
      discountMap[row.option_key] = parseFloat(row.price_value);
    }
    const discountRelayRelay = discountMap['discount_relay_to_relay'] ?? 10;
    const discountHomeRelay  = discountMap['discount_home_to_relay']  ?? 5;
    const discountRelayHome  = discountMap['discount_relay_to_home']  ?? 5;

    const modes = [
      {
        key: 'home_to_home',
        label: 'Domicile → Domicile',
        emoji: '🏠',
        pickup_method: 'home_pickup',
        home_delivery: true,
        discount_percent: 0,
        delay: distanceKm <= 5 ? 'Même jour' : 'J+1',
        available: true,
      },
      {
        key: 'home_to_relay',
        label: 'Domicile → Point relais',
        emoji: '📦',
        pickup_method: 'home_pickup',
        home_delivery: false,
        discount_percent: discountHomeRelay,
        delay: 'J+1',
        available: true,
      },
      {
        key: 'relay_to_home',
        label: 'Point relais → Domicile',
        emoji: '🏘️',
        pickup_method: 'relay_deposit',
        home_delivery: true,
        discount_percent: discountRelayHome,
        delay: 'J+1',
        available: true,
      },
      {
        key: 'relay_to_relay',
        label: 'Point relais → Point relais',
        emoji: '📦',
        pickup_method: 'relay_deposit',
        home_delivery: false,
        discount_percent: discountRelayRelay,
        delay: distanceKm <= 20 ? 'J+1' : 'J+2',
        available: true,
      },
    ];

    const result = modes
      .filter(m => !(distanceKm > 50 && m.key === 'home_to_home'))
      .map((mode) => {
        const discountAmount = Math.round(standardPrice * mode.discount_percent / 100);
        return {
          ...mode,
          standard_price_fcfa:  standardPrice,
          discount_amount_fcfa: discountAmount,
          final_price_fcfa:     standardPrice - discountAmount,
          is_cheapest: false,
        };
      });

    const minPrice = Math.min(...result.map(m => m.final_price_fcfa));
    result.forEach(m => { m.is_cheapest = m.final_price_fcfa === minPrice && m.discount_percent > 0; });

    res.json({
      sender_commune,
      recipient_commune,
      package_size: pkgSize,
      distance_km:  Math.round(distanceKm),
      zone_from:    zoneFrom?.name ?? null,
      zone_to:      zoneTo?.name   ?? null,
      tier_name:    tier.tier_name,
      is_same_zone: isSameZone,
      standard_price_fcfa: standardPrice,
      modes: result,
    });
  } catch (error: any) {
    console.error('Calculate pricing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pricing grid by ID
router.get('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_grids WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing grid not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Get pricing grid error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create pricing grid
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const {
      grid_type,
      package_size,
      delivery_mode,
      weight_min,
      weight_max,
      price_intra_commune,
      price_inter_commune,
      supplement_per_kg_intra,
      supplement_per_kg_inter,
      is_active,
      display_order
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pricing_grids 
       (grid_type, package_size, delivery_mode, weight_min, weight_max, price_intra_commune, price_inter_commune, 
        supplement_per_kg_intra, supplement_per_kg_inter, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        grid_type,
        grid_type === 'courier' ? null : package_size, // package_size est NULL pour courier
        delivery_mode || 'relay',
        weight_min,
        weight_max,
        price_intra_commune,
        price_inter_commune,
        supplement_per_kg_intra || 0,
        supplement_per_kg_inter || 0,
        is_active !== false,
        display_order || 0
      ]
    );

    await logAdminActivity(req.user!.id, 'create_pricing_grid', `Created pricing grid: ${grid_type} ${weight_min}-${weight_max}kg`);

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create pricing grid error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'A pricing grid with these parameters already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update pricing grid
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      grid_type,
      package_size,
      delivery_mode,
      weight_min,
      weight_max,
      price_intra_commune,
      price_inter_commune,
      supplement_per_kg_intra,
      supplement_per_kg_inter,
      is_active,
      display_order
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (grid_type !== undefined) {
      updates.push(`grid_type = $${++paramCount}`);
      values.push(grid_type);
      // Si on change vers courier, package_size doit être NULL
      if (grid_type === 'courier') {
        updates.push(`package_size = $${++paramCount}`);
        values.push(null);
      }
    }
    if (package_size !== undefined && grid_type !== 'courier') {
      updates.push(`package_size = $${++paramCount}`);
      values.push(package_size);
    }
    if (delivery_mode !== undefined) {
      updates.push(`delivery_mode = $${++paramCount}`);
      values.push(delivery_mode);
    }
    if (weight_min !== undefined) {
      updates.push(`weight_min = $${++paramCount}`);
      values.push(weight_min);
    }
    if (weight_max !== undefined) {
      updates.push(`weight_max = $${++paramCount}`);
      values.push(weight_max);
    }
    if (price_intra_commune !== undefined) {
      updates.push(`price_intra_commune = $${++paramCount}`);
      values.push(price_intra_commune);
    }
    if (price_inter_commune !== undefined) {
      updates.push(`price_inter_commune = $${++paramCount}`);
      values.push(price_inter_commune);
    }
    if (supplement_per_kg_intra !== undefined) {
      updates.push(`supplement_per_kg_intra = $${++paramCount}`);
      values.push(supplement_per_kg_intra);
    }
    if (supplement_per_kg_inter !== undefined) {
      updates.push(`supplement_per_kg_inter = $${++paramCount}`);
      values.push(supplement_per_kg_inter);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${++paramCount}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE pricing_grids SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing grid not found' });
    }

    await logAdminActivity(req.user!.id, 'update_pricing_grid', `Updated pricing grid: ${result.rows[0].grid_type} ${result.rows[0].weight_min}-${result.rows[0].weight_max}kg`);

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Update pricing grid error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'A pricing grid with these parameters already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete pricing grid
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query('SELECT * FROM pricing_grids WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing grid not found' });
    }

    await pool.query('DELETE FROM pricing_grids WHERE id = $1', [id]);

    await logAdminActivity(req.user!.id, 'delete_pricing_grid', `Deleted pricing grid: ${checkResult.rows[0].grid_type} ${checkResult.rows[0].weight_min}-${checkResult.rows[0].weight_max}kg`);

    res.json({ message: 'Pricing grid deleted successfully' });
  } catch (error: any) {
    console.error('Delete pricing grid error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

