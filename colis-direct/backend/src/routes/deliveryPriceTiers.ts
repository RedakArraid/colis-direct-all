import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// GET /api/delivery-price-tiers — liste publique (pour le front)
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM delivery_price_tiers
       WHERE is_active = true
       ORDER BY distance_km_min ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery-price-tiers/all — liste complète (admin)
router.get('/all', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM delivery_price_tiers ORDER BY display_order ASC, distance_km_min ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-price-tiers — créer une tranche
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const {
      tier_name, distance_km_min, distance_km_max,
      price_courrier, price_petit, price_moyen, price_grand,
      is_active, display_order,
    } = req.body;

    if (!tier_name || distance_km_min === undefined) {
      return res.status(400).json({ error: 'tier_name et distance_km_min requis' });
    }

    const result = await pool.query(
      `INSERT INTO delivery_price_tiers
         (tier_name, distance_km_min, distance_km_max,
          price_courrier, price_petit, price_moyen, price_grand,
          is_active, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        tier_name,
        distance_km_min,
        distance_km_max ?? null,
        price_courrier ?? 0,
        price_petit    ?? 0,
        price_moyen    ?? 0,
        price_grand    ?? 0,
        is_active !== false,
        display_order ?? 0,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/delivery-price-tiers/:id — modifier
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const fields = [
      'tier_name', 'distance_km_min', 'distance_km_max',
      'price_courrier', 'price_petit', 'price_moyen', 'price_grand',
      'is_active', 'display_order',
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let p = 0;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${++p}`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE delivery_price_tiers SET ${updates.join(', ')} WHERE id = $${++p} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tranche introuvable' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/delivery-price-tiers/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM delivery_price_tiers WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tranche introuvable' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
