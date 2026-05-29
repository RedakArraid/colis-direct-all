import { useEffect, useState } from 'react';
import { CI_REGIONS_DATA, isKnownCommune } from '../utils/ciLocations';

interface CommuneSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
  placeholder?: string;
}

// Derive the select dropdown value from the prop value
function getSelectValue(value: string): string {
  if (!value) return '';
  if (isKnownCommune(value)) return value;
  return '__autre__';
}

export default function CommuneSelect({
  value,
  onChange,
  required,
  disabled,
  className,
  name,
  id,
  placeholder = 'Sélectionner une commune / ville',
}: CommuneSelectProps) {
  const [customText, setCustomText] = useState(() =>
    value && !isKnownCommune(value) ? value : ''
  );

  const selectValue = getSelectValue(value);
  const isOther = selectValue === '__autre__';

  // Sync customText when the controlled value changes externally
  useEffect(() => {
    if (value && !isKnownCommune(value)) {
      setCustomText(value);
    } else {
      setCustomText('');
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__autre__') {
      onChange(customText);
    } else {
      setCustomText('');
      onChange(v);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCustomText(v);
    onChange(v);
  };

  const baseSelectClass =
    'w-full px-4 py-2 border border-[#E6E6E6] rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent';

  return (
    <div className="space-y-2">
      <select
        name={name}
        id={id}
        value={selectValue}
        onChange={handleSelectChange}
        required={required && !isOther}
        disabled={disabled}
        className={className ?? baseSelectClass}
      >
        <option value="">{placeholder}</option>

        {CI_REGIONS_DATA.map(r => (
          <optgroup key={`${r.district}-${r.region}`} label={`${r.district} — ${r.region}`}>
            {r.communes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
        ))}

        <option value="__autre__">Autre (saisie libre)</option>
      </select>

      {isOther && (
        <input
          type="text"
          value={customText}
          onChange={handleTextChange}
          required={required}
          disabled={disabled}
          placeholder="Entrez votre commune / ville"
          className={className ?? baseSelectClass}
        />
      )}
    </div>
  );
}
