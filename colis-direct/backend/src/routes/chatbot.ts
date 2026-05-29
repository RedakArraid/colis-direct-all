import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import nodemailer from 'nodemailer';
import { ingestSupportMessage } from '../services/supportIngestion';

const router = express.Router();

// Configure email transporter (simple SMTP)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
} as any);

// Submit chatbot message (public endpoint)
router.post('/message', async (req, res) => {
  try {
    const { user_id, user_email, user_phone, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const result = await pool.query(
      `INSERT INTO chatbot_messages (user_id, user_email, user_phone, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id || null, user_email || null, user_phone || null, message.trim()]
    );

    const savedMessage = result.rows[0];

    let supportTicketId: string | null = null;
    try {
      const ingestion = await ingestSupportMessage({
        channel: 'chatbot',
        messageId: savedMessage.id,
        message: savedMessage.message,
        customerId: savedMessage.user_id,
        customerEmail: savedMessage.user_email,
        customerPhone: savedMessage.user_phone,
        metadata: {
          chatbot_message_id: savedMessage.id,
        },
      });
      supportTicketId = ingestion.ticketId;

      await pool.query(
        `UPDATE chatbot_messages
         SET status = 'in_progress',
             updated_at = NOW()
         WHERE id = $1`,
        [savedMessage.id]
      );
    } catch (syncError) {
      console.error('Erreur synchronisation support (chatbot):', syncError);
    }

    // Send email to company
    const companyEmail = process.env.COMPANY_EMAIL || 'contact@colisdirect.com';
    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@colisdirect.com',
        to: companyEmail,
        subject: `Nouveau message du chatbot - ${user_email || user_phone || 'Anonyme'}`,
        html: `
          <h2>Nouveau message du chatbot</h2>
          <p><strong>Email:</strong> ${user_email || 'Non renseigné'}</p>
          <p><strong>Téléphone:</strong> ${user_phone || 'Non renseigné'}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <p><small>ID Message: ${savedMessage.id}</small></p>
        `,
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
    }

    res.json({ success: true, message: savedMessage, support_ticket_id: supportTicketId });
  } catch (error: any) {
    console.error('Chatbot message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for service client (support role)
router.get('/messages', authenticate, requireRole('support', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM chatbot_messages WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      query += ` AND status = $${++paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (++paramCount) + ' OFFSET $' + (++paramCount);
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update message (assign, respond, resolve)
router.patch('/messages/:id', authenticate, requireRole('support', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { status, response, assigned_to } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      updates.push(`status = $${++paramCount}`);
      params.push(status);
      if (status === 'resolved') {
        updates.push(`resolved_at = NOW()`);
      }
    }

    if (response) {
      updates.push(`response = $${++paramCount}`);
      params.push(response);
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${++paramCount}`);
      params.push(assigned_to || null);
    }

    updates.push(`updated_at = NOW()`);

    params.push(req.params.id);

    const query = `UPDATE chatbot_messages SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update message error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

