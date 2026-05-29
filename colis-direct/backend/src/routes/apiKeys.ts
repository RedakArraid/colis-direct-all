import express, { Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db/connection';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require JWT auth + admin role
router.use(authenticate, requireRole('admin'));

// GET / — list all API keys
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, key_prefix, partner_name, partner_email, description,
              scopes, rate_limit_per_min, is_active, last_used_at, created_at
       FROM api_keys
       ORDER BY created_at DESC`
    );
    return res.json(result.rows);
  } catch (error: any) {
    console.error('[API KEYS] list error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /stats/overview — must be before /:id
router.get('/stats/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const totalKeysResult = await pool.query(
      'SELECT COUNT(*) AS total FROM api_keys'
    );
    const activeKeysResult = await pool.query(
      'SELECT COUNT(*) AS total FROM api_keys WHERE is_active = true'
    );
    const todayResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM api_usage_logs
       WHERE created_at >= CURRENT_DATE`
    );
    const weekResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM api_usage_logs
       WHERE created_at >= date_trunc('week', CURRENT_DATE)`
    );

    return res.json({
      total_keys: parseInt(totalKeysResult.rows[0].total, 10),
      active_keys: parseInt(activeKeysResult.rows[0].total, 10),
      total_requests_today: parseInt(todayResult.rows[0].total, 10),
      total_requests_week: parseInt(weekResult.rows[0].total, 10),
    });
  } catch (error: any) {
    console.error('[API KEYS] stats overview error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST / — create a new API key
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      partner_name,
      partner_email,
      description,
      scopes = [],
      rate_limit_per_min = 60,
    } = req.body;

    if (!partner_name) {
      return res.status(400).json({ error: 'partner_name est requis' });
    }

    // Generate token
    const token = 'cd_live_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = token.slice(0, 16);
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `INSERT INTO api_keys (key_prefix, key_hash, partner_name, partner_email, description, scopes, rate_limit_per_min, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
       RETURNING id, key_prefix, partner_name, partner_email, description, scopes, rate_limit_per_min, is_active, created_at`,
      [keyPrefix, keyHash, partner_name, partner_email || null, description || null, scopes, rate_limit_per_min]
    );

    // Return token only once
    return res.status(201).json({
      ...result.rows[0],
      token,
    });
  } catch (error: any) {
    console.error('[API KEYS] create error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /:id/usage — must be before /:id
router.get('/:id/usage', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, method, path, ip_address, user_agent, created_at
       FROM api_usage_logs
       WHERE api_key_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [id]
    );
    return res.json(result.rows);
  } catch (error: any) {
    console.error('[API KEYS] usage error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /:id — update an API key
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { partner_name, partner_email, description, scopes, rate_limit_per_min, is_active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (partner_name !== undefined) {
      updates.push(`partner_name = $${++paramCount}`);
      values.push(partner_name);
    }
    if (partner_email !== undefined) {
      updates.push(`partner_email = $${++paramCount}`);
      values.push(partner_email);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      values.push(description);
    }
    if (scopes !== undefined) {
      updates.push(`scopes = $${++paramCount}`);
      values.push(scopes);
    }
    if (rate_limit_per_min !== undefined) {
      updates.push(`rate_limit_per_min = $${++paramCount}`);
      values.push(rate_limit_per_min);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE api_keys SET ${updates.join(', ')}
       WHERE id = $${++paramCount}
       RETURNING id, key_prefix, partner_name, partner_email, description, scopes, rate_limit_per_min, is_active, last_used_at, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clé API introuvable' });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error('[API KEYS] update error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /:id — revoke and delete an API key
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First set is_active = false, then delete
    await pool.query(`UPDATE api_keys SET is_active = false WHERE id = $1`, [id]);
    const result = await pool.query(
      `DELETE FROM api_keys WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clé API introuvable' });
    }

    return res.json({ message: 'Clé API révoquée et supprimée avec succès' });
  } catch (error: any) {
    console.error('[API KEYS] delete error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
