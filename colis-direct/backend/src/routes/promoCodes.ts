import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Public — validate a promo code
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code requis' });
    }

    const result = await pool.query(
      `SELECT code, discount_type, discount_value, max_uses, uses_count, expires_at
       FROM promo_codes
       WHERE UPPER(code) = UPPER($1) AND is_active = TRUE`,
      [code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code promo invalide ou inactif' });
    }

    const promo = result.rows[0];

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Code promo expiré' });
    }

    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
      return res.status(410).json({ error: 'Code promo épuisé' });
    }

    res.json({
      data: {
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: parseFloat(promo.discount_value),
      },
    });
  } catch (error: any) {
    console.error('Promo validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin — list all promo codes
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM promo_codes ORDER BY created_at DESC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin — create promo code
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { code, description, discount_type, discount_value, max_uses, expires_at } = req.body;
    if (!code || !discount_type) {
      return res.status(400).json({ error: 'code et discount_type requis' });
    }
    const result = await pool.query(
      `INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, expires_at)
       VALUES (UPPER($1), $2, $3, $4, $5, $6) RETURNING *`,
      [code.trim(), description || null, discount_type, discount_value || 0, max_uses || null, expires_at || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ce code promo existe déjà' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Admin — toggle promo code active/inactive
router.patch('/:id/toggle', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'UPDATE promo_codes SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Code promo introuvable' });
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin — update promo code
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { code, description, discount_type, discount_value, max_uses, expires_at } = req.body;
    const result = await pool.query(
      `UPDATE promo_codes
       SET code = COALESCE(UPPER($1), code),
           description = $2,
           discount_type = COALESCE($3, discount_type),
           discount_value = COALESCE($4, discount_value),
           max_uses = $5,
           expires_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        code ? code.trim() : null,
        description !== undefined ? description : null,
        discount_type || null,
        discount_value !== undefined ? discount_value : null,
        max_uses !== undefined ? max_uses : null,
        expires_at !== undefined ? expires_at : null,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Code promo introuvable' });
    res.json({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ce code promo existe déjà' });
    res.status(500).json({ error: error.message });
  }
});

// Admin — delete promo code
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('DELETE FROM promo_codes WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Code promo introuvable' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
