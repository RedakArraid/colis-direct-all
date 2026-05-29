import { useEffect, useId, useState } from 'react';
import { DEFAULT_PHONE_ISO, PHONE_COUNTRIES } from '../lib/phoneCountries';
import {
  formatPhoneDigitPairs,
  getPlaceholderForCountry,
  parsePhoneValueForInput,
  phoneNationalToStorage,
} from '../utils/phoneField';

export interface PhoneInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  /** ex. profil utilisateur `+225` — aide à interpréter les numéros sans indicatif */
  preferDialPlus?: string;
  onCountryMetaChange?: (meta: { iso: string; dial: string; dialPlus: string }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  label?: React.ReactNode;
  onNationalKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function PhoneInput({
  id: idProp,
  name,
  value,
  onChange,
  preferDialPlus,
  onCountryMetaChange,
  disabled,
  required,
  className = '',
  selectClassName = '',
  inputClassName = '',
  label,
  onNationalKeyDown,
}: PhoneInputProps) {
  const reactId = useId();
  const baseId = idProp ?? `phone-input-${reactId}`;
  const [countryIso, setCountryIso] = useState(DEFAULT_PHONE_ISO);
  const [nationalDigits, setNationalDigits] = useState('');

  useEffect(() => {
    const p = parsePhoneValueForInput(value || '', { dialPlus: preferDialPlus });
    setCountryIso(p.iso);
    setNationalDigits(p.nationalDigits);
  }, [value, preferDialPlus]);

  const country = PHONE_COUNTRIES.find((c) => c.iso === countryIso) ?? PHONE_COUNTRIES[0];
  const maxLen = country.nationalMaxDigits;
  const display = formatPhoneDigitPairs(nationalDigits);
  const placeholder = getPlaceholderForCountry(countryIso);

  const handleNationalInput = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (countryIso === 'ci' && digits.startsWith('225')) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, maxLen);
    setNationalDigits(digits);
    onChange(phoneNationalToStorage(countryIso, digits));
  };

  const handleCountryChange = (iso: string) => {
    setCountryIso(iso);
    setNationalDigits('');
    onChange('');
    const c = PHONE_COUNTRIES.find((x) => x.iso === iso);
    if (c && onCountryMetaChange) {
      onCountryMetaChange({ iso: c.iso, dial: c.dial, dialPlus: `+${c.dial}` });
    }
  };

  return (
    <div className={className}>
      {label != null && (
        <label htmlFor={baseId} className="block text-sm font-medium text-[#3A3A3A] mb-1">
          {label}
        </label>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          id={`${baseId}-country`}
          value={countryIso}
          disabled={disabled}
          onChange={(e) => handleCountryChange(e.target.value)}
          className={`shrink-0 sm:w-[min(100%,13rem)] px-3 py-2 border border-[#E6E6E6] rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent ${selectClassName}`}
          aria-label="Indicatif pays"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        {/* L’indicatif (+225, etc.) est visible uniquement dans le sélecteur pays — pas de second préfixe pour éviter +225 en double pour la CI */}
        <input
          id={baseId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="done"
          disabled={disabled}
          required={required}
          value={display}
          placeholder={placeholder}
          onChange={(e) => handleNationalInput(e.target.value)}
          onKeyDown={(e) => {
            onNationalKeyDown?.(e);
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (allowed.includes(e.key)) return;
            if (e.key.length === 1 && !/\d/.test(e.key)) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            handleNationalInput(text);
          }}
          className={`flex-1 min-w-0 px-3 py-2 border border-[#E6E6E6] rounded-lg font-mono text-sm tracking-wide focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent ${inputClassName}`}
        />
      </div>
    </div>
  );
}
