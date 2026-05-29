import {
  DEFAULT_PHONE_ISO,
  PHONE_COUNTRIES,
  getCountryByIso,
  dialPlusToIso,
} from '../lib/phoneCountries';

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Affiche les chiffres groupés 2 par 2 (ex. 0712345678 → 07 12 34 56 78). */
export function formatPhoneDigitPairs(digits: string): string {
  if (!digits) return '';
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.slice(i, i + 2));
  }
  return parts.join(' ');
}

/** Affichage lisible type +225 07 12 34 56 78 (espaces) à partir du stockage compact +22507… */
export function formatCiStorageForDisplay(compact: string): string {
  const d = digitsOnly(compact);
  if (!d.startsWith('225') || d.length < 6) return compact.trim();
  const nat = d.slice(3, 13);
  return `+225 ${formatPhoneDigitPairs(nat)}`.trim();
}

function normalizeCiNationalFromDigits(d: string): string {
  if (!d) return '';
  if (d.startsWith('225')) return d.slice(3).slice(0, 10);
  if (d.startsWith('0')) return d.slice(0, 10);
  if (d.length === 9) return `0${d}`;
  return d.slice(0, 10);
}

/** Parse une valeur déjà stockée (compact ou legacy) → pays + chiffres nationaux bruts (sans espaces). */
export function parsePhoneValueForInput(
  stored: string | undefined,
  opts?: { dialPlus?: string }
): { iso: string; nationalDigits: string } {
  if (!stored?.trim()) {
    const hint = opts?.dialPlus ? dialPlusToIso(opts.dialPlus) : undefined;
    return { iso: hint || DEFAULT_PHONE_ISO, nationalDigits: '' };
  }

  let d = digitsOnly(stored);
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

  for (const c of sorted) {
    if (d.startsWith(c.dial)) {
      const national = d.slice(c.dial.length).slice(0, c.nationalMaxDigits);
      return { iso: c.iso, nationalDigits: national };
    }
  }

  const hintIso = opts?.dialPlus ? dialPlusToIso(opts.dialPlus) : undefined;
  if (hintIso === 'ci' || (!hintIso && DEFAULT_PHONE_ISO === 'ci')) {
    const iso = hintIso || DEFAULT_PHONE_ISO;
    if (iso === 'ci') {
      return { iso: 'ci', nationalDigits: normalizeCiNationalFromDigits(d) };
    }
  }

  if (hintIso) {
    const c = getCountryByIso(hintIso);
    if (c) return { iso: hintIso, nationalDigits: d.slice(0, c.nationalMaxDigits) };
  }

  return {
    iso: DEFAULT_PHONE_ISO,
    nationalDigits: d.slice(0, getCountryByIso(DEFAULT_PHONE_ISO)!.nationalMaxDigits),
  };
}

/**
 * Stockage compact sans espaces.
 * CI : +225 puis 10 chiffres nationaux avec 0 (ex. +2250712345678).
 * Autres : +indicatif + national
 */
export function phoneNationalToStorage(iso: string, nationalDigits: string): string {
  const c = getCountryByIso(iso);
  if (!c) return nationalDigits;
  const raw = digitsOnly(nationalDigits).slice(0, c.nationalMaxDigits);
  if (!raw) return '';

  if (iso === 'ci') {
    let nat = raw;
    // Troncature 0 : uniquement si le numéro ressemble à un mobile sans 0 initial (7/5/1…).
    // Ne pas inclure 0 dans la classe : sinon « 0 », « 07 », « 071… » deviennent « 00 », « 007… » (double affichage à la saisie).
    if (nat.length <= 9 && nat.length >= 1 && /^[157]/.test(nat)) nat = `0${nat}`.slice(0, 10);
    if (nat.length === 10 && !nat.startsWith('0')) nat = `0${nat.slice(0, 9)}`;
    return `+225${nat}`;
  }
  return `+${c.dial}${raw}`;
}

export function getPlaceholderForCountry(iso: string): string {
  if (iso === 'ci') return '07 12 34 56 78';
  const c = getCountryByIso(iso);
  return c ? `Numéro (${c.name})` : 'Numéro';
}

/** Pour les recherches API : retire espaces, +225 / 225, puis 0 initial du national. */
export function normalizePhoneForApiSearch(stored: string): string {
  let s = digitsOnly(stored);
  if (s.startsWith('225')) s = s.slice(3);
  if (s.startsWith('0')) s = s.slice(1);
  return s;
}

export function sortedCountries() {
  return [...PHONE_COUNTRIES];
}
