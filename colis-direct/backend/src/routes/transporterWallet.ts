import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();

const WITHDRAW_MIN_FCFA = 5000;

// GET /api/transporter/wallet — Solde et résumé du livreur connecté
router.get('/', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    // Portefeuille principal
    const walletRes = await pool.query(
      'SELECT * FROM transporter_wallets WHERE transporter_id = $1',
      [transporterId]
    );

    if (walletRes.rows.length === 0) {
      // Créer un portefeuille vide si absent (rétrocompatibilité)
      const created = await pool.query(
        `INSERT INTO transporter_wallets (transporter_id) VALUES ($1) RETURNING *`,
        [transporterId]
      );
      return res.json({ wallet: created.rows[0], stats: { today: 0, week: 0, month: 0 } });
    }

    // Stats agrégées : gains aujourd'hui / cette semaine / ce mois
    const statsRes = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN amount_fcfa ELSE 0 END), 0) AS today,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', NOW()) THEN amount_fcfa ELSE 0 END), 0) AS week,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN amount_fcfa ELSE 0 END), 0) AS month
       FROM wallet_transactions
       WHERE transporter_id = $1 AND type = 'commission_earned' AND status = 'completed'`,
      [transporterId]
    );

    res.json({ wallet: walletRes.rows[0], stats: statsRes.rows[0] });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transporter/wallet/transactions — Historique paginé
router.get('/transactions', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT wt.*, s.tracking_number
       FROM wallet_transactions wt
       LEFT JOIN shipments s ON s.id = wt.shipment_id
       WHERE wt.transporter_id = $1
       ORDER BY wt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [transporterId, limit, offset]
    );

    const totalRes = await pool.query(
      'SELECT COUNT(*) FROM wallet_transactions WHERE transporter_id = $1',
      [transporterId]
    );

    res.json({
      data: result.rows,
      total: parseInt(totalRes.rows[0].count),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transporter/wallet/withdraw — Demande de retrait
router.post('/withdraw', authenticate, requireRole('transporter'), async (req: AuthRequest, res) => {
  try {
    const transporterRes = await pool.query(
      'SELECT id FROM transporters WHERE user_id = $1',
      [req.user!.id]
    );
    if (transporterRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profil transporteur non trouvé' });
    }
    const transporterId = transporterRes.rows[0].id;

    const { amount_fcfa, orange_money_number, notes } = req.body;

    if (!amount_fcfa || isNaN(Number(amount_fcfa)) || Number(amount_fcfa) < WITHDRAW_MIN_FCFA) {
      return res.status(400).json({
        error: `Le montant minimum de retrait est ${WITHDRAW_MIN_FCFA.toLocaleString()} FCFA`,
      });
    }

    if (!orange_money_number) {
      return res.status(400).json({ error: 'Numéro Orange Money requis' });
    }

    const walletRes = await pool.query(
      'SELECT balance_fcfa FROM transporter_wallets WHERE transporter_id = $1',
      [transporterId]
    );

    if (walletRes.rows.length === 0) {
      return res.status(400).json({ error: 'Portefeuille introuvable' });
    }

    const balance = parseFloat(walletRes.rows[0].balance_fcfa);
    if (Number(amount_fcfa) > balance) {
      return res.status(400).json({
        error: `Solde insuffisant. Solde disponible : ${balance.toLocaleString()} FCFA`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Créer la transaction en statut "pending" (validation admin nécessaire)
      const txRes = await client.query(
        `INSERT INTO wallet_transactions
           (transporter_id, type, amount_fcfa, status, orange_money_ref, notes)
         VALUES ($1, 'withdrawal', $2, 'pending', $3, $4)
         RETURNING *`,
        [transporterId, Number(amount_fcfa), orange_money_number, notes || null]
      );

      // Réserver le montant (déduire du solde immédiatement)
      await client.query(
        `UPDATE transporter_wallets
         SET balance_fcfa = balance_fcfa - $1, updated_at = NOW()
         WHERE transporter_id = $2`,
        [Number(amount_fcfa), transporterId]
      );

      await client.query('COMMIT');

      // Notifier les admins
      const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of adminRes.rows) {
        pool.query(
          `INSERT INTO notifications (user_id, title, message, type, data)
           VALUES ($1, $2, $3, 'withdrawal_request', $4::jsonb)`,
          [
            admin.id,
            '💸 Demande de retrait livreur',
            `${Number(amount_fcfa).toLocaleString()} FCFA via Orange Money (${orange_money_number})`,
            JSON.stringify({ transaction_id: txRes.rows[0].id, transporter_id: transporterId }),
          ]
        ).catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: 'Demande de retrait soumise. Traitement sous 24-48h ouvrés.',
        transaction: txRes.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/wallets — Vue admin de tous les portefeuilles
router.get('/admin', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
          tw.*,
          u.first_name, u.last_name, u.email, u.phone,
          t.vehicle_type, t.status AS transporter_status,
          (SELECT COUNT(*) FROM wallet_transactions wt
           WHERE wt.transporter_id = tw.transporter_id AND wt.status = 'pending'
             AND wt.type = 'withdrawal') AS pending_withdrawals
       FROM transporter_wallets tw
       JOIN transporters t ON t.id = tw.transporter_id
       JOIN users u ON u.id = t.user_id
       ORDER BY tw.balance_fcfa DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get admin wallets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/wallets/withdrawals — Demandes de retrait en attente (admin)
router.get('/admin/withdrawals', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
          wt.*,
          u.first_name, u.last_name, u.email, u.phone
       FROM wallet_transactions wt
       JOIN transporters t ON t.id = wt.transporter_id
       JOIN users u ON u.id = t.user_id
       WHERE wt.type = 'withdrawal' AND wt.status = 'pending'
       ORDER BY wt.created_at ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get admin withdrawals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/wallets/withdrawals/:txId/approve — Valider un retrait
router.post('/admin/withdrawals/:txId/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { txId } = req.params;
    const { orange_money_ref } = req.body;

    const txRes = await pool.query(
      `SELECT wt.*, t.id AS transporter_id
       FROM wallet_transactions wt
       JOIN transporters t ON t.id = wt.transporter_id
       WHERE wt.id = $1 AND wt.type = 'withdrawal' AND wt.status = 'pending'`,
      [txId]
    );

    if (txRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction introuvable ou déjà traitée' });
    }

    const tx = txRes.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE wallet_transactions
         SET status = 'completed', orange_money_ref = COALESCE($1, orange_money_ref),
             notes = COALESCE(notes, '') || ' [Validé admin]'
         WHERE id = $2`,
        [orange_money_ref || null, txId]
      );

      await client.query(
        `UPDATE transporter_wallets
         SET total_withdrawn_fcfa = total_withdrawn_fcfa + $1, updated_at = NOW()
         WHERE transporter_id = $2`,
        [tx.amount_fcfa, tx.transporter_id]
      );

      await client.query('COMMIT');
      res.json({ success: true, message: 'Retrait validé' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/wallets/withdrawals/:txId/reject — Rejeter et rembourser
router.post('/admin/withdrawals/:txId/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { txId } = req.params;
    const { reason } = req.body;

    const txRes = await pool.query(
      `SELECT wt.*, t.id AS transporter_id
       FROM wallet_transactions wt
       JOIN transporters t ON t.id = wt.transporter_id
       WHERE wt.id = $1 AND wt.type = 'withdrawal' AND wt.status = 'pending'`,
      [txId]
    );

    if (txRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction introuvable ou déjà traitée' });
    }

    const tx = txRes.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE wallet_transactions SET status = 'reversed', notes = $1 WHERE id = $2`,
        [`Rejeté par admin: ${reason || 'sans motif'}`, txId]
      );

      // Rembourser le solde
      await client.query(
        `UPDATE transporter_wallets
         SET balance_fcfa = balance_fcfa + $1, updated_at = NOW()
         WHERE transporter_id = $2`,
        [tx.amount_fcfa, tx.transporter_id]
      );

      await client.query('COMMIT');
      res.json({ success: true, message: 'Retrait rejeté et solde remboursé' });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
