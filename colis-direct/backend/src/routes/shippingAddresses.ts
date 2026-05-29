import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all shipping addresses for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, address, complement_adresse, ville, commune, quartier, is_default, created_at, updated_at
       FROM user_shipping_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get shipping addresses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single shipping address by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, address, complement_adresse, ville, commune, quartier, is_default, created_at, updated_at
       FROM user_shipping_addresses
       WHERE id = $1 AND user_id = $2`,
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get shipping address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new shipping address
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { address, complement_adresse, ville, commune, quartier, is_default } = req.body;

    if (!address || !commune || !quartier) {
      return res.status(400).json({ error: 'Adresse, commune et quartier sont requis' });
    }

    // If this is set as default, ensure only one default exists (handled by trigger)
    const result = await pool.query(
      `INSERT INTO user_shipping_addresses (user_id, address, complement_adresse, ville, commune, quartier, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, address, complement_adresse, ville, commune, quartier, is_default, created_at, updated_at`,
      [req.user!.id, address, complement_adresse || null, ville || null, commune, quartier, is_default || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create shipping address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a shipping address
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { address, complement_adresse, ville, commune, quartier, is_default } = req.body;

    // Check if address exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM user_shipping_addresses WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (address !== undefined) {
      updates.push(`address = $${++paramCount}`);
      values.push(address);
    }
    if (complement_adresse !== undefined) {
      updates.push(`complement_adresse = $${++paramCount}`);
      values.push(complement_adresse);
    }
    if (ville !== undefined) {
      updates.push(`ville = $${++paramCount}`);
      values.push(ville);
    }
    if (commune !== undefined) {
      updates.push(`commune = $${++paramCount}`);
      values.push(commune);
    }
    if (quartier !== undefined) {
      updates.push(`quartier = $${++paramCount}`);
      values.push(quartier);
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${++paramCount}`);
      values.push(is_default);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    values.push(req.user!.id);

    const result = await pool.query(
      `UPDATE user_shipping_addresses
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${++paramCount} AND user_id = $${++paramCount}
       RETURNING id, address, complement_adresse, ville, commune, quartier, is_default, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update shipping address error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a shipping address
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM user_shipping_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Adresse introuvable' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete shipping address error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

