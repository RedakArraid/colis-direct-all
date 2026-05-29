export type ClientProSpace = 'client' | 'pro';

/** Champs minimum pour décider du double accès client/pro */
export type UserSpaceRole = {
  role: string;
  is_pro?: boolean;
};

export const ACTIVE_SPACE_STORAGE_KEY = 'colisdirect:active-space';

/**
 * Accès aux deux espaces (client + pro) : choix après connexion.
 * Admin, support, relais, transporteurs exclus.
 */
export function userHasDualClientProAccess(user: UserSpaceRole | null): boolean {
  if (!user) return false;
  const r = user.role;
  if (['admin', 'support', 'relay_partner', 'transporter'].includes(r)) return false;
  if (r === 'pro') return true;
  if (r === 'client' && user.is_pro) return true;
  return false;
}

export function readStoredActiveSpace(): ClientProSpace | null {
  if (typeof window === 'undefined') return null;
  const v = sessionStorage.getItem(ACTIVE_SPACE_STORAGE_KEY);
  if (v === 'client' || v === 'pro') return v;
  return null;
}

export function writeStoredActiveSpace(space: ClientProSpace): void {
  sessionStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, space);
}

export function clearStoredActiveSpace(): void {
  sessionStorage.removeItem(ACTIVE_SPACE_STORAGE_KEY);
}
