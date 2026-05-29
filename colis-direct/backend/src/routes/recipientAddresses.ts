import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all recipient addresses for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipient_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get recipient addresses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get default recipient address
router.get('/default', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recipient_addresses WHERE user_id = $1 AND is_default = true LIMIT 1',
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No default address found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get default recipient address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create recipient address
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      label,
      first_name,
      last_name,
      email,
      phone,
      commune,
      quartier,
      address,
      is_default = false,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO recipient_addresses (
        user_id, label, first_name, last_name, email, phone,
        commune, quartier, address, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user!.id,
        label,
        first_name,
        last_name,
        email || null,
        phone,
        commune,
        quartier,
        address,
        is_default,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create recipient address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update recipient address
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      first_name,
      last_name,
      email,
      phone,
      commune,
      quartier,
      address,
      is_default,
    } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM recipient_addresses WHERE id = $1',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }
    if (checkResult.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      `UPDATE recipient_addresses SET
        label = COALESCE($1, label),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        commune = COALESCE($6, commune),
        quartier = COALESCE($7, quartier),
        address = COALESCE($8, address),
        is_default = COALESCE($9, is_default),
        updated_at = now()
      WHERE id = $10 AND user_id = $11
      RETURNING *`,
      [
        label,
        first_name,
        last_name,
        email,
        phone,
        commune,
        quartier,
        address,
        is_default,
        id,
        req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update recipient address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recipient address
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT user_id FROM recipient_addresses WHERE id = $1',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }
    if (checkResult.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pool.query('DELETE FROM recipient_addresses WHERE id = $1 AND user_id = $2', [
      id,
      req.user!.id,
    ]);

    res.json({ message: 'Address deleted successfully' });
  } catch (error: any) {
    console.error('Delete recipient address error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

