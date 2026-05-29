import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';

const router = express.Router();

// Get all additional options (admin only)
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM additional_pricing_options ORDER BY display_order ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get additional options error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active additional options (public)
router.get('/active', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM additional_pricing_options WHERE is_active = true ORDER BY display_order ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get active additional options error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get additional option by ID
router.get('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM additional_pricing_options WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Additional option not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Get additional option error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update additional option
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      option_name,
      option_description,
      price_type,
      price_value,
      is_active,
      display_order
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (option_name !== undefined) {
      updates.push(`option_name = $${++paramCount}`);
      values.push(option_name);
    }
    if (option_description !== undefined) {
      updates.push(`option_description = $${++paramCount}`);
      values.push(option_description);
    }
    if (price_type !== undefined) {
      updates.push(`price_type = $${++paramCount}`);
      values.push(price_type);
    }
    if (price_value !== undefined) {
      updates.push(`price_value = $${++paramCount}`);
      values.push(price_value);
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
    const query = `UPDATE additional_pricing_options SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Additional option not found' });
    }

    await logAdminActivity(req.user!.id, 'update_additional_option', `Updated option: ${result.rows[0].option_name}`);

    res.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('Update additional option error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

