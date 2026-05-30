import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface PricingGrid {
  id: number;
  grid_type: 'courier' | 'colis';
  package_size?: 'petit' | 'moyen' | 'grand'; // NULL pour courier
  delivery_mode?: 'relay' | 'home';
  weight_min: number;
  weight_max: number;
  price_intra_commune: number;
  price_inter_commune: number;
  supplement_per_kg_intra: number;
  supplement_per_kg_inter: number;
  is_active: boolean;
}

interface AdditionalOption {
  id: number;
  option_key: string;
  option_name: string;
  option_description?: string;
  price_type: 'fixed' | 'percentage';
  price_value: number;
  is_active: boolean;
}

// Valeurs de sécurité ultime si la DB ne renvoie aucune option configurée
const HARD_DEFAULTS = {
  home_delivery_supplement: 1000,
  fallback_courier_intra: 600,
  fallback_courier_inter: 1000,
  fallback_colis_intra: 1000,
  fallback_colis_inter: 1500,
};

export function usePricing() {
  const [grids, setGrids] = useState<PricingGrid[]>([]);
  const [options, setOptions] = useState<AdditionalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPricingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: gridsData, error: gridsError } = await api.getActivePricingGrids();
      if (gridsError) {
        console.error('Error loading pricing grids:', gridsError);
        throw new Error(gridsError);
      }

      const { data: optionsData, error: optionsError } = await api.getActiveAdditionalOptions();
      if (optionsError) {
        console.error('Error loading additional options:', optionsError);
        throw new Error(optionsError);
      }

      setGrids(gridsData || []);
      setOptions(optionsData || []);
    } catch (err: any) {
      console.error('Error loading pricing data:', err);
      setError(err.message || 'Erreur lors du chargement des tarifs');
      setGrids([]);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricingData();
  }, [loadPricingData]);

  // Lit une option fixe par sa clé, avec valeur par défaut de sécurité
  const getFixedOption = (key: keyof typeof HARD_DEFAULTS): number => {
    const opt = options.find((o) => o.option_key === key && o.is_active);
    return opt ? parseFloat(opt.price_value.toString()) : HARD_DEFAULTS[key];
  };

  const calculatePrice = (
    package_type: 'petit' | 'moyen' | 'grand',
    weight: number,
    sender_commune: string,
    recipient_commune: string,
    is_fragile: boolean,
    _is_express?: boolean, // Déprécié
    home_delivery?: boolean,
    declaredValue?: number,
    grid_type?: 'courier' | 'colis'
  ): number => {
    const isIntraCommune = sender_commune === recipient_commune;
    let basePrice = 0;

    // grid_type explicite prioritaire; sinon inféré depuis package_type (rétrocompat)
    const resolvedGridType = grid_type ?? (package_type === 'petit' ? 'courier' : 'colis');
    const deliveryMode = home_delivery ? 'home' : 'relay';
    const matchingGrid = grids.find((grid) => {
      if (resolvedGridType === 'courier') {
        return grid.grid_type === 'courier' &&
               !grid.package_size &&
               (!grid.delivery_mode || grid.delivery_mode === deliveryMode) &&
               weight > grid.weight_min &&
               weight <= grid.weight_max &&
               grid.is_active;
      } else {
        return grid.grid_type === 'colis' &&
               grid.package_size === package_type &&
               (!grid.delivery_mode || grid.delivery_mode === deliveryMode) &&
               weight > grid.weight_min &&
               weight <= grid.weight_max &&
               grid.is_active;
      }
    });

    if (matchingGrid) {
      basePrice = isIntraCommune
        ? parseFloat(matchingGrid.price_intra_commune.toString())
        : parseFloat(matchingGrid.price_inter_commune.toString());

      if (matchingGrid.supplement_per_kg_intra > 0 || matchingGrid.supplement_per_kg_inter > 0) {
        const supplementPerKg = isIntraCommune
          ? parseFloat(matchingGrid.supplement_per_kg_intra.toString())
          : parseFloat(matchingGrid.supplement_per_kg_inter.toString());
        const extraKg = Math.ceil(weight - matchingGrid.weight_max);
        if (extraKg > 0) {
          basePrice += extraKg * supplementPerKg;
        }
      }
    } else {
      // Fallback configurable via additional_pricing_options
      if (resolvedGridType === 'courier') {
        basePrice = isIntraCommune
          ? getFixedOption('fallback_courier_intra')
          : getFixedOption('fallback_courier_inter');
      } else {
        basePrice = isIntraCommune
          ? getFixedOption('fallback_colis_intra')
          : getFixedOption('fallback_colis_inter');
      }
      // Supplément domicile configurable si pas de grille home spécifique
      if (home_delivery) {
        basePrice += getFixedOption('home_delivery_supplement');
      }
      // Supplément au poids (cohérent avec le backend /calculate) : au-delà du
      // poids inclus de la taille, +X FCFA/kg. Lu depuis additional_pricing_options.
      const readOpt = (key: string, def: number): number => {
        const o = options.find((x) => x.option_key === key && x.is_active);
        return o ? parseFloat(o.price_value.toString()) : def;
      };
      const includedWeight = resolvedGridType === 'courier'
        ? readOpt('weight_included_courrier', 1)
        : readOpt(
            `weight_included_${package_type}`,
            package_type === 'petit' ? 5 : package_type === 'moyen' ? 15 : 30
          );
      const surchargePerKg = readOpt('weight_surcharge_per_kg', 0);
      if (weight > includedWeight && surchargePerKg > 0) {
        basePrice += Math.round((weight - includedWeight) * surchargePerKg);
      }
    }

    // Options additionnelles (fragile, assurance)
    options.forEach((option) => {
      if (!option.is_active) return;

      if (option.option_key === 'fragile' && is_fragile) {
        if (option.price_type === 'fixed') {
          basePrice += parseFloat(option.price_value.toString());
        }
      } else if (option.option_key === 'insurance' && declaredValue) {
        if (option.price_type === 'fixed') {
          basePrice += parseFloat(option.price_value.toString());
        } else if (option.price_type === 'percentage') {
          basePrice += (declaredValue * parseFloat(option.price_value.toString())) / 100;
        }
      }
    });

    // Sécurité fragile si option absente de la DB
    if (is_fragile && !options.find((o) => o.option_key === 'fragile')) {
      basePrice += 500;
    }

    return Math.round(basePrice);
  };

  // Exposé pour les composants qui affichent le supplément domicile avant calcul complet
  const homeDeliverySupplement = getFixedOption('home_delivery_supplement');

  return {
    grids,
    options,
    loading,
    error,
    calculatePrice,
    homeDeliverySupplement,
    refresh: loadPricingData,
  };
}
