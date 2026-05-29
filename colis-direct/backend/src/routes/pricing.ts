import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';

const router = express.Router();

// Get all pricing settings (admin only)
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_settings ORDER BY name ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get pricing settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active pricing settings (public)
router.get('/active', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_settings WHERE is_active = true ORDER BY name ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get active pricing settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pricing setting by ID
router.get('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_settings WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing setting not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Get pricing setting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create pricing setting
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      base_price,
      price_per_kg,
      printing_fee,
      assistance_fee,
      box_price,
      min_weight,
      max_weight,
      is_active
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pricing_settings 
       (name, description, base_price, price_per_kg, printing_fee, assistance_fee, box_price, min_weight, max_weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, description, base_price, price_per_kg, printing_fee, assistance_fee, box_price, min_weight || 0, max_weight || 50, is_active !== false]
    );

    await logAdminActivity(req.user!.id, 'create_pricing_setting', `Created pricing setting: ${name}`);

    res.status(201).json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Create pricing setting error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'A pricing setting with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update pricing setting
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      base_price,
      price_per_kg,
      printing_fee,
      assistance_fee,
      box_price,
      min_weight,
      max_weight,
      is_active
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(description);
    }
    if (base_price !== undefined) {
      updates.push(`base_price = $${++paramCount}`);
      values.push(base_price);
    }
    if (price_per_kg !== undefined) {
      updates.push(`price_per_kg = $${++paramCount}`);
      values.push(price_per_kg);
    }
    if (printing_fee !== undefined) {
      updates.push(`printing_fee = $${++paramCount}`);
      values.push(printing_fee);
    }
    if (assistance_fee !== undefined) {
      updates.push(`assistance_fee = $${++paramCount}`);
      values.push(assistance_fee);
    }
    if (box_price !== undefined) {
      updates.push(`box_price = $${++paramCount}`);
      values.push(box_price);
    }
    if (min_weight !== undefined) {
      updates.push(`min_weight = $${++paramCount}`);
      values.push(min_weight);
    }
    if (max_weight !== undefined) {
      updates.push(`max_weight = $${++paramCount}`);
      values.push(max_weight);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE pricing_settings SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing setting not found' });
    }

    await logAdminActivity(req.user!.id, 'update_pricing_setting', `Updated pricing setting: ${result.rows[0].name}`);

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Update pricing setting error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'A pricing setting with this name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete pricing setting
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query('SELECT name FROM pricing_settings WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing setting not found' });
    }

    await pool.query('DELETE FROM pricing_settings WHERE id = $1', [id]);

    await logAdminActivity(req.user!.id, 'delete_pricing_setting', `Deleted pricing setting: ${checkResult.rows[0].name}`);

    res.json({ message: 'Pricing setting deleted successfully' });
  } catch (error: any) {
    console.error('Delete pricing setting error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

