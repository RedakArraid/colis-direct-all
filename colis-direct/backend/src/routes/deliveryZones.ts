import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all delivery zones
router.get('/', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT dz.*, 
              u.email as created_by_email,
              COUNT(tdz.transporter_id) as transporter_count
       FROM delivery_zones dz
       LEFT JOIN users u ON dz.created_by = u.id
       LEFT JOIN transporter_delivery_zones tdz ON dz.id = tdz.zone_id
       GROUP BY dz.id, u.email
       ORDER BY dz.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get delivery zones error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get delivery zone by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const allowedRoles = new Set(['admin', 'support', 'relay_partner']);
    if (!allowedRoles.has(user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (user.role === 'relay_partner') {
      const zoneAccess = await pool.query(
        `SELECT rp.zone_id
         FROM users u
         JOIN relay_points rp ON rp.id = u.relay_point_id
         WHERE u.id = $1`,
        [user.id]
      );
      const myZoneId = zoneAccess.rows[0]?.zone_id;
      if (!myZoneId || String(myZoneId).toLowerCase() !== String(req.params.id).toLowerCase()) {
        return res.status(403).json({ error: 'Vous ne pouvez consulter que votre zone de rattachement' });
      }
    }

    const result = await pool.query(
      `SELECT dz.*, 
              u.email as created_by_email
       FROM delivery_zones dz
       LEFT JOIN users u ON dz.created_by = u.id
       WHERE dz.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    // Get transporters assigned to this zone
    const transportersResult = await pool.query(
      `SELECT tdz.*, 
              t.id as transporter_id,
              u.email, 
              u.first_name, 
              u.last_name
       FROM transporter_delivery_zones tdz
       JOIN transporters t ON tdz.transporter_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE tdz.zone_id = $1
       ORDER BY tdz.priority ASC, tdz.created_at ASC`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      transporters: transportersResult.rows,
    });
  } catch (error: any) {
    console.error('Get delivery zone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create delivery zone
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      communes,
      min_latitude,
      max_latitude,
      min_longitude,
      max_longitude,
      is_active = true,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Zone name is required' });
    }

    const result = await pool.query(
      `INSERT INTO delivery_zones (
        name, description, communes, min_latitude, max_latitude, 
        min_longitude, max_longitude, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        description || null,
        communes || [],
        min_latitude ? Number(min_latitude) : null,
        max_latitude ? Number(max_latitude) : null,
        min_longitude ? Number(min_longitude) : null,
        max_longitude ? Number(max_longitude) : null,
        is_active,
        req.user!.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create delivery zone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update delivery zone
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      communes,
      min_latitude,
      max_latitude,
      min_longitude,
      max_longitude,
      is_active,
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name) {
      updates.push(`name = $${++paramCount}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(description);
    }
    if (communes !== undefined) {
      updates.push(`communes = $${++paramCount}`);
      values.push(communes);
    }
    if (min_latitude !== undefined) {
      updates.push(`min_latitude = $${++paramCount}`);
      values.push(min_latitude ? Number(min_latitude) : null);
    }
    if (max_latitude !== undefined) {
      updates.push(`max_latitude = $${++paramCount}`);
      values.push(max_latitude ? Number(max_latitude) : null);
    }
    if (min_longitude !== undefined) {
      updates.push(`min_longitude = $${++paramCount}`);
      values.push(min_longitude ? Number(min_longitude) : null);
    }
    if (max_longitude !== undefined) {
      updates.push(`max_longitude = $${++paramCount}`);
      values.push(max_longitude ? Number(max_longitude) : null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE delivery_zones SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update delivery zone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete delivery zone
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM delivery_zones WHERE id = $1', [req.params.id]);
    res.json({ message: 'Delivery zone deleted successfully' });
  } catch (error: any) {
    console.error('Delete delivery zone error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign zone to transporter
router.post('/:zoneId/transporters/:transporterId', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { zoneId, transporterId } = req.params;
    const { priority = 0 } = req.body;

    // Check if zone and transporter exist
    const zoneCheck = await pool.query('SELECT id FROM delivery_zones WHERE id = $1', [zoneId]);
    if (zoneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    const transporterCheck = await pool.query('SELECT id FROM transporters WHERE id = $1', [transporterId]);
    if (transporterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    const result = await pool.query(
      `INSERT INTO transporter_delivery_zones (transporter_id, zone_id, priority)
       VALUES ($1, $2, $3)
       ON CONFLICT (transporter_id, zone_id) 
       DO UPDATE SET priority = EXCLUDED.priority, updated_at = NOW()
       RETURNING *`,
      [transporterId, zoneId, priority]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Assign zone to transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove zone from transporter
router.delete('/:zoneId/transporters/:transporterId', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { zoneId, transporterId } = req.params;

    await pool.query(
      'DELETE FROM transporter_delivery_zones WHERE zone_id = $1 AND transporter_id = $2',
      [zoneId, transporterId]
    );

    res.json({ message: 'Zone removed from transporter successfully' });
  } catch (error: any) {
    console.error('Remove zone from transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transporters for a zone
router.get('/:id/transporters', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT tdz.*, 
              t.id as transporter_id,
              t.vehicle_type,
              t.status,
              u.email, 
              u.first_name, 
              u.last_name,
              u.phone
       FROM transporter_delivery_zones tdz
       JOIN transporters t ON tdz.transporter_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE tdz.zone_id = $1
       ORDER BY tdz.priority ASC, tdz.created_at ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get zone transporters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get zones for a transporter (admin can get any transporter's zones, transporter can get their own)
router.get('/transporters/:transporterId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { transporterId } = req.params;
    const isAdmin = req.user!.role === 'admin';
    const isTransporter = req.user!.role === 'transporter';

    // If transporter, verify they're requesting their own zones
    if (isTransporter && !isAdmin) {
      // Get the transporter ID for this user
      const transporterResult = await pool.query(
        'SELECT id FROM transporters WHERE user_id = $1',
        [req.user!.id]
      );

      if (transporterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Profil transporteur non trouvé' });
      }

      const userTransporterId = transporterResult.rows[0].id;

      // Verify the transporter is requesting their own zones
      if (userTransporterId !== transporterId) {
        return res.status(403).json({ error: 'Vous ne pouvez accéder qu\'à vos propres zones' });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const result = await pool.query(
      `SELECT dz.*, 
              tdz.priority,
              tdz.created_at as assigned_at
       FROM transporter_delivery_zones tdz
       JOIN delivery_zones dz ON tdz.zone_id = dz.id
       WHERE tdz.transporter_id = $1 AND dz.is_active = true
       ORDER BY tdz.priority ASC, tdz.created_at ASC`,
      [transporterId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get transporter zones error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get zones for current transporter (self-service endpoint)
router.get('/transporters/me/zones', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    // Get the transporter ID for this user
    const transporterResult = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );

    if (transporterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }

    const transporterId = transporterResult.rows[0].id;

    const result = await pool.query(
      `SELECT dz.*, 
              tdz.priority,
              tdz.created_at as assigned_at
       FROM transporter_delivery_zones tdz
       JOIN delivery_zones dz ON tdz.zone_id = dz.id
       WHERE tdz.transporter_id = $1 AND dz.is_active = true
       ORDER BY tdz.priority ASC, tdz.created_at ASC`,
      [transporterId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get my zones error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

