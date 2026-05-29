import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT items FROM public.user_carts WHERE user_id = $1',
      [req.user.id]
    );
    const items = result.rows[0]?.items ?? [];
    res.json({ data: items });
  } catch (err: any) {
    console.error('GET /cart error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du panier' });
  }
});

router.put('/', authenticate, async (req: any, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }
  try {
    await pool.query(
      `INSERT INTO public.user_carts (user_id, items, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET items = EXCLUDED.items, updated_at = NOW()`,
      [req.user.id, JSON.stringify(items)]
    );
    res.json({ data: items });
  } catch (err: any) {
    console.error('PUT /cart error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du panier' });
  }
});

export default router;
