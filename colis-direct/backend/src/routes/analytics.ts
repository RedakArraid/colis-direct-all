import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Get daily statistics
router.get('/daily', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      'SELECT * FROM daily_statistics ORDER BY date DESC LIMIT $1',
      [parseInt(days as string)]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get daily statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get monthly reports
router.get('/monthly', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { months = 12 } = req.query;
    const result = await pool.query(
      'SELECT * FROM monthly_reports ORDER BY year DESC, month DESC LIMIT $1',
      [parseInt(months as string)]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get monthly reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get relay point performance
router.get('/relay-performance', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM relay_point_performance ORDER BY total_revenue DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay performance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shipment statistics view
router.get('/shipment-stats', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await pool.query(
      `SELECT * FROM shipment_statistics WHERE date >= CURRENT_DATE - ($1 || ' days')::interval ORDER BY date DESC`,
      [parseInt(days as string)]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get shipment stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

