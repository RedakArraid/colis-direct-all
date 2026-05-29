import { pool } from '../db/connection';
import { emitSupportEvent } from '../events/supportEvents';
import { v4 as uuidv4 } from 'uuid';

type SupportChannel = 'chatbot' | 'contact_form' | 'email';

const OPEN_TICKET_STATUSES = ['open', 'pending', 'escalated'] as const;

interface SupportIngestionInput {
  channel: SupportChannel;
  messageId: string;
  message: string;
  subject?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  priority?: 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  trackingNumber?: string | null;
}

interface SupportIngestionResult {
  ticketId: string;
  supportMessageId: string;
  isNewTicket: boolean;
}

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D+/g, '');
  return digits.length ? digits : null;
};

const extractTrackingCandidates = (text: string) => {
  if (!text) return [];
  const matches = text
    .toUpperCase()
    .match(/\b[A-Z0-9]{8,20}\b/g);
  if (!matches) return [];
  const uniques = Array.from(new Set(matches));
  return uniques.filter((candidate) => /\d/.test(candidate));
};

const resolveCustomerProfile = async (customerId?: string | null) => {
  if (!customerId) return null;
  const { rows } = await pool.query(
    'SELECT id, first_name, last_name, email, phone FROM users WHERE id = $1 LIMIT 1',
    [customerId]
  );
  return rows[0] || null;
};

const resolveShipmentFromCandidates = async (candidates: string[]): Promise<{ trackingNumber: string; shipmentId: string } | null> => {
  for (const candidate of candidates) {
    const { rows } = await pool.query('SELECT id, tracking_number FROM shipments WHERE tracking_number = $1 LIMIT 1', [candidate]);
    if (rows.length > 0) {
      return { trackingNumber: rows[0].tracking_number, shipmentId: rows[0].id };
    }
  }
  return null;
};

export async function ingestSupportMessage(input: SupportIngestionInput): Promise<SupportIngestionResult> {
  const rawBody = (input.message || '').trim();
  if (!rawBody) {
    throw new Error('Message contenu vide pour le ticket support');
  }

  const summarySnippet = rawBody.slice(0, 280);
  const messageMetadata = input.metadata || {};
  const normalizedEmail = input.customerEmail?.trim().toLowerCase() || null;
  const normalizedPhone = normalizePhone(input.customerPhone);

  const customerProfile = await resolveCustomerProfile(input.customerId);
  const customerName =
    input.customerName ||
    [customerProfile?.first_name, customerProfile?.last_name].filter(Boolean).join(' ').trim() ||
    null;

  const customerEmail = normalizedEmail || customerProfile?.email?.toLowerCase() || null;
  const customerPhone = normalizedPhone || normalizePhone(customerProfile?.phone) || null;

  let trackingNumber = input.trackingNumber || null;
  let shipmentId: string | null = null;

  if (!trackingNumber) {
    const trackingCandidates = extractTrackingCandidates(rawBody);
    const match = await resolveShipmentFromCandidates(trackingCandidates);
    if (match) {
      trackingNumber = match.trackingNumber;
      shipmentId = match.shipmentId;
    }
  } else {
    const { rows } = await pool.query('SELECT id FROM shipments WHERE tracking_number = $1 LIMIT 1', [trackingNumber]);
    if (rows.length > 0) {
      shipmentId = rows[0].id;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conditions: string[] = [];
    const params: any[] = [input.channel, OPEN_TICKET_STATUSES];
    let paramIndex = 3;

    if (input.customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      params.push(input.customerId);
      paramIndex += 1;
    }
    if (customerEmail) {
      conditions.push(`LOWER(customer_email) = $${paramIndex}`);
      params.push(customerEmail);
      paramIndex += 1;
    }
    if (customerPhone) {
      conditions.push(`regexp_replace(COALESCE(customer_phone, ''), '\\D', '', 'g') = $${paramIndex}`);
      params.push(customerPhone);
      paramIndex += 1;
    }
    if (trackingNumber) {
      conditions.push(`tracking_number = $${paramIndex}`);
      params.push(trackingNumber);
      paramIndex += 1;
    }

    let existingTicketId: string | null = null;
    if (conditions.length > 0) {
      const { rows } = await client.query(
        `SELECT id
         FROM support_tickets
         WHERE channel = $1
           AND status = ANY($2::support_ticket_status[])
           AND (${conditions.join(' OR ')})
         ORDER BY last_message_at DESC
         LIMIT 1`,
        params
      );
      if (rows.length > 0) {
        existingTicketId = rows[0].id;
      }
    }

    const supportMessageId = uuidv4();
    const metadataJson = JSON.stringify({
      ...messageMetadata,
      source_channel: input.channel,
    });

    if (existingTicketId) {
      await client.query(
        `INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, channel, body, attachments, is_internal)
         VALUES ($1, $2, 'customer', $3, $4, $5, $6, false)`,
        [
          supportMessageId,
          existingTicketId,
          input.customerId || null,
          input.channel,
          rawBody,
          '[]',
        ]
      );

      await client.query(
        `UPDATE support_tickets
         SET last_message_at = NOW(),
             last_message_from = 'customer',
             summary = COALESCE(NULLIF(summary, ''), $2),
             tracking_number = CASE WHEN tracking_number IS NULL AND $3 IS NOT NULL THEN $3 ELSE tracking_number END,
             shipment_id = CASE WHEN shipment_id IS NULL AND $4 IS NOT NULL THEN $4 ELSE shipment_id END,
             customer_email = CASE WHEN customer_email IS NULL AND $5 IS NOT NULL THEN $5 ELSE customer_email END,
             customer_phone = CASE WHEN customer_phone IS NULL AND $6 IS NOT NULL THEN $6 ELSE customer_phone END,
             customer_name = CASE WHEN customer_name IS NULL AND $7 IS NOT NULL THEN $7 ELSE customer_name END,
             metadata = metadata || $8::jsonb
         WHERE id = $1`,
        [
          existingTicketId,
          summarySnippet,
          trackingNumber,
          shipmentId,
          customerEmail,
          customerPhone,
          customerName,
          metadataJson,
        ]
      );

      await client.query('COMMIT');
      emitSupportEvent({
        type: 'ticket_message',
        ticketId: existingTicketId,
        payload: { sender: 'customer', channel: input.channel },
      });

      return { ticketId: existingTicketId, supportMessageId, isNewTicket: false };
    }

    const ticketId = uuidv4();

    const computedSubject =
      input.subject ||
      [
        input.channel === 'chatbot' ? 'Chatbot' : input.channel === 'contact_form' ? 'Formulaire' : 'Email',
        customerName ? `- ${customerName}` : '',
      ]
        .join(' ')
        .trim() || 'Demande support';

    await client.query(
      `INSERT INTO support_tickets (
        id, subject, summary, customer_name, customer_email, customer_phone,
        customer_id, channel, status, priority, tracking_number, shipment_id,
        created_by, last_message_at, last_message_from, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, 'open', $9, $10, $11,
        NULL, NOW(), 'customer', $12
      )`,
      [
        ticketId,
        computedSubject,
        summarySnippet,
        customerName,
        customerEmail,
        customerPhone,
        input.customerId || null,
        input.channel,
        input.priority || 'normal',
        trackingNumber,
        shipmentId,
        metadataJson,
      ]
    );

    await client.query(
      `INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, channel, body, attachments, is_internal)
       VALUES ($1, $2, 'customer', $3, $4, $5, '[]', false)`,
      [
        supportMessageId,
        ticketId,
        input.customerId || null,
        input.channel,
        rawBody,
      ]
    );

    await client.query('COMMIT');
    emitSupportEvent({
      type: 'ticket_created',
      ticketId,
      payload: { channel: input.channel },
    });

    return { ticketId, supportMessageId, isNewTicket: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

