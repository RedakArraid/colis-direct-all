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

// Submit a new relay point application (public, no auth required)
router.post('/', async (req, res) => {
  try {
    const {
      applicant_first_name,
      applicant_last_name,
      business_name,
      business_type,
      phone,
      email,
      commune,
      quartier,
      address,
      address_complement,
      description,
      latitude,
      longitude,
      city,
      hours,
      has_storage_space,
      photo_urls,
    } = req.body;

    // Validation
    if (!applicant_first_name || !applicant_last_name || !business_name || !business_type || !phone || !email || !commune || !quartier || !address) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    // Validate GPS coordinates if provided
    if (latitude !== undefined && latitude !== null) {
      const lat = Number(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Latitude invalide' });
      }
    }
    if (longitude !== undefined && longitude !== null) {
      const lon = Number(longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return res.status(400).json({ error: 'Longitude invalide' });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    const result = await pool.query(
      `INSERT INTO relay_point_applications (
        applicant_first_name, applicant_last_name, business_name, business_type,
        phone, email, commune, quartier, address, address_complement, description,
        latitude, longitude, city, hours, has_storage_space, photo_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending')
      RETURNING *`,
      [
        applicant_first_name,
        applicant_last_name,
        business_name,
        business_type,
        phone,
        email,
        commune,
        quartier,
        address,
        address_complement || null,
        description || null,
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        city || null,
        hours || null,
        has_storage_space || false,
        photo_urls || [],
      ]
    );

    // Send confirmation email to applicant (non-blocking)
    emailService.sendApplicationSubmittedEmail(result.rows[0]).catch(err => {
      console.error('Error sending application submitted email:', err);
    });

    // Notify support team (non-blocking)
    emailService.notifySupportNewApplication(result.rows[0]).catch(err => {
      console.error('Error notifying support:', err);
    });

    res.status(201).json({ application: result.rows[0], message: 'Votre candidature a été soumise avec succès. Vous recevrez une notification par email.' });
  } catch (error: any) {
    console.error('Create relay application error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all applications (admin/support only)
router.get('/', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM relay_point_applications WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      query += ` AND status = $${++paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get relay applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get application by ID (admin/support only, or applicant by email/phone)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone } = req.query;

    let query = 'SELECT * FROM relay_point_applications WHERE id = $1';
    const params: any[] = [id];
    let paramCount = 1;

    // Allow applicants to check their own application status
    if (email || phone) {
      query += ` AND (email = $${++paramCount} OR phone = $${++paramCount})`;
      params.push(email || phone);
      params.push(phone || email);
    } else {
      // For admin/support, require authentication
      const authReq = req as AuthRequest;
      if (!authReq.user || (authReq.user.role !== 'admin' && authReq.user.role !== 'support')) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get relay application error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update application status (admin/support only)
router.patch('/:id/status', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, notes } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'on_hold'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // Get current application
    const appResult = await pool.query('SELECT * FROM relay_point_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appResult.rows[0];

    // Première approbation : point relais + compte partenaire (transaction)
    if (status === 'approved' && application.status !== 'approved') {
      const emailNorm = String(application.email || '').trim().toLowerCase();
      const phoneTrim = String(application.phone || '').trim();

      const existingUserRes = await pool.query(
        `SELECT id, role FROM users WHERE LOWER(TRIM(email)) = $1`,
        [emailNorm]
      );
      const existing = existingUserRes.rows[0];

      if (existing) {
        if (existing.role === 'admin' || existing.role === 'support') {
          return res.status(409).json({
            error:
              'Un compte interne existe déjà avec cet e-mail. Modifiez l’e-mail sur la candidature ou utilisez un compte dédié au point relais.',
          });
        }
        if (existing.role === 'transporter') {
          return res.status(409).json({
            error: 'Cet e-mail est déjà utilisé pour un compte transporteur.',
          });
        }
      } else if (phoneTrim) {
        const phoneRow = await pool.query(
          `SELECT id FROM users WHERE phone = $1 AND phone IS NOT NULL AND BTRIM(phone) <> ''`,
          [phoneTrim]
        );
        if (phoneRow.rows.length > 0) {
          return res.status(409).json({
            error: 'Ce numéro de téléphone est déjà utilisé par un autre compte.',
          });
        }
      }

      const businessTypeMap: { [key: string]: string } = {
        'cybercafé': 'cybercafe',
        cybercafe: 'cybercafe',
        imprimerie: 'imprimerie',
        boutique: 'superette',
        superette: 'superette',
        'supérette': 'superette',
        kiosque: 'superette',
      };

      const mappedBusinessType =
        businessTypeMap[application.business_type?.toLowerCase?.() || ''] || 'superette';

      const client = await pool.connect();
      let approvedRelayPointId: string;
      let onboarding: { isNewAccount: boolean; temporaryPassword?: string };

      try {
        await client.query('BEGIN');

        const relayResult = await client.query(
          `INSERT INTO relay_points (
            name, type, commune, quartier, address, phone, whatsapp, hours,
            latitude, longitude, is_active, created_by, description, photo_urls,
            has_storage_space, application_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id`,
          [
            application.business_name,
            mappedBusinessType,
            application.commune,
            application.quartier,
            application.address,
            application.phone,
            application.phone,
            application.hours,
            application.latitude,
            application.longitude,
            true,
            req.user!.id,
            application.description,
            application.photo_urls || [],
            application.has_storage_space,
            application.id,
          ]
        );
        approvedRelayPointId = relayResult.rows[0].id;

        if (existing) {
          await client.query(
            `UPDATE users
             SET role = 'relay_partner',
                 relay_point_id = $1,
                 phone = CASE WHEN $2::text IS NOT NULL AND BTRIM($2::text) <> '' THEN BTRIM($2::text) ELSE phone END,
                 updated_at = NOW()
             WHERE id = $3`,
            [approvedRelayPointId, phoneTrim || null, existing.id]
          );
          onboarding = { isNewAccount: false };
        } else {
          const tempPassword = generateTempPassword(14);
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, relay_point_id, is_pro)
             VALUES ($1, $2, $3, $4, $5, 'relay_partner', $6, false)`,
            [
              emailNorm,
              hashedPassword,
              application.applicant_first_name || '',
              application.applicant_last_name || '',
              phoneTrim,
              approvedRelayPointId,
            ]
          );
          onboarding = { isNewAccount: true, temporaryPassword: tempPassword };
        }

        const updateResult = await client.query(
          `UPDATE relay_point_applications
           SET status = $1,
               reviewed_by = $2,
               reviewed_at = NOW(),
               rejection_reason = $3,
               notes = $4,
               approved_relay_point_id = COALESCE($5, approved_relay_point_id)
           WHERE id = $6
           RETURNING *`,
          [status, req.user!.id, rejection_reason || null, notes || null, approvedRelayPointId, id]
        );

        await client.query('COMMIT');

        await logAdminActivity(
          req.user!.id,
          'approve_relay_application',
          'relay_point_application',
          id,
          { business_name: application.business_name, relay_point_id: approvedRelayPointId },
          req
        );

        emailService
          .sendApplicationApprovedEmail(application, approvedRelayPointId, onboarding)
          .catch((err) => console.error('Error sending approval email:', err));

        return res.json(updateResult.rows[0]);
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    }

    let approvedRelayPointId: string | null = null;

    const updateResult = await pool.query(
      `UPDATE relay_point_applications
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           rejection_reason = $3,
           notes = $4,
           approved_relay_point_id = COALESCE($5, approved_relay_point_id)
       WHERE id = $6
       RETURNING *`,
      [status, req.user!.id, rejection_reason || null, notes || null, approvedRelayPointId, id]
    );

    if (status === 'rejected') {
      emailService.sendApplicationRejectedEmail(application, rejection_reason || undefined).catch((err) => {
        console.error('Error sending rejection email:', err);
      });
    }

    res.json(updateResult.rows[0]);
  } catch (error: any) {
    console.error('Update application status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update application (admin/support only)
router.patch('/:id', authenticate, requireRole('admin', 'support'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['notes', 'rejection_reason', 'description', 'latitude', 'longitude', 'city'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${++paramCount}`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour' });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE relay_point_applications SET ${updateFields.join(', ')} WHERE id = $${++paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update application error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

