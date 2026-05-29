import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get user notifications
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { unread_only } = req.query;
    
    // Check if notifications table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      console.warn('Notifications table does not exist, returning empty array');
      return res.json([]);
    }
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [req.user!.id];

    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    // Return empty array instead of error to prevent frontend issues
    res.json([]);
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if notifications table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour de la notification' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if notifications table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json({ message: 'All notifications marked as read' });
    }
    
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user!.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour des notifications' });
  }
});

export default router;

