import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all transporters (admin and relay_partner can view)
router.get('/', authenticate, requireRole('admin', 'relay_partner'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         t.*, 
         u.email, 
         u.first_name, 
         u.last_name, 
        u.phone,
        u.address as user_address,
        u.ville as user_city,
        u.commune as user_commune,
        u.quartier as user_quarter,
         COALESCE(
           (SELECT COUNT(*) 
            FROM shipments s
            WHERE s.current_status NOT IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER', 'CANCELLED', 'RETURN_TO_SENDER')
              AND (
                -- Check if shipment destination is in transporter's assigned zones
                EXISTS (
                  SELECT 1 
                  FROM delivery_zones dz
                  JOIN transporter_delivery_zones tdz ON dz.id = tdz.zone_id
                  WHERE tdz.transporter_id = t.id
                    AND (
                      -- For relay point deliveries, check if destination relay is in zone
                      (NOT s.home_delivery AND s.destination_relay_id IS NOT NULL
                       AND EXISTS (
                         SELECT 1 FROM relay_points rp
                         WHERE rp.id = s.destination_relay_id
                           AND rp.zone_id = dz.id
                       ))
                      OR
                      -- For home deliveries, check if recipient commune is in zone
                      (s.home_delivery AND s.recipient_commune = ANY(dz.communes))
                    )
                )
              )
           ), 0
         ) as current_packages,
         COALESCE(
           (SELECT COUNT(*) 
            FROM transporter_assignments ta
            JOIN shipments s ON ta.shipment_id = s.id
            WHERE ta.transporter_id = t.id 
              AND s.current_status IN ('DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER')
           ), 0
         ) as total_deliveries
       FROM transporters t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get transporters error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transporter by ID
router.get('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
         u.email, 
         u.first_name, 
         u.last_name, 
         u.phone,
         u.address as user_address,
         u.ville as user_city,
         u.commune as user_commune,
         u.quartier as user_quarter
       FROM transporters t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create transporter
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { user_id, vehicle_type, license_plate, status = 'available' } = req.body;

    const result = await pool.query(
      `INSERT INTO transporters (user_id, vehicle_type, license_plate, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, vehicle_type, license_plate || null, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transporter
router.patch('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { vehicle_type, license_plate, status } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (vehicle_type) {
      updates.push(`vehicle_type = $${++paramCount}`);
      values.push(vehicle_type);
    }
    if (license_plate !== undefined) {
      updates.push(`license_plate = $${++paramCount}`);
      values.push(license_plate);
    }
    if (status) {
      updates.push(`status = $${++paramCount}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE transporters SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete transporter
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM transporters WHERE id = $1', [req.params.id]);
    res.json({ message: 'Transporter deleted successfully' });
  } catch (error: any) {
    console.error('Delete transporter error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

