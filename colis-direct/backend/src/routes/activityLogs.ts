import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

// Log admin activity
export async function logAdminActivity(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any,
  req?: express.Request
) {
  try {
    await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId,
        action,
        entityType,
        entityId || null,
        details ? JSON.stringify(details) : null,
        req?.ip || req?.socket.remoteAddress || null,
        req?.get('user-agent') || null,
      ]
    );
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw - logging should not break the main flow
  }
}

// Get activity logs (admin only)
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { limit = 100, offset = 0, admin_id, entity_type } = req.query;
    let query = 'SELECT * FROM admin_activity_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (admin_id) {
      query += ` AND admin_id = $${++paramCount}`;
      params.push(admin_id);
    }

    if (entity_type) {
      query += ` AND entity_type = $${++paramCount}`;
      params.push(entity_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

