import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { migrate } from '../db/migrate';

const router = express.Router();

const ALLOWED_KEYS = ['general', 'notifications', 'security', 'permissions', 'automation', 'dataManagement', 'payment', 'promoFeature', 'batchDispatch'];

// GET /api/admin/settings
router.get('/', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM admin_settings WHERE key = ANY($1)', [ALLOWED_KEYS]);
    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/settings
router.put('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  const updates = req.body as Record<string, unknown>;
  const keys = Object.keys(updates).filter(k => ALLOWED_KEYS.includes(k));

  if (keys.length === 0) {
    return res.status(400).json({ error: 'Aucun paramètre valide fourni.' });
  }

  try {
    await pool.query('BEGIN');
    for (const key of keys) {
      await pool.query(
        `INSERT INTO admin_settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(updates[key])]
      );
    }
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/settings/public — safe settings readable without auth (e.g. feature flags)
router.get('/public', async (_req, res) => {
  try {
    const result = await pool.query("SELECT value FROM admin_settings WHERE key = 'promoFeature'");
    const promoFeature = result.rows[0]?.value as { enabled?: boolean } | undefined;
    res.json({ promoCodeEnabled: promoFeature?.enabled !== false }); // default true
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/settings/run-migrations
// Trigger pending database migrations (admin only)
router.post('/run-migrations', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    await migrate();
    res.json({ success: true, message: 'Migrations executed successfully' });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/settings/purge-shipments
// Hard-delete ALL shipments and related data in cascade (staging/dev use only).
// Protected: admin role required.
router.post('/purge-shipments', authenticate, requireRole('admin'), async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Purge interdite en production' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Disable triggers to avoid side effects during bulk delete
    await client.query("SET LOCAL session_replication_role = replica");

    // Delete in dependency order (children first)
    const tables = [
      'shipment_tracking',
      'transporter_assignments',
      'mobile_money_payments',
      'relay_cash_payments',
      'shipments',
    ];

    const counts: Record<string, number> = {};
    for (const table of tables) {
      try {
        const r = await client.query(`DELETE FROM ${table}`);
        counts[table] = r.rowCount ?? 0;
      } catch (e: any) {
        // Table may not exist (e.g. mobile_money_payments)
        console.warn(`⚠️  Could not delete from ${table}:`, e.message);
        counts[table] = -1;
      }
    }

    // Reset current_packages for all transporters
    await client.query('UPDATE transporters SET current_packages = 0');

    await client.query('COMMIT');
    console.log('✅ All shipments purged:', counts);
    res.json({ success: true, deleted: counts });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Purge error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
