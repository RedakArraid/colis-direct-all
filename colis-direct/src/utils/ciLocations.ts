export interface CICommune {
  name: string;
  region: string;
  district: string;
  isAbidjan?: boolean;
}

// Legacy interface kept for backward compatibility
export interface CICity {
  name: string;
  region: string;
  isAbidjan: boolean;
}

// All communes/villes of Côte d'Ivoire, grouped by district → region
// "Autre" is handled separately in CommuneSelect (free-text option)
export const CI_REGIONS_DATA: { district: string; region: string; communes: string[] }[] = [
  // ── District Autonome d'Abidjan ──────────────────────────────────────────
  {
    district: 'Abidjan',
    region: 'Abidjan',
    communes: [
      'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville',
      'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët',
      'Songon', 'Treichville', 'Yopougon',
    ],
  },

  // ── District Autonome de Yamoussoukro ────────────────────────────────────
  {
    district: 'Yamoussoukro',
    region: 'Yamoussoukro',
    communes: ['Yamoussoukro', 'Attiégouakro', 'Kossou'],
  },

  // ── District du Bas-Sassandra ────────────────────────────────────────────
  {
    district: 'Bas-Sassandra',
    region: 'Gbôklé',
    communes: ['Fresco', 'Gueyo', 'Sassandra'],
  },
  {
    district: 'Bas-Sassandra',
    region: 'Nawa',
    communes: ['Buyo', 'Grabo', 'Méagui', 'Soubré'],
  },
  {
    district: 'Bas-Sassandra',
    region: 'San-Pédro',
    communes: ['Gabiadji', 'Grand-Béréby', 'Monogaga', 'San-Pédro', 'Tabou'],
  },

  // ── District de la Comoé ─────────────────────────────────────────────────
  {
    district: 'Comoé',
    region: 'Indénié-Djuablin',
    communes: ['Abengourou', 'Agnibilékrou', 'Bettié', 'Niablé', 'Zaranou'],
  },
  {
    district: 'Comoé',
    region: 'Sud-Comoé',
    communes: ['Aboisso', 'Adiaké', 'Ayamé', 'Grand-Bassam', 'Maféré', 'Noé', 'Tiapoum'],
  },

  // ── District du Denguélé ─────────────────────────────────────────────────
  {
    district: 'Denguélé',
    region: 'Folon',
    communes: ['Kaniasso', 'Madinani', 'Minignan'],
  },
  {
    district: 'Denguélé',
    region: 'Kabadougou',
    communes: ['Gbéléban', 'Odienné', 'Samatiguila', 'Séguélon'],
  },

  // ── District de Gôh-Djiboua ──────────────────────────────────────────────
  {
    district: 'Gôh-Djiboua',
    region: 'Gôh',
    communes: ['Gagnoa', 'Guiberoua', 'Ouragahio', 'Oumé'],
  },
  {
    district: 'Gôh-Djiboua',
    region: 'Lôh-Djiboua',
    communes: ['Divo', 'Guitry', 'Hiré', 'Lakota'],
  },

  // ── District des Lacs ────────────────────────────────────────────────────
  {
    district: 'Lacs',
    region: 'Bélier',
    communes: ['Didiévi', 'Djékanou', 'Tiébissou', 'Toumodi'],
  },
  {
    district: 'Lacs',
    region: 'Iffou',
    communes: ['Daoukro', 'M\'batto', 'Prikro'],
  },
  {
    district: 'Lacs',
    region: 'Moronou',
    communes: ['Arrah', 'Bongouanou', 'Ouellé'],
  },
  {
    district: 'Lacs',
    region: 'N\'Zi',
    communes: ['Bocanda', 'Dimbokro', 'Kouassi-Kouassikro', 'Langbonou'],
  },

  // ── District des Lagunes ─────────────────────────────────────────────────
  {
    district: 'Lagunes',
    region: 'Agnéby-Tiassa',
    communes: ['Agboville', 'Azaguié', 'Cechi', 'Rubino', 'Sikensi', 'Taabo', 'Tiassalé'],
  },
  {
    district: 'Lagunes',
    region: 'Grands Ponts',
    communes: ['Dabou', 'Grand-Lahou', 'Jacqueville', 'Lopou'],
  },
  {
    district: 'Lagunes',
    region: 'La Mé',
    communes: ['Adzopé', 'Akoupé', 'Alépé', 'Angovia', 'Yakassé-Attobrou'],
  },

  // ── District des Montagnes ───────────────────────────────────────────────
  {
    district: 'Montagnes',
    region: 'Cavally',
    communes: ['Blolequin', 'Facobly', 'Guiglo', 'Taï'],
  },
  {
    district: 'Montagnes',
    region: 'Guémon',
    communes: ['Bangolo', 'Duékoué', 'Kouibly'],
  },
  {
    district: 'Montagnes',
    region: 'Tonkpi',
    communes: ['Biankouma', 'Danané', 'Man', 'Sipilou', 'Toulépleu', 'Zouan-Hounien'],
  },

  // ── District de la Sassandra-Marahoué ────────────────────────────────────
  {
    district: 'Sassandra-Marahoué',
    region: 'Bafing',
    communes: ['Booko', 'Koonan', 'Ouaninou', 'Touba'],
  },
  {
    district: 'Sassandra-Marahoué',
    region: 'Haut-Sassandra',
    communes: ['Daloa', 'Issia', 'Vavoua', 'Zoukougbeu'],
  },
  {
    district: 'Sassandra-Marahoué',
    region: 'Marahoué',
    communes: ['Bonon', 'Bouaflé', 'Kounahiri', 'Zuenoula'],
  },

  // ── District des Savanes ─────────────────────────────────────────────────
  {
    district: 'Savanes',
    region: 'Bagoué',
    communes: ['Boundiali', 'Gbon', 'Kouto', 'Tienie', 'Tingrela'],
  },
  {
    district: 'Savanes',
    region: 'Poro',
    communes: ['Dikodougou', 'Kombolokoura', 'Korhogo', 'M\'bengué', 'Sinématiali'],
  },
  {
    district: 'Savanes',
    region: 'Tchologo',
    communes: ['Ferkessédougou', 'Kong', 'Niellé', 'Ouangolodougou'],
  },

  // ── District de la Vallée du Bandama ─────────────────────────────────────
  {
    district: 'Vallée du Bandama',
    region: 'Gbêkê',
    communes: ['Béoumi', 'Botro', 'Bouaké', 'Brobo', 'Sakassou'],
  },
  {
    district: 'Vallée du Bandama',
    region: 'Hambol',
    communes: ['Dabakala', 'Katiola', 'Niakara', 'Niakaramadougou'],
  },

  // ── District du Woroba ───────────────────────────────────────────────────
  {
    district: 'Woroba',
    region: 'Béré',
    communes: ['Dianra', 'Kounahiri', 'Mankono'],
  },
  {
    district: 'Woroba',
    region: 'Worodougou',
    communes: ['Morondo', 'Séguéla', 'Worofla'],
  },

  // ── District du Zanzan ───────────────────────────────────────────────────
  {
    district: 'Zanzan',
    region: 'Bounkani',
    communes: ['Bouna', 'Doropo', 'Nassian', 'Téhini'],
  },
  {
    district: 'Zanzan',
    region: 'Gontougo',
    communes: ['Bondoukou', 'Koun-Fao', 'Sandégué', 'Tanda'],
  },
];

// Flat array of all communes
export const CI_COMMUNES: CICommune[] = CI_REGIONS_DATA.flatMap(r =>
  r.communes.map(name => ({
    name,
    region: r.region,
    district: r.district,
    isAbidjan: r.district === 'Abidjan',
  }))
);

// All commune names as a sorted flat array
export const ALL_COMMUNE_NAMES: string[] = CI_COMMUNES
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b, 'fr'));

// Check if a value is a known commune (not "Autre" / custom text)
export function isKnownCommune(value: string): boolean {
  return ALL_COMMUNE_NAMES.includes(value);
}

// Legacy exports for backward compatibility
export const CI_CITIES: CICity[] = CI_COMMUNES.map(c => ({
  name: c.name,
  region: c.region,
  isAbidjan: c.isAbidjan ?? false,
}));

export const ABIDJAN_COMMUNES = CI_COMMUNES
  .filter(c => c.isAbidjan)
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b, 'fr'));

export const ALL_CITY_NAMES = ALL_COMMUNE_NAMES;

export function validateCIPhone(phone: string): { valid: boolean; formatted: string; error?: string } {
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  if (!cleaned) return { valid: false, formatted: phone, error: 'Numéro requis' };

  let local: string;
  if (cleaned.startsWith('+225')) {
    local = cleaned.slice(4);
  } else if (cleaned.startsWith('225')) {
    local = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    local = cleaned.length > 10 ? cleaned.slice(0, 10) : cleaned;
  } else {
    local = cleaned;
  }

  if (local.length !== 10) {
    return { valid: false, formatted: phone, error: `Le numéro ivoirien doit comporter 10 chiffres (actuel: ${local.length})` };
  }

  if (!/^\d{10}$/.test(local)) {
    return { valid: false, formatted: phone, error: 'Le numéro ne doit contenir que des chiffres' };
  }

  const formatted = `+225 ${local.match(/.{2}/g)!.join(' ')}`;
  return { valid: true, formatted };
}
