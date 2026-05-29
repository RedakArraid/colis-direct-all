import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ingestSupportMessage } from '../services/supportIngestion';
import { emitSupportEvent } from '../events/supportEvents';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const SUMMARY_SELECT = `
  cm.id,
  cm.subject,
  cm.status,
  cm.created_at,
  cm.updated_at,
  cm.last_response_at,
  cm.unread,
  cm.support_ticket_id,
  COALESCE(
    (
      SELECT sm.body
      FROM support_messages sm
      WHERE sm.ticket_id = cm.support_ticket_id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ),
    cm.admin_response,
    cm.message
  ) AS last_message_body,
  COALESCE(
    (
      SELECT sm.sender_type
      FROM support_messages sm
      WHERE sm.ticket_id = cm.support_ticket_id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ),
    'customer'
  ) AS last_message_sender,
  COALESCE(
    (
      SELECT sm.created_at
      FROM support_messages sm
      WHERE sm.ticket_id = cm.support_ticket_id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ),
    cm.last_response_at,
    cm.updated_at,
    cm.created_at
  ) AS last_message_at
`;

const mapSummary = (row: any) => ({
  id: row.id,
  subject: row.subject,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
  last_response_at: row.last_response_at,
  unread: row.unread,
  support_ticket_id: row.support_ticket_id,
  last_message_at: row.last_message_at,
  last_message_preview: row.last_message_body,
  last_message_from:
    row.last_message_sender === 'agent'
      ? 'support'
      : row.last_message_sender === 'system'
      ? 'system'
      : 'client',
});

// Get all conversations for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${SUMMARY_SELECT}
       FROM customer_messages cm
       WHERE cm.user_id = $1
       ORDER BY COALESCE(cm.last_response_at, cm.updated_at, cm.created_at) DESC`,
      [req.user!.id]
    );

    res.json(rows.map(mapSummary));
  } catch (error: any) {
    console.error('Get customer messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get conversation detail
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const detail = await fetchConversationDetail(id, req.user!.id);

    if (!detail) {
      return res.status(404).json({ error: 'Message introuvable' });
    }

    await pool.query(
      `UPDATE customer_messages
       SET unread = false,
           last_viewed_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ ...detail, unread: false });
  } catch (error: any) {
    console.error('Get customer message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new message
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Le sujet et le message sont requis' });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({ error: 'Le sujet doit contenir au moins 3 caractères' });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ error: 'Le message doit contenir au moins 10 caractères' });
    }

    const result = await pool.query(
      `INSERT INTO customer_messages (user_id, subject, message, status, unread, last_viewed_at, last_response_at)
       VALUES ($1, $2, $3, 'pending', false, NOW(), NOW())
       RETURNING *`,
      [req.user!.id, subject.trim(), message.trim()]
    );

    const savedMessage = result.rows[0];

    try {
      const ingestion = await ingestSupportMessage({
        channel: 'contact_form',
        messageId: savedMessage.id,
        message: message.trim(),
        subject: subject.trim(),
        customerId: req.user!.id,
        metadata: {
          customer_message_id: savedMessage.id,
        },
      });

      await pool.query(
        `UPDATE customer_messages
         SET status = 'in_progress',
             support_ticket_id = $2,
             updated_at = NOW(),
             last_response_at = NOW(),
             unread = false
         WHERE id = $1`,
        [savedMessage.id, ingestion.ticketId]
      );

      const summaryQuery = await pool.query(
        `SELECT ${SUMMARY_SELECT}
         FROM customer_messages cm
         WHERE cm.user_id = $1 AND cm.id = $2`,
        [req.user!.id, savedMessage.id]
      );

      return res.status(201).json(mapSummary(summaryQuery.rows[0]));
    } catch (error) {
      console.error('Erreur synchronisation support (customer message):', error);

      const fallbackSummary = mapSummary({
        ...savedMessage,
        last_message_body: savedMessage.message,
        last_message_sender: 'customer',
        last_message_at: savedMessage.created_at,
      });

      return res.status(201).json(fallbackSummary);
    }
  } catch (error: any) {
    console.error('Create customer message error:', error);
    res.status(500).json({ error: error.message });
  }
});

const buildConversationResponse = (message: any, conversation: any[]) => ({
  id: message.id,
  subject: message.subject,
  status: message.status,
  created_at: message.created_at,
  updated_at: message.updated_at,
  last_response_at: message.last_response_at,
  unread: !!message.unread,
  support_ticket_id: message.support_ticket_id,
  channel: message.channel || 'contact_form',
  conversation,
});

const fetchConversationDetail = async (messageId: string, userId: string | null) => {
  const result = await pool.query(
    `SELECT cm.*, st.channel, st.customer_name, st.customer_email
     FROM customer_messages cm
     LEFT JOIN support_tickets st ON cm.support_ticket_id = st.id
     WHERE cm.id = $1 ${userId ? 'AND cm.user_id = $2' : ''}`,
    userId ? [messageId, userId] : [messageId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const message = result.rows[0];

  if (message.support_ticket_id) {
    const convoResult = await pool.query(
      `SELECT id, sender_type, body, attachments, created_at
       FROM support_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [message.support_ticket_id]
    );

    const conversation = convoResult.rows.map((row) => ({
      id: row.id,
      sender:
        row.sender_type === 'agent'
          ? 'support'
          : row.sender_type === 'system'
          ? 'system'
          : 'client',
      body: row.body,
      created_at: row.created_at,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
    }));

    return buildConversationResponse(message, conversation);
  }

  const conversation = [
    {
      id: `cm-${message.id}`,
      sender: 'client',
      body: message.message,
      created_at: message.created_at,
      attachments: [],
    },
    ...(message.admin_response
      ? [
          {
            id: `cm-${message.id}-reply`,
            sender: 'support',
            body: message.admin_response,
            created_at: message.responded_at || message.updated_at,
            attachments: [],
          },
        ]
      : []),
  ];

  return buildConversationResponse(message, conversation);
};

router.post('/:id/reply', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { message, attachments } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message requis' });
  }

  const trimmed = message.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const messageResult = await client.query(
      `SELECT *
       FROM customer_messages
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [id, req.user!.id]
    );

    if (messageResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const record = messageResult.rows[0];
    let ticketId: string | null = record.support_ticket_id;

    const customerProfileResult = await client.query(
      `SELECT first_name, last_name, email
       FROM users
       WHERE id = $1`,
      [req.user!.id]
    );

    const customerProfile = customerProfileResult.rows[0] || {};
    const customerEmail = customerProfile.email || null;
    const customerName =
      `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || null;

    if (!ticketId) {
      const ingestion = await ingestSupportMessage({
        channel: 'contact_form',
        messageId: record.id,
        message: trimmed,
        subject: record.subject,
        customerId: req.user!.id,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
        metadata: {
          customer_message_id: record.id,
        },
      });

      ticketId = ingestion.ticketId;
      await client.query(
        `UPDATE customer_messages
         SET support_ticket_id = $2,
             status = 'in_progress',
             last_response_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [record.id, ticketId]
      );
    }

    const supportMessageId = uuidv4();
    await client.query(
      `INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, channel, body, attachments, is_internal)
       VALUES ($1, $2, 'customer', $3, 'contact_form', $4, COALESCE($5::jsonb, '[]'::jsonb), false)`,
      [
        supportMessageId,
        ticketId,
        req.user!.id,
        trimmed,
        attachments ? JSON.stringify(attachments) : null,
      ]
    );

    const snippet = trimmed.slice(0, 280);

    await client.query(
      `UPDATE support_tickets
       SET last_message_at = NOW(),
           last_message_from = 'customer',
           updated_at = NOW(),
           status = CASE WHEN status IN ('resolved', 'closed') THEN 'open' ELSE status END,
           summary = CASE WHEN summary IS NULL OR summary = '' THEN $2 ELSE summary END
       WHERE id = $1`,
      [ticketId, snippet]
    );

    await client.query(
      `UPDATE customer_messages
       SET unread = false,
           status = CASE WHEN status IN ('resolved', 'closed') THEN 'in_progress' ELSE status END,
           last_response_at = NOW(),
           updated_at = NOW(),
           last_viewed_at = NOW()
       WHERE id = $1`,
      [record.id]
    );

    await client.query('COMMIT');

    emitSupportEvent({
      type: 'ticket_message',
      ticketId,
      payload: { sender: 'customer' },
    });

    const conversation = await fetchConversationDetail(id, req.user!.id);
    return res.status(201).json(conversation);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Customer reply error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;

