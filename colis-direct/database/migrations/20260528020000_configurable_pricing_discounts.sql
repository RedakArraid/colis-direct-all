-- ============================================================
-- Migration: configurable_pricing_discounts
-- Rend configurables par l'admin les éléments de prix
-- jusqu'ici hardcodés dans le code :
--   • Remises par mode de livraison (-5%, -10%)
--   • Supplément livraison à domicile (1 000 FCFA fallback)
--   • Prix fallback quand aucune grille ne correspond
-- ============================================================

INSERT INTO additional_pricing_options
  (option_key, option_name, option_description, price_type, price_value, is_active, display_order)
VALUES
  (
    'discount_relay_to_relay',
    'Remise Relais → Relais',
    'Remise (%) appliquée sur le mode relais→relais dans le sélecteur de livraison marketplace.',
    'percentage', 10, true, 10
  ),
  (
    'discount_home_to_relay',
    'Remise Domicile → Relais',
    'Remise (%) appliquée sur le mode domicile→relais dans le sélecteur de livraison marketplace.',
    'percentage', 5, true, 11
  ),
  (
    'discount_relay_to_home',
    'Remise Relais → Domicile',
    'Remise (%) appliquée sur le mode relais→domicile dans le sélecteur de livraison marketplace.',
    'percentage', 5, true, 12
  ),
  (
    'home_delivery_supplement',
    'Supplément livraison à domicile',
    'Montant FCFA ajouté au prix quand home_delivery=true et qu''aucune grille "home" spécifique ne correspond (fallback usePricing).',
    'fixed', 1000, true, 13
  ),
  (
    'fallback_courier_intra',
    'Prix fallback courrier intra-commune',
    'Prix de base FCFA utilisé si aucune grille courrier ne correspond pour des communes identiques.',
    'fixed', 600, true, 20
  ),
  (
    'fallback_courier_inter',
    'Prix fallback courrier inter-commune',
    'Prix de base FCFA utilisé si aucune grille courrier ne correspond pour des communes différentes.',
    'fixed', 1000, true, 21
  ),
  (
    'fallback_colis_intra',
    'Prix fallback colis intra-commune',
    'Prix de base FCFA utilisé si aucune grille colis ne correspond pour des communes identiques.',
    'fixed', 1000, true, 22
  ),
  (
    'fallback_colis_inter',
    'Prix fallback colis inter-commune',
    'Prix de base FCFA utilisé si aucune grille colis ne correspond pour des communes différentes.',
    'fixed', 1500, true, 23
  )
ON CONFLICT (option_key) DO NOTHING;
