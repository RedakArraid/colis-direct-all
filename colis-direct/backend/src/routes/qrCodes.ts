import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Generate QR code for a shipment stage
router.post('/generate', authenticate, requireRole('admin', 'relay_partner', 'transporter'), async (req: AuthRequest, res) => {
  try {
    const { shipment_id, stage } = req.body;

    if (!shipment_id || !stage) {
      return res.status(400).json({ error: 'shipment_id and stage are required' });
    }

    if (!['depot', 'transit', 'delivery'].includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage. Must be: depot, transit, or delivery' });
    }

    const result = await pool.query(
      'SELECT generate_shipment_qr_code($1, $2) as qr_code_data',
      [shipment_id, stage]
    );

    const qrCodeData = result.rows[0].qr_code_data;

    // Get the QR code hash for the response
    const hashResult = await pool.query(
      'SELECT qr_code_hash FROM shipment_qr_codes WHERE shipment_id = $1 AND stage = $2',
      [shipment_id, stage]
    );

    res.json({
      qr_code_data: qrCodeData,
      qr_code_hash: hashResult.rows[0]?.qr_code_hash,
      stage,
      shipment_id
    });
  } catch (error: any) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scan QR code
router.post('/scan', authenticate, requireRole('admin', 'relay_partner', 'transporter'), async (req: AuthRequest, res) => {
  try {
    const { qr_code_hash, scanned_location } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!qr_code_hash) {
      return res.status(400).json({ error: 'qr_code_hash is required' });
    }

    // Determine scanned_by_type based on user role
    let scannedByType: 'relay' | 'transporter';
    if (userRole === 'transporter') {
      scannedByType = 'transporter';
    } else if (userRole === 'relay_partner') {
      scannedByType = 'relay';
    } else {
      scannedByType = 'relay'; // Default for admin
    }

    const result = await pool.query(
      'SELECT scan_shipment_qr_code($1, $2, $3, $4) as scan_result',
      [qr_code_hash, userId, scannedByType, scanned_location || null]
    );

    const scanResult = result.rows[0].scan_result;

    if (!scanResult.valid) {
      return res.status(400).json({ error: scanResult.error || 'Invalid QR code' });
    }

    res.json(scanResult);
  } catch (error: any) {
    console.error('Scan QR code error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR codes for a shipment
router.get('/shipment/:shipment_id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { shipment_id } = req.params;

    const result = await pool.query(
      `SELECT stage, qr_code_data, qr_code_hash, scanned_at, scanned_by_type, scanned_location, is_valid
       FROM shipment_qr_codes
       WHERE shipment_id = $1
       ORDER BY stage`,
      [shipment_id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get QR codes error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

