import express from 'express';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { emitSupportEvent, supportEvents } from '../events/supportEvents';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import emailService from '../services/emailService';

const router = express.Router();

const SUPPORT_ROLES: Array<'support' | 'support_supervisor' | 'admin'> = ['support', 'support_supervisor', 'admin'];

const ensureSupportRole = (req: AuthRequest, res: Response, next: express.NextFunction) => {
  if (!req.user || !SUPPORT_ROLES.includes(req.user.role as any)) {
    return res.status(403).json({ error: 'Accès support requis' });
  }
  next();
};

const attachTokenFromQuery = (req: Request, _res: Response, next: express.NextFunction) => {
  if (!req.headers.authorization) {
    const queryToken = Array.isArray(req.query.token)
      ? req.query.token[0]
      : typeof req.query.token === 'string'
        ? req.query.token
        : undefined;
    if (queryToken) {
      (req.headers as any).authorization = `Bearer ${queryToken}`;
    }
  }
  next();
};

const sanitizeLimit = (value: any, fallback = 50) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 200);
};

router.get('/events', attachTokenFromQuery, authenticate, ensureSupportRole, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders?.();

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(':keep-alive\n\n');
      }
    } catch (error) {
      clearInterval(heartbeat);
      supportEvents.removeListener('event', handler);
    }
  }, 25000);

  const handler = (event: any) => {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      console.error('SSE write error:', error);
      clearInterval(heartbeat);
      supportEvents.removeListener('event', handler);
    }
  };

  supportEvents.on('event', handler);

  const cleanup = () => {
    clearInterval(heartbeat);
    supportEvents.removeListener('event', handler);
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('close', cleanup);
  
  // Handle errors
  res.on('error', (error) => {
    console.error('SSE response error:', error);
    cleanup();
  });
});

router.get('/dashboard', authenticate, ensureSupportRole, async (_req: AuthRequest, res: Response) => {
  try {
    const statsQuery = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'open') AS open_count,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
         COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
         COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_count,
         COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(first_agent_reply_at, NOW()) - created_at)) / 60), 0) AS avg_response_minutes
       FROM support_tickets`
    );

    const volumeByChannel = await pool.query(
      `SELECT channel, COUNT(*)::int AS count
       FROM support_tickets
       GROUP BY channel`
    );

    const escalated = await pool.query(
      `SELECT COUNT(*)::int AS escalated_count
       FROM support_tickets
       WHERE status = 'escalated'`
    );

    res.json({
      open: parseInt(statsQuery.rows[0].open_count, 10) || 0,
      pending: parseInt(statsQuery.rows[0].pending_count, 10) || 0,
      resolved: parseInt(statsQuery.rows[0].resolved_count, 10) || 0,
      closed: parseInt(statsQuery.rows[0].closed_count, 10) || 0,
      urgent: parseInt(statsQuery.rows[0].urgent_count, 10) || 0,
      avgResponseMinutes: Number(statsQuery.rows[0].avg_response_minutes) || 0,
      escalated: parseInt(escalated.rows[0].escalated_count, 10) || 0,
      channelVolume: volumeByChannel.rows,
    });
  } catch (error: any) {
    console.error('Support dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const { status, channel, priority, assigned, search, limit, offset } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`st.status = $${params.length + 1}`);
      params.push(status);
    }
    if (channel) {
      conditions.push(`st.channel = $${params.length + 1}`);
      params.push(channel);
    }
    if (priority) {
      conditions.push(`st.priority = $${params.length + 1}`);
      params.push(priority);
    }
    if (assigned === 'me') {
      conditions.push(`st.assigned_agent_id = $${params.length + 1}`);
      params.push(req.user!.id);
    } else if (assigned === 'unassigned') {
      conditions.push(`st.assigned_agent_id IS NULL`);
    }
    if (search) {
      conditions.push(`(
        st.customer_name ILIKE $${params.length + 1} OR
        st.customer_email ILIKE $${params.length + 1} OR
        st.customer_phone ILIKE $${params.length + 1} OR
        st.tracking_number ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitValue = sanitizeLimit(limit, 50);
    const offsetValue = sanitizeLimit(offset, 0);

    params.push(limitValue);
    params.push(offsetValue);

    const tickets = await pool.query(
      `SELECT st.*, 
              row_to_json(u.*) AS assigned_agent,
              row_to_json(s.*) AS shipment
       FROM support_tickets st
       LEFT JOIN users u ON st.assigned_agent_id = u.id
       LEFT JOIN shipments s ON st.shipment_id = s.id
       ${whereClause}
       ORDER BY st.last_message_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json(tickets.rows);
  } catch (error: any) {
    console.error('Support tickets error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets/:id', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;

    const ticketResult = await pool.query(
      `SELECT st.*, 
              row_to_json(u.*) AS assigned_agent,
              row_to_json(cust.*) AS customer_user,
              (
                COALESCE(row_to_json(ship.*), '{}'::json)::jsonb ||
                jsonb_build_object(
                  'origin_relay', CASE WHEN origin_relay.id IS NULL THEN NULL ELSE to_jsonb(origin_relay) END,
                  'destination_relay', CASE WHEN destination_relay.id IS NULL THEN NULL ELSE to_jsonb(destination_relay) END,
                  'transporter_profile', CASE WHEN transporter.id IS NULL THEN NULL ELSE to_jsonb(transporter) END,
                  'transporter_user', CASE WHEN transporter_user.id IS NULL THEN NULL ELSE to_jsonb(transporter_user) END
                )
              )::json AS shipment
       FROM support_tickets st
       LEFT JOIN users u ON st.assigned_agent_id = u.id
       LEFT JOIN users cust ON st.customer_id = cust.id
       LEFT JOIN shipments ship ON st.shipment_id = ship.id
       LEFT JOIN relay_points origin_relay ON ship.origin_relay_id = origin_relay.id
       LEFT JOIN relay_points destination_relay ON ship.destination_relay_id = destination_relay.id
       LEFT JOIN transporters transporter ON ship.transporter_id = transporter.id
       LEFT JOIN users transporter_user ON transporter.user_id = transporter_user.id
       WHERE st.id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket introuvable' });
    }

    const messages = await pool.query(
      `SELECT sm.*, row_to_json(u.*) AS sender_user
       FROM support_messages sm
       LEFT JOIN users u ON sm.sender_id = u.id
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC`,
      [ticketId]
    );

    const notes = await pool.query(
      `SELECT sn.*, row_to_json(u.*) AS author_user
       FROM support_notes sn
       LEFT JOIN users u ON sn.author_id = u.id
       WHERE sn.ticket_id = $1
       ORDER BY sn.created_at DESC`,
      [ticketId]
    );

    const reminders = await pool.query(
      `SELECT sr.*, row_to_json(u.*) AS created_by_user
       FROM support_reminders sr
       LEFT JOIN users u ON sr.created_by = u.id
       WHERE sr.ticket_id = $1
       ORDER BY sr.scheduled_for ASC`,
      [ticketId]
    );

    const events = await pool.query(
      `SELECT ste.*, row_to_json(u.*) AS created_by_user
       FROM support_ticket_events ste
       LEFT JOIN users u ON ste.created_by = u.id
       WHERE ste.ticket_id = $1
       ORDER BY ste.created_at DESC
       LIMIT 100`,
      [ticketId]
    );

    res.json({
      ticket: ticketResult.rows[0],
      messages: messages.rows,
      notes: notes.rows,
      reminders: reminders.rows,
      events: events.rows,
    });
  } catch (error: any) {
    console.error('Support ticket detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const {
      subject,
      message,
      channel = 'manual',
      customer,
      tracking_number,
      shipment_id,
      priority,
      topic,
    } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: 'Message obligatoire' });
    }

    const ticketId = uuidv4();
    const messageId = uuidv4();

    await pool.query('BEGIN');

    await pool.query(
      `INSERT INTO support_tickets (
        id, subject, summary, customer_name, customer_email, customer_phone,
        channel, priority, topic, tracking_number, shipment_id,
        assigned_agent_id, created_by, last_message_at, last_message_from, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),'agent',$14)` ,
      [
        ticketId,
        subject || null,
        message.slice(0, 280),
        customer?.name || null,
        customer?.email || null,
        customer?.phone || null,
        channel,
        priority || 'normal',
        topic || null,
        tracking_number || null,
        shipment_id || null,
        req.user!.id,
        req.user!.id,
        customer?.metadata ? JSON.stringify(customer.metadata) : null,
      ]
    );

    await pool.query(
      `INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, channel, body, is_internal)
       VALUES ($1, $2, 'agent', $3, $4, $5, false)`,
      [messageId, ticketId, req.user!.id, channel, message]
    );

    await pool.query('COMMIT');

    emitSupportEvent({ type: 'ticket_created', ticketId, payload: { assigned_agent_id: req.user!.id } });

    res.status(201).json({ ticket_id: ticketId });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/directory/transfers', authenticate, ensureSupportRole, async (_req: AuthRequest, res: Response) => {
  try {
    const [agentsResult, adminsResult, transportersResult, relaysResult] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, email, role
         FROM users
         WHERE role IN ('support', 'support_supervisor')
         ORDER BY first_name, last_name`
      ),
      pool.query(
        `SELECT id, first_name, last_name, email
         FROM users
         WHERE role = 'admin'
         ORDER BY first_name, last_name`
      ),
      pool.query(
        `SELECT t.id,
                u.first_name,
                u.last_name,
                u.email,
                t.vehicle_type,
                t.status
         FROM transporters t
         LEFT JOIN users u ON t.user_id = u.id
         ORDER BY u.first_name, u.last_name`
      ),
      pool.query(
        `SELECT id, name, commune, phone, email
         FROM relay_points
         ORDER BY name`
      ),
    ]);

    res.json({
      agents: agentsResult.rows,
      admins: adminsResult.rows,
      transporters: transportersResult.rows,
      relay_points: relaysResult.rows,
    });
  } catch (error: any) {
    console.error('Support directory error:', error);
    res.status(500).json({ error: error.message });
  }
});

const CUSTOMER_PORTAL_URL = process.env.CUSTOMER_PORTAL_URL || process.env.FRONTEND_URL || 'https://colisdirect.com';

router.post('/tickets/:id/reply', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { body, attachments, status } = req.body || {};

    if (!body) {
      return res.status(400).json({ error: 'Message requis' });
    }

    await pool.query('BEGIN');

    const messageId = uuidv4();
    await pool.query(
      `INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, channel, body, attachments, is_internal)
       SELECT $1, id, 'agent', $2, channel, $3, COALESCE($4::jsonb, '[]'::jsonb), false
       FROM support_tickets WHERE id = $5`,
      [messageId, req.user!.id, body, attachments ? JSON.stringify(attachments) : null, ticketId]
    );

    await pool.query(
      `UPDATE support_tickets
       SET last_message_at = NOW(),
           last_message_from = 'agent',
           updated_at = NOW(),
           assigned_agent_id = COALESCE(assigned_agent_id, $2),
           status = COALESCE($3::support_ticket_status, status),
           first_agent_reply_at = CASE WHEN first_agent_reply_at IS NULL THEN NOW() ELSE first_agent_reply_at END
       WHERE id = $1`,
      [ticketId, req.user!.id, status || null]
    );

    await pool.query('COMMIT');

    emitSupportEvent({ type: 'ticket_message', ticketId, payload: { sender: 'agent' } });

    const ticketInfoResult = await pool.query(
      `SELECT metadata, customer_email, customer_name, customer_id, subject
       FROM support_tickets
       WHERE id = $1`,
      [ticketId]
    );

    const ticketInfo = ticketInfoResult.rows[0];
    const metadata = ticketInfo?.metadata || {};
    const customerMessageId =
      (metadata && typeof metadata.customer_message_id === 'string'
        ? metadata.customer_message_id
        : metadata && metadata.customer_message_id
        ? String(metadata.customer_message_id)
        : null) || null;

    if (customerMessageId) {
      await pool.query(
        `UPDATE customer_messages
         SET unread = true,
             status = 'in_progress',
             admin_response = $2,
             responded_at = NOW(),
             last_response_at = NOW(),
             support_ticket_id = $3
         WHERE id = $1`,
        [customerMessageId, body, ticketId]
      );
    }

    if (ticketInfo?.customer_email) {
      const customerName = ticketInfo.customer_name || 'client';
      const safeBody = body.length > 400 ? `${body.slice(0, 400)}…` : body;
      const portalLink = `${CUSTOMER_PORTAL_URL.replace(/\/$/, '')}/#/messageries`;

      await emailService.sendEmail({
        to: ticketInfo.customer_email,
        subject: `Nouvelle réponse du support - ${ticketInfo.subject || 'COLISDIRECT'}`,
        html: `
          <p>Bonjour ${customerName},</p>
          <p>Notre équipe support vient de répondre à votre demande.</p>
          <blockquote style="border-left:4px solid #FF6C00;padding:12px 16px;background:#f9f9f9;margin:16px 0;">
            ${safeBody.replace(/\n/g, '<br/>')}
          </blockquote>
          <p>Consultez l'intégralité de la conversation depuis votre espace client&nbsp;:</p>
          <p><a href="${portalLink}" style="color:#FF6C00;font-weight:bold;">Accéder à mes messages</a></p>
          <p>Cordialement,<br/>L'équipe COLISDIRECT</p>
        `,
      });
    }

    res.status(201).json({ message_id: messageId });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Support reply error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/tickets/:id/status', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Statut requis' });
    }
    
    // Validate status value
    const validStatuses = ['open', 'pending', 'resolved', 'closed', 'escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}` });
    }
    
    const result = await pool.query(
      `UPDATE support_tickets
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [ticketId, status]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket introuvable' });
    }

    // Try to insert event, but don't fail if table doesn't exist
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'support_ticket_events'
        );
      `);
      
      if (tableCheck.rows[0]?.exists) {
        await pool.query(
          `INSERT INTO support_ticket_events (ticket_id, event_type, payload, created_by)
           VALUES ($1, 'status_change', jsonb_build_object('status', $2), $3)` ,
          [ticketId, status, req.user!.id]
        );
      }
    } catch (eventError: any) {
      console.warn('Failed to insert support_ticket_event (non-critical):', eventError.message);
    }

    try {
      emitSupportEvent({ type: 'ticket_status', ticketId, payload: { status } });
    } catch (eventError: any) {
      console.warn('Failed to emit support event (non-critical):', eventError.message);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Support status update error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour du statut' });
  }
});

router.post('/tickets/:id/notes', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { content } = req.body || {};
    if (!content) {
      return res.status(400).json({ error: 'Contenu requis' });
    }

    const noteId = uuidv4();
    await pool.query(
      `INSERT INTO support_notes (id, ticket_id, author_id, content)
       VALUES ($1, $2, $3, $4)` ,
      [noteId, ticketId, req.user!.id, content]
    );

    emitSupportEvent({ type: 'ticket_updated', ticketId, payload: { note_id: noteId } });

    res.status(201).json({ note_id: noteId });
  } catch (error: any) {
    console.error('Support note error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/reminders', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { scheduled_for, notes } = req.body || {};
    if (!scheduled_for) {
      return res.status(400).json({ error: 'Date planifiée requise' });
    }
    const reminderId = uuidv4();
    await pool.query(
      `INSERT INTO support_reminders (id, ticket_id, scheduled_for, created_by, notes)
       VALUES ($1, $2, $3, $4, $5)` ,
      [reminderId, ticketId, new Date(scheduled_for), req.user!.id, notes || null]
    );
    emitSupportEvent({ type: 'ticket_updated', ticketId, payload: { reminder_id: reminderId } });
    res.status(201).json({ reminder_id: reminderId });
  } catch (error: any) {
    console.error('Support reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/assign', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { target_type, target_id, note } = req.body || {};
    if (!target_type || !target_id) {
      return res.status(400).json({ error: 'Cible de transfert requise' });
    }

    const allowedTypes = ['agent', 'support', 'support_supervisor', 'admin', 'transporter', 'relay'];
    if (!allowedTypes.includes(target_type)) {
      return res.status(400).json({ error: 'Type de transfert invalide' });
    }

    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [ticketId];
    let paramIndex = 2;

    let statusValue: string | null = null;

    if (['agent', 'support', 'support_supervisor'].includes(target_type)) {
      updates.push(`assigned_agent_id = $${paramIndex}`);
      params.push(target_id);
      paramIndex += 1;
    }

    if (target_type === 'admin') {
      updates.push(`escalated_to_admin = TRUE`);
      statusValue = 'escalated';
    }

    if (target_type === 'transporter') {
      updates.push(`transporter_id = $${paramIndex}`);
      params.push(target_id);
      paramIndex += 1;
      statusValue = 'pending';
    }

    if (target_type === 'relay') {
      updates.push(`relay_point_id = $${paramIndex}`);
      params.push(target_id);
      paramIndex += 1;
      statusValue = 'pending';
    }

    if (statusValue) {
      updates.push(`status = $${paramIndex}`);
      params.push(statusValue);
      paramIndex += 1;
    }

    const updateQuery = `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket introuvable' });
    }

    await pool.query(
      `INSERT INTO support_ticket_events (ticket_id, event_type, payload, created_by)
       VALUES (
         $1,
         'transfer',
         jsonb_build_object(
           'target_type', $2::text,
           'target_id', $3::text,
           'note', CASE WHEN $4 IS NULL THEN NULL ELSE $4::text END
         ),
         $5
       )` ,
      [ticketId, target_type, target_id, note || null, req.user!.id]
    );

    emitSupportEvent({ type: 'ticket_assigned', ticketId, payload: { target_type, target_id } });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Support assign error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/mark-priority', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { urgent } = req.body || {};
    const result = await pool.query(
      `UPDATE support_tickets
       SET is_urgent = $2,
           priority = CASE WHEN $2 THEN 'urgent' ELSE priority END,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [ticketId, !!urgent]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket introuvable' });
    }
    emitSupportEvent({ type: 'ticket_updated', ticketId, payload: { urgent: !!urgent } });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Support priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:id/close', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id;
    const { resolution_note } = req.body || {};

    await pool.query('BEGIN');

    await pool.query(
      `UPDATE support_tickets
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    if (resolution_note) {
      await pool.query(
        `INSERT INTO support_notes (ticket_id, author_id, content)
         VALUES ($1, $2, $3)` ,
        [ticketId, req.user!.id, resolution_note]
      );
    }

    await pool.query(
      `INSERT INTO support_ticket_events (ticket_id, event_type, payload, created_by)
       VALUES ($1, 'closed', jsonb_build_object('note', $2), $3)` ,
      [ticketId, resolution_note || null, req.user!.id]
    );

    await pool.query('COMMIT');

    emitSupportEvent({ type: 'ticket_status', ticketId, payload: { status: 'closed' } });

    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error('Support close error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/shipments/search', authenticate, ensureSupportRole, async (req: AuthRequest, res: Response) => {
  try {
    const tracking = (req.query.tracking as string | undefined)?.trim();
    if (!tracking || tracking.length < 3) {
      return res.status(400).json({ error: 'Numéro de suivi requis (3 caractères minimum)' });
    }

    const result = await pool.query(
      `SELECT s.*,
              row_to_json(origin_relay.*) AS origin_relay,
              row_to_json(destination_relay.*) AS destination_relay,
              row_to_json(transporter.*) AS transporter_profile,
              row_to_json(transporter_user.*) AS transporter_user
       FROM shipments s
       LEFT JOIN relay_points origin_relay ON s.origin_relay_id = origin_relay.id
       LEFT JOIN relay_points destination_relay ON s.destination_relay_id = destination_relay.id
       LEFT JOIN transporters transporter ON s.transporter_id = transporter.id
       LEFT JOIN users transporter_user ON transporter.user_id = transporter_user.id
       WHERE s.tracking_number ILIKE $1
       AND s.current_status IS NOT NULL
       ORDER BY CASE WHEN LOWER(s.tracking_number) = LOWER($2) THEN 0 ELSE 1 END
       LIMIT 1`,
      [`%${tracking}%`, tracking]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Colis introuvable pour ce numéro de suivi.' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Support shipment search error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

