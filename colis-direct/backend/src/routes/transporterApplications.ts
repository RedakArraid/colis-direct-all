import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAdminActivity } from './activityLogs';
import emailService from '../services/emailService';

const router = express.Router();

function generateTempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

// POST /api/transporter-applications — Candidature publique (sans auth)
router.post('/', async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      vehicle_type,
      license_plate,
      preferred_zones,
      commune,
      quartier,
      address,
      description,
    } = req.body;

    if (!first_name || !last_name || !phone || !email || !vehicle_type || !commune) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const validVehicles = ['moto', 'velo', 'voiture', 'camionnette', 'pied'];
    if (!validVehicles.includes(vehicle_type)) {
      return res.status(400).json({ error: 'Type de véhicule invalide' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    const result = await pool.query(
      `INSERT INTO transporter_applications
         (first_name, last_name, phone, email, vehicle_type, license_plate,
          preferred_zones, commune, quartier, address, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING *`,
      [
        first_name,
        last_name,
        phone,
        email.trim().toLowerCase(),
        vehicle_type,
        license_plate || null,
        preferred_zones || [],
        commune,
        quartier || null,
        address || null,
        description || null,
      ]
    );

    // Notifier le support (non-bloquant)
    emailService.notifySupportNewApplication({
      ...result.rows[0],
      business_name: `${first_name} ${last_name}`,
      business_type: vehicle_type,
    }).catch((err) => console.error('Error notifying support (transporter app):', err));

    res.status(201).json({
      application: result.rows[0],
      message: 'Votre candidature a été soumise. Vous serez contacté(e) sous 48h.',
    });
  } catch (error: any) {
    console.error('Create transporter application error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transporter-applications — Liste (admin/support)
router.get('/', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM transporter_applications WHERE 1=1';
    const params: any[] = [];
    let p = 0;

    if (status) {
      query += ` AND status = $${++p}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get transporter applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transporter-applications/:id — Détail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.query;

    let query = 'SELECT * FROM transporter_applications WHERE id = $1';
    const params: any[] = [id];
    let p = 1;

    if (email || phone) {
      query += ` AND (email = $${++p} OR phone = $${++p})`;
      params.push(email || phone);
      params.push(phone || email);
    } else {
      const authReq = req as AuthRequest;
      if (!authReq.user || (authReq.user.role !== 'admin' && authReq.user.role !== 'support')) {
        return res.status(403).json({ error: 'Non autorisé' });
      }
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get transporter application error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/transporter-applications/:id/status — Approbation/rejet admin
router.patch('/:id/status', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, notes } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'on_hold'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const appResult = await pool.query('SELECT * FROM transporter_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    const application = appResult.rows[0];

    // Approbation : création du compte livreur en transaction
    if (status === 'approved' && application.status !== 'approved') {
      const emailNorm = String(application.email || '').trim().toLowerCase();
      const phoneTrim = String(application.phone || '').trim();

      const existingRes = await pool.query(
        `SELECT id, role FROM users WHERE LOWER(TRIM(email)) = $1`,
        [emailNorm]
      );
      const existing = existingRes.rows[0];

      if (existing && ['admin', 'support', 'relay_partner'].includes(existing.role)) {
        return res.status(409).json({
          error: 'Un compte avec un autre rôle prioritaire existe déjà avec cet e-mail.',
        });
      }

      const client = await pool.connect();
      let approvedTransporterId: string;
      let isNewAccount = false;
      let temporaryPassword: string | undefined;

      try {
        await client.query('BEGIN');

        let userId: string;

        if (existing) {
          // Mise à jour du compte existant en rôle transporter
          await client.query(
            `UPDATE users SET role = 'transporter', phone = COALESCE($1, phone), updated_at = NOW() WHERE id = $2`,
            [phoneTrim || null, existing.id]
          );
          userId = existing.id;
        } else {
          temporaryPassword = generateTempPassword(14);
          const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
          const userRes = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_pro)
             VALUES ($1, $2, $3, $4, $5, 'transporter', false)
             RETURNING id`,
            [emailNorm, hashedPassword, application.first_name, application.last_name, phoneTrim]
          );
          userId = userRes.rows[0].id;
          isNewAccount = true;
        }

        // Créer le profil transporteur
        const transporterRes = await client.query(
          `INSERT INTO transporters (user_id, vehicle_type, license_plate, status)
           VALUES ($1, $2, $3, 'available')
           ON CONFLICT (user_id) DO UPDATE
             SET vehicle_type = EXCLUDED.vehicle_type,
                 license_plate = COALESCE(EXCLUDED.license_plate, transporters.license_plate),
                 status = 'available',
                 updated_at = NOW()
           RETURNING id`,
          [userId, application.vehicle_type, application.license_plate || null]
        );
        approvedTransporterId = transporterRes.rows[0].id;

        // Créer le portefeuille vide
        await client.query(
          `INSERT INTO transporter_wallets (transporter_id) VALUES ($1)
           ON CONFLICT (transporter_id) DO NOTHING`,
          [approvedTransporterId]
        );

        // Affecter les zones préférées si des zones existent
        if (application.preferred_zones && application.preferred_zones.length > 0) {
          for (const zoneName of application.preferred_zones) {
            const zoneRes = await client.query(
              `SELECT id FROM delivery_zones WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1`,
              [zoneName]
            );
            if (zoneRes.rows.length > 0) {
              await client.query(
                `INSERT INTO transporter_delivery_zones (transporter_id, zone_id, priority)
                 VALUES ($1, $2, 0)
                 ON CONFLICT (transporter_id, zone_id) DO NOTHING`,
                [approvedTransporterId, zoneRes.rows[0].id]
              );
            }
          }
        }

        // Marquer la candidature comme approuvée
        const updateRes = await client.query(
          `UPDATE transporter_applications
           SET status = 'approved',
               reviewed_by = $1,
               reviewed_at = NOW(),
               approved_transporter_id = $2,
               notes = COALESCE($3, notes)
           WHERE id = $4
           RETURNING *`,
          [req.user!.id, approvedTransporterId, notes || null, id]
        );

        await client.query('COMMIT');

        await logAdminActivity(
          req.user!.id,
          'approve_transporter_application',
          'transporter_application',
          id,
          { name: `${application.first_name} ${application.last_name}`, transporter_id: approvedTransporterId },
          req
        );

        // Email de bienvenue (non-bloquant)
        if (isNewAccount && temporaryPassword) {
          emailService.sendApplicationApprovedEmail(
            { ...application, business_name: `${application.first_name} ${application.last_name}` },
            approvedTransporterId,
            { isNewAccount: true, temporaryPassword }
          ).catch((err) => console.error('Error sending transporter approval email:', err));
        }

        return res.json(updateRes.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    // Rejet / mise en attente
    const updateRes = await pool.query(
      `UPDATE transporter_applications
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
           rejection_reason = $3, notes = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [status, req.user!.id, rejection_reason || null, notes || null, id]
    );

    res.json(updateRes.rows[0]);
  } catch (error: any) {
    console.error('Update transporter application status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/transporter-applications/:id — Mise à jour notes admin
router.patch('/:id', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { notes, rejection_reason } = req.body;

    const allowedFields: Record<string, any> = {};
    if (notes !== undefined) allowedFields.notes = notes;
    if (rejection_reason !== undefined) allowedFields.rejection_reason = rejection_reason;

    const fields = Object.keys(allowedFields);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' });
    }

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = fields.map((f) => allowedFields[f]);
    values.push(id);

    const result = await pool.query(
      `UPDATE transporter_applications SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update transporter application error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
