#!/usr/bin/env node
/**
 * apply-staging-migrations.mjs
 * Applies pending SQL migrations to the staging database via the backend API.
 *
 * Usage:
 *   E2E_JWT_SECRET=ChangeThisJWTSecret123! node scripts/apply-staging-migrations.mjs
 *
 * This script:
 *  1. Generates a short-lived admin JWT
 *  2. Calls POST /api/admin/settings/run-migrations to trigger the migration runner
 *  3. Verifies the result
 */

import crypto from 'node:crypto';
import https from 'node:https';

const API_BASE = process.env.E2E_API_URL ?? 'https://staging-api.colisdirect.com/api';
const JWT_SECRET = process.env.E2E_JWT_SECRET ?? 'ChangeThisJWTSecret123!';

const ADMIN_ID = 'bffd19dd-783f-44d1-9a7c-723a450e47d2';
const ADMIN_EMAIL = 'e2e+admin@colisdirect.test';

function base64Url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJWT(id, email, role, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ id, email, role, iat: now, exp: now + 3600 }));
  const sig = base64Url(
    crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      ...options,
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('🔑 Generating admin JWT...');
  const token = makeJWT(ADMIN_ID, ADMIN_EMAIL, 'admin', JWT_SECRET);

  console.log('🚀 Triggering migrations via POST /api/admin/settings/run-migrations...');
  const { status, data } = await fetchJSON(`${API_BASE}/admin/settings/run-migrations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  console.log(`Status: ${status}`);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (status === 200 && data.success) {
    console.log('✅ Migrations applied successfully!');
  } else {
    console.error('❌ Migration failed:', data);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exitCode = 1;
});
