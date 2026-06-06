export const PAYMENT_FALLBACK_EMAIL = 'paiement@colisdirect.com';

const PAYSTACK_EMAIL_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

const BLOCKED_EMAIL_DOMAINS = /\.(test|local|invalid|example|localhost)$/i;

export function isPaystackCompatibleEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  if (!PAYSTACK_EMAIL_RE.test(trimmed)) return false;
  if (BLOCKED_EMAIL_DOMAINS.test(trimmed)) return false;
  return true;
}

export function sanitizeOptionalEmail(email: unknown): string | null {
  if (email == null || email === '') return null;
  const trimmed = String(email).trim();
  if (!trimmed) return null;
  return isPaystackCompatibleEmail(trimmed) ? trimmed : null;
}

export function resolvePaymentEmail(email?: string | null): string {
  if (email && isPaystackCompatibleEmail(email)) {
    return email.trim().toLowerCase();
  }
  return PAYMENT_FALLBACK_EMAIL;
}
