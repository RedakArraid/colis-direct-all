export interface PhoneCountry {
  iso: string;
  name: string;
  /** indicatif sans + */
  dial: string;
  flag: string;
  /** nombre max de chiffres saisis côté « national » (trunk 0 inclus pour la CI) */
  nationalMaxDigits: number;
}

/** Liste courte — Côte d'Ivoire en tête (défaut). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  /** 10 chiffres nationaux avec 0 (ex. 0712345678) — stockés +2250712345678 */
  { iso: 'ci', name: "Côte d'Ivoire", dial: '225', flag: '🇨🇮', nationalMaxDigits: 10 },
  { iso: 'bf', name: 'Burkina Faso', dial: '226', flag: '🇧🇫', nationalMaxDigits: 11 },
  { iso: 'sn', name: 'Sénégal', dial: '221', flag: '🇸🇳', nationalMaxDigits: 12 },
  { iso: 'ml', name: 'Mali', dial: '223', flag: '🇲🇱', nationalMaxDigits: 11 },
  { iso: 'bj', name: 'Bénin', dial: '229', flag: '🇧🇯', nationalMaxDigits: 10 },
  { iso: 'tg', name: 'Togo', dial: '228', flag: '🇹🇬', nationalMaxDigits: 11 },
  { iso: 'ne', name: 'Niger', dial: '227', flag: '🇳🇪', nationalMaxDigits: 10 },
  { iso: 'gh', name: 'Ghana', dial: '233', flag: '🇬🇭', nationalMaxDigits: 10 },
  { iso: 'gn', name: 'Guinée', dial: '224', flag: '🇬🇳', nationalMaxDigits: 11 },
  { iso: 'fr', name: 'France', dial: '33', flag: '🇫🇷', nationalMaxDigits: 10 },
];

export const DEFAULT_PHONE_ISO = 'ci';

export function getCountryByIso(iso: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.iso === iso);
}

export function dialPlusToIso(dialPlus: string | undefined): string | undefined {
  if (!dialPlus?.trim()) return undefined;
  const d = dialPlus.replace(/\D/g, '');
  const c = PHONE_COUNTRIES.find((x) => x.dial === d);
  return c?.iso;
}
