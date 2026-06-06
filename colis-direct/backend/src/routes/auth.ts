import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/connection';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { signupSchema, signinSchema, refreshTokenSchema } from '../schemas/authSchemas';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getClientIp(req: express.Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

async function issueTokenPair(
  user: { id: string; email: string; role: string },
  req: express.Request
): Promise<{ token: string; refresh_token: string }> {
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_ACCESS_EXPIRES_IN as unknown as number,
  });

  const refresh_token = crypto.randomBytes(48).toString('base64url');
  const refreshDays = parseInt(String(JWT_REFRESH_EXPIRES_IN).replace(/\D/g, ''), 10) || 30;
  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.id,
      hashToken(refresh_token),
      expiresAt,
      (req.headers['user-agent'] as string) || null,
      getClientIp(req),
    ]
  );

  return { token, refresh_token };
}

// In-memory rate limiter — counts only FAILED auth attempts per IP
// Max 10 failures per 5-minute window.
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const AUTH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const AUTH_MAX_ATTEMPTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10);

function isRateLimited(ip: string): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) return { blocked: false, retryAfterSec: 0 };
  if (entry.count >= AUTH_MAX_ATTEMPTS) {
    return { blocked: true, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { blocked: false, retryAfterSec: 0 };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

// Cleanup stale entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts.entries()) {
    if (now > entry.resetAt) authAttempts.delete(ip);
  }
}, 60 * 60 * 1000);

function authRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = getClientIp(req);
  const { blocked, retryAfterSec } = isRateLimited(ip);
  if (blocked) {
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans quelques instants.', retryAfterSec });
  }
  (req as any).__rateLimitIp = ip;
  next();
}

const SIGNUP_MIN_PASSWORD_LEN = 6;

// Sign up — rôle toujours « client » côté serveur (pas d’élévation via le body)
router.post('/signup', authRateLimit, validateBody(signupSchema), async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    const role = 'client';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < SIGNUP_MIN_PASSWORD_LEN) {
      return res.status(400).json({
        error: `Le mot de passe doit contenir au moins ${SIGNUP_MIN_PASSWORD_LEN} caractères`,
      });
    }

    const phoneTrim = phone != null && String(phone).trim() !== '' ? String(phone).trim() : '';

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    if (phoneTrim) {
      const phoneTaken = await pool.query(
        `SELECT id FROM users WHERE phone = $1 AND phone IS NOT NULL AND BTRIM(phone) <> ''`,
        [phoneTrim]
      );
      if (phoneTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, role, relay_point_id, is_pro`,
      [email, hashedPassword, first_name || '', last_name || '', phoneTrim, role]
    );

    const user = result.rows[0];
    const { token, refresh_token } = await issueTokenPair(user, req);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        relay_point_id: user.relay_point_id,
        is_pro: user.is_pro,
      },
      token,
      refresh_token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign in (with email OR phone)
router.post('/signin', authRateLimit, validateBody(signinSchema), async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    // Get user by email OR phone
    let result;
    if (email) {
      result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    } else {
      result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    }
    
    const ip = (req as any).__rateLimitIp || getClientIp(req);

    if (result.rows.length === 0) {
      console.warn(`Signin attempt failed: user not found - ${email || phone}`);
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Check if password_hash exists
    if (!user.password_hash) {
      console.warn(`Signin attempt failed: no password hash for user - ${email || phone}`);
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.warn(`Signin attempt failed: invalid password for user - ${email || phone}`);
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const { token, refresh_token } = await issueTokenPair(user, req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        relay_point_id: user.relay_point_id,
        is_pro: user.is_pro,
      },
      token,
      refresh_token,
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, relay_point_id, is_pro, 
              address, commune, quartier, ville, complement_adresse, country_code 
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rafraîchir le token d'accès
router.post('/refresh', validateBody(refreshTokenSchema), async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const tokenHash = hashToken(refresh_token);

    const row = await pool.query(
      `SELECT rt.id, rt.user_id, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (row.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré', code: 'REFRESH_INVALID' });
    }

    const { id: rtId, user_id, email, role } = row.rows[0];

    // Rotation : révoquer l'ancien refresh token
    await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [rtId]);

    const { token, refresh_token: newRefresh } = await issueTokenPair(
      { id: user_id, email, role },
      req
    );

    res.json({ token, refresh_token: newRefresh });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sign out — révoque les refresh tokens de l'utilisateur
router.post('/signout', authenticate, async (req: AuthRequest, res) => {
  try {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user!.id]
    );
    res.json({ message: 'Signed out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

