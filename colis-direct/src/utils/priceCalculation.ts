// Legacy synchronous function - kept for backward compatibility
// Use usePricing hook in React components instead
export function calculateShipmentPrice(
  package_type: 'petit' | 'moyen' | 'grand',
  _weight: number,
  sender_commune: string,
  recipient_commune: string,
  is_fragile: boolean,
  _is_express: boolean,
  _home_delivery: boolean
): number {
  // Note: is_express et home_delivery ne sont plus des frais additionnels
  // home_delivery est maintenant uniquement un mode de livraison
  // "Autre" or mismatched communes → always inter-commune pricing
  const isIntraCommune =
    sender_commune !== '' &&
    sender_commune !== 'Autre' &&
    recipient_commune !== '' &&
    recipient_commune !== 'Autre' &&
    sender_commune === recipient_commune;
  let basePrice = 0;

  // Nouveaux tarifs simplifiés (fallback si usePricing n'est pas disponible)
  // 'petit' = Courrier/Document, 'moyen' et 'grand' = Colis
  if (package_type === 'petit') {
    // Courrier / Document
    basePrice = isIntraCommune ? 600 : 1000;
  } else {
    // Colis (moyen ou grand)
    basePrice = isIntraCommune ? 1000 : 1500;
  }

  // Frais additionnels
  if (is_fragile) basePrice += 500; // Colis fragile: 500 FCFA
  // Note: Express et Livraison à domicile ne sont plus des frais additionnels
  
  // Note: L'assurance est gérée séparément via is_insured
  // Assurance complète: 1500 FCFA (doit être ajouté dans le composant qui utilise cette fonction)
  // Assurance de base: 25% de la valeur déclarée (doit être ajouté dans le composant qui utilise cette fonction)

  return basePrice;
}

