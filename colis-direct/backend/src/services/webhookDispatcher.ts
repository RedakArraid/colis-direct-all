import crypto from 'crypto';
import { pool } from '../db/connection';

const RETRY_DELAYS_MS = [30_000, 5 * 60_000, 30 * 60_000]; // 30s, 5min, 30min

async function attemptDelivery(
  deliveryId: string,
  webhookId: string,
  url: string,
  signingSecret: string,
  eventType: string,
  payload: object,
  attempt: number
): Promise<void> {
  const body = JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  const signature =
    'sha256=' +
    crypto.createHmac('sha256', signingSecret).update(body).digest('hex');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ColisDirecte-Event': eventType,
        'X-ColisDirecte-Signature': signature,
        'X-ColisDirecte-Delivery': deliveryId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Success
      await pool
        .query(
          `UPDATE api_webhook_deliveries
           SET status = 'delivered', delivered_at = NOW(), response_status = $1
           WHERE id = $2`,
          [response.status, deliveryId]
        )
        .catch(() => {});

      await pool
        .query(
          `UPDATE api_webhooks
           SET last_triggered_at = NOW(), failure_count = 0
           WHERE id = $1`,
          [webhookId]
        )
        .catch(() => {});
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    await pool
      .query(
        `UPDATE api_webhook_deliveries
         SET status = 'failed', error_message = $1, response_status = NULL
         WHERE id = $2`,
        [err.message || 'Unknown error', deliveryId]
      )
      .catch(() => {});

    // Increment failure_count and potentially disable webhook
    const updateResult = await pool
      .query(
        `UPDATE api_webhooks
         SET failure_count = COALESCE(failure_count, 0) + 1
         WHERE id = $1
         RETURNING failure_count`,
        [webhookId]
      )
      .catch(() => null);

    const failureCount: number = updateResult?.rows?.[0]?.failure_count ?? 0;
    if (failureCount >= 5) {
      await pool
        .query(`UPDATE api_webhooks SET is_active = false WHERE id = $1`, [webhookId])
        .catch(() => {});
    }

    // Schedule retry if attempts remain
    if (attempt < RETRY_DELAYS_MS.length) {
      scheduleWebhookRetry(deliveryId, RETRY_DELAYS_MS[attempt - 1], {
        webhookId,
        url,
        signingSecret,
        eventType,
        payload,
        attempt: attempt + 1,
      });
    }
  }
}

interface RetryContext {
  webhookId: string;
  url: string;
  signingSecret: string;
  eventType: string;
  payload: object;
  attempt: number;
}

export function scheduleWebhookRetry(
  deliveryId: string,
  delayMs: number,
  context?: RetryContext
): void {
  setTimeout(async () => {
    if (!context) return;
    await pool
      .query(
        `UPDATE api_webhook_deliveries SET status = 'pending' WHERE id = $1`,
        [deliveryId]
      )
      .catch(() => {});
    await attemptDelivery(
      deliveryId,
      context.webhookId,
      context.url,
      context.signingSecret,
      context.eventType,
      context.payload,
      context.attempt
    );
  }, delayMs);
}

export async function dispatchWebhooks(
  eventType: string,
  payload: object
): Promise<void> {
  try {
    const webhooksResult = await pool.query(
      `SELECT id, url, signing_secret, failure_count
       FROM api_webhooks
       WHERE is_active = true AND $1 = ANY(events)`,
      [eventType]
    );

    for (const webhook of webhooksResult.rows) {
      // Create delivery record (status=pending)
      let deliveryId: string;
      try {
        const deliveryInsert = await pool.query(
          `INSERT INTO api_webhook_deliveries (webhook_id, event_type, payload, status, created_at)
           VALUES ($1, $2, $3, 'pending', NOW())
           RETURNING id`,
          [webhook.id, eventType, JSON.stringify(payload)]
        );
        deliveryId = deliveryInsert.rows[0].id;
      } catch {
        continue; // Skip if delivery record creation fails
      }

      // Fire delivery asynchronously (no await at top level)
      attemptDelivery(
        deliveryId,
        webhook.id,
        webhook.url,
        webhook.signing_secret,
        eventType,
        payload,
        1
      ).catch(() => {});
    }
  } catch (error: any) {
    console.error('[WEBHOOK DISPATCHER] Error dispatching webhooks:', error);
  }
}
