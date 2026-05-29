import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../db/connection';

// Rate limiting: sliding window (60s) per api_key_id
interface RateLimitEntry {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export interface ApiKeyInfo {
  id: string;
  partner_name: string;
  scopes: string[];
  rate_limit_per_min: number;
}

export interface ApiKeyRequest extends Request {
  apiKey?: ApiKeyInfo;
}

export const apiKeyAuth = async (
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Clé API invalide ou révoquée' });
      return;
    }

    const token = authHeader.slice(7);
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT id, partner_name, scopes, rate_limit_per_min
       FROM api_keys
       WHERE key_hash = $1 AND is_active = true`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Clé API invalide ou révoquée' });
      return;
    }

    const keyRow = result.rows[0];
    const apiKeyId: string = keyRow.id;
    const rateLimitPerMin: number = keyRow.rate_limit_per_min || 60;

    // Rate limiting — sliding window
    const now = Date.now();
    const windowMs = 60 * 1000;
    let entry = rateLimitMap.get(apiKeyId);
    if (!entry) {
      entry = { timestamps: [] };
      rateLimitMap.set(apiKeyId, entry);
    }
    // Purge timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

    if (entry.timestamps.length >= rateLimitPerMin) {
      const oldestTs = entry.timestamps[0];
      const retryAfterMs = windowMs - (now - oldestTs);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Trop de requêtes. Réessayez dans quelques secondes.',
        retry_after: retryAfterSec,
      });
      return;
    }

    entry.timestamps.push(now);

    // Attach apiKey info to request
    req.apiKey = {
      id: apiKeyId,
      partner_name: keyRow.partner_name,
      scopes: Array.isArray(keyRow.scopes) ? keyRow.scopes : [],
      rate_limit_per_min: rateLimitPerMin,
    };

    // Fire-and-forget: update last_used_at
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [apiKeyId]).catch(() => {});

    // Fire-and-forget: log usage
    pool
      .query(
        `INSERT INTO api_usage_logs (api_key_id, method, path, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          apiKeyId,
          req.method,
          req.originalUrl,
          req.ip,
          req.headers['user-agent'] || null,
        ]
      )
      .catch(() => {});

    next();
  } catch (error: any) {
    console.error('[API KEY AUTH] Error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const requireScope = (scope: string) => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({ error: 'Clé API invalide ou révoquée' });
      return;
    }
    if (!req.apiKey.scopes.includes(scope)) {
      res.status(403).json({
        error: `Permission insuffisante. Scope requis : ${scope}`,
        required_scope: scope,
      });
      return;
    }
    next();
  };
};
