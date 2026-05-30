import { pool } from '../db/connection';

// ─── Tarification marketplace : distance × taille + supplément poids ──────────
// Source de vérité unique, partagée entre GET /pricing-grids/calculate (affichage
// des 4 modes) et POST /shipments (recalcul serveur du prix réel — le client ne
// fixe plus le prix lui-même).

export type PackageSize = 'courrier' | 'petit' | 'moyen' | 'grand';
export type DeliveryModeKey = 'home_to_home' | 'home_to_relay' | 'relay_to_home' | 'relay_to_relay';

export interface PricingMode {
  key: DeliveryModeKey;
  label: string;
  emoji: string;
  pickup_method: 'home_pickup' | 'relay_deposit';
  home_delivery: boolean;
  discount_percent: number;
  delay: string;
  available: boolean;
  standard_price_fcfa: number;
  discount_amount_fcfa: number;
  final_price_fcfa: number;
  is_cheapest: boolean;
}

export interface PricingResult {
  package_size: PackageSize;
  distance_km: number;
  is_same_zone: boolean;
  zone_resolved: boolean;
  zone_from: string | null;
  zone_to: string | null;
  tier_name: string;
  base_price_fcfa: number;
  included_weight_kg: number;
  weight_surcharge_fcfa: number;
  standard_price_fcfa: number;
  modes: PricingMode[];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findZone(commune: string) {
  const res = await pool.query(
    `SELECT name, (min_latitude + max_latitude) / 2 AS lat, (min_longitude + max_longitude) / 2 AS lng
     FROM delivery_zones WHERE is_active = true AND communes @> ARRAY[$1]::text[] LIMIT 1`,
    [commune]
  );
  if (res.rows.length > 0) return res.rows[0];
  const res2 = await pool.query(
    `SELECT name, (min_latitude + max_latitude) / 2 AS lat, (min_longitude + max_longitude) / 2 AS lng
     FROM delivery_zones WHERE is_active = true
       AND EXISTS (SELECT 1 FROM unnest(communes) c WHERE lower(c) = lower($1)) LIMIT 1`,
    [commune]
  );
  return res2.rows[0] || null;
}

/** Déduit la clé de mode à partir du couple (pickup_method, home_delivery). */
export function deriveModeKey(pickupMethod?: string | null, homeDelivery?: boolean): DeliveryModeKey {
  const home = pickupMethod === 'home_pickup';
  if (home && homeDelivery) return 'home_to_home';
  if (home && !homeDelivery) return 'home_to_relay';
  if (!home && homeDelivery) return 'relay_to_home';
  return 'relay_to_relay';
}

/** Normalise une taille libre (incluant grid_type) vers une PackageSize valide. */
export function resolvePackageSize(packageSize?: string | null, gridType?: string | null): PackageSize {
  const s = packageSize || (gridType === 'courier' ? 'courrier' : 'petit');
  return (['courrier', 'petit', 'moyen', 'grand'].includes(s) ? s : 'petit') as PackageSize;
}

export async function computePricing(
  senderCommune: string,
  recipientCommune: string,
  packageSize: PackageSize,
  weightKg: number,
): Promise<PricingResult> {
  const senderName = (senderCommune || '').trim();
  const recipientName = (recipientCommune || '').trim();

  const [zoneFrom, zoneTo] = await Promise.all([findZone(senderName), findZone(recipientName)]);

  let distanceKm = 0;
  let isSameZone = false;
  let zoneResolved = true;
  if (zoneFrom && zoneTo) {
    isSameZone = zoneFrom.name === zoneTo.name;
    distanceKm = isSameZone
      ? 0
      : haversineKm(parseFloat(zoneFrom.lat), parseFloat(zoneFrom.lng), parseFloat(zoneTo.lat), parseFloat(zoneTo.lng));
  } else {
    // Commune non rattachée à une zone : ne pas sous-facturer → palier le plus élevé si communes différentes.
    zoneResolved = false;
    const sameCommune =
      senderName !== '' && senderName.toLowerCase() !== 'autre' &&
      senderName.toLowerCase() === recipientName.toLowerCase();
    distanceKm = sameCommune ? 0 : Number.MAX_SAFE_INTEGER;
    isSameZone = sameCommune;
  }

  const tierRes = await pool.query(
    `SELECT * FROM delivery_price_tiers
     WHERE is_active = true AND distance_km_min <= $1 AND (distance_km_max IS NULL OR distance_km_max >= $1)
     ORDER BY distance_km_min DESC LIMIT 1`,
    [distanceKm]
  );
  const tier = tierRes.rows[0] || (
    await pool.query(`SELECT * FROM delivery_price_tiers WHERE is_active = true ORDER BY distance_km_min DESC LIMIT 1`)
  ).rows[0];
  if (!tier) {
    throw new Error('Aucune tranche tarifaire configurée. Veuillez contacter l\'administrateur.');
  }

  const priceCol = `price_${packageSize}` as keyof typeof tier;
  const basePrice = Math.round(parseFloat(tier[priceCol] ?? tier.price_petit));

  const optsRes = await pool.query(
    `SELECT option_key, price_value FROM additional_pricing_options
     WHERE option_key IN (
       'discount_relay_to_relay','discount_home_to_relay','discount_relay_to_home',
       'weight_included_courrier','weight_included_petit','weight_included_moyen','weight_included_grand',
       'weight_surcharge_per_kg'
     ) AND is_active = true`
  );
  const opt: Record<string, number> = {};
  for (const row of optsRes.rows) opt[row.option_key] = parseFloat(row.price_value);

  const discountRelayRelay = opt['discount_relay_to_relay'] ?? 10;
  const discountHomeRelay  = opt['discount_home_to_relay']  ?? 5;
  const discountRelayHome  = opt['discount_relay_to_home']  ?? 5;

  const includedBySize: Record<string, number> = {
    courrier: opt['weight_included_courrier'] ?? 1,
    petit:    opt['weight_included_petit']    ?? 5,
    moyen:    opt['weight_included_moyen']    ?? 15,
    grand:    opt['weight_included_grand']    ?? 30,
  };
  const surchargePerKg = opt['weight_surcharge_per_kg'] ?? 0;
  const includedWeight = includedBySize[packageSize] ?? 5;
  const w = Math.max(0, weightKg || 0);
  const weightSurcharge = Math.round(Math.max(0, w - includedWeight) * surchargePerKg);
  const standardPrice = basePrice + weightSurcharge;

  const modeDefs = [
    { key: 'home_to_home',   label: 'Domicile → Domicile',        emoji: '🏠',  pickup_method: 'home_pickup',  home_delivery: true,  discount_percent: 0,                 delay: distanceKm <= 5 ? 'Même jour' : 'J+1' },
    { key: 'home_to_relay',  label: 'Domicile → Point relais',    emoji: '📦', pickup_method: 'home_pickup',  home_delivery: false, discount_percent: discountHomeRelay, delay: 'J+1' },
    { key: 'relay_to_home',  label: 'Point relais → Domicile',    emoji: '🏘️', pickup_method: 'relay_deposit', home_delivery: true,  discount_percent: discountRelayHome, delay: 'J+1' },
    { key: 'relay_to_relay', label: 'Point relais → Point relais', emoji: '📦', pickup_method: 'relay_deposit', home_delivery: false, discount_percent: discountRelayRelay, delay: distanceKm <= 20 ? 'J+1' : 'J+2' },
  ] as const;

  const modes: PricingMode[] = modeDefs
    .filter(m => !(distanceKm > 50 && m.key === 'home_to_home'))
    .map((mode) => {
      const discountAmount = Math.round(standardPrice * mode.discount_percent / 100);
      return {
        ...mode,
        available: true,
        standard_price_fcfa: standardPrice,
        discount_amount_fcfa: discountAmount,
        final_price_fcfa: standardPrice - discountAmount,
        is_cheapest: false,
      };
    });
  const minPrice = Math.min(...modes.map(m => m.final_price_fcfa));
  modes.forEach(m => { m.is_cheapest = m.final_price_fcfa === minPrice && m.discount_percent > 0; });

  return {
    package_size: packageSize,
    distance_km: distanceKm,
    is_same_zone: isSameZone,
    zone_resolved: zoneResolved,
    zone_from: zoneFrom?.name ?? null,
    zone_to: zoneTo?.name ?? null,
    tier_name: tier.tier_name,
    base_price_fcfa: basePrice,
    included_weight_kg: includedWeight,
    weight_surcharge_fcfa: weightSurcharge,
    standard_price_fcfa: standardPrice,
    modes,
  };
}

/** Prix final (FCFA) pour le mode logistique réel d'un colis. */
export function finalPriceForMode(result: PricingResult, modeKey: DeliveryModeKey): number | null {
  const mode = result.modes.find(m => m.key === modeKey);
  return mode ? mode.final_price_fcfa : null;
}
