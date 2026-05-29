import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all address book entries for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM pro_address_book 
       WHERE user_id = $1 
       ORDER BY is_favorite DESC, recipient_last_name ASC, created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching address book:', error);
    res.status(500).json({ error: 'Failed to fetch address book' });
  }
});

// Get a single address book entry
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM pro_address_book 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Address book entry not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching address book entry:', error);
    res.status(500).json({ error: 'Failed to fetch address book entry' });
  }
});

// Create a new address book entry
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      recipient_first_name,
      recipient_last_name,
      recipient_email,
      recipient_phone,
      recipient_commune,
      recipient_quartier,
      recipient_address,
      label,
      notes,
      is_favorite
    } = req.body;

    // Validate required fields
    if (!recipient_first_name || !recipient_last_name || !recipient_phone || 
        !recipient_commune || !recipient_quartier || !recipient_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { rows } = await pool.query(
      `INSERT INTO pro_address_book (
        user_id, recipient_first_name, recipient_last_name, recipient_email,
        recipient_phone, recipient_commune, recipient_quartier, recipient_address,
        label, notes, is_favorite
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId, recipient_first_name, recipient_last_name, recipient_email || null,
        recipient_phone, recipient_commune, recipient_quartier, recipient_address,
        label || null, notes || null, is_favorite || false
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating address book entry:', error);
    res.status(500).json({ error: 'Failed to create address book entry' });
  }
});

// Update an address book entry
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      recipient_first_name,
      recipient_last_name,
      recipient_email,
      recipient_phone,
      recipient_commune,
      recipient_quartier,
      recipient_address,
      label,
      notes,
      is_favorite
    } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const addUpdate = (field: string, value: any) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(value);
      }
    };

    addUpdate('recipient_first_name', recipient_first_name);
    addUpdate('recipient_last_name', recipient_last_name);
    addUpdate('recipient_email', recipient_email);
    addUpdate('recipient_phone', recipient_phone);
    addUpdate('recipient_commune', recipient_commune);
    addUpdate('recipient_quartier', recipient_quartier);
    addUpdate('recipient_address', recipient_address);
    addUpdate('label', label);
    addUpdate('notes', notes);
    addUpdate('is_favorite', is_favorite);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, userId);

    const { rows } = await pool.query(
      `UPDATE pro_address_book 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Address book entry not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating address book entry:', error);
    res.status(500).json({ error: 'Failed to update address book entry' });
  }
});

// Delete an address book entry
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM pro_address_book 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Address book entry not found' });
    }

    res.json({ message: 'Address book entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting address book entry:', error);
    res.status(500).json({ error: 'Failed to delete address book entry' });
  }
});

export default router;

