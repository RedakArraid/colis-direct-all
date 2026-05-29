export type ShipmentLifecycleStatus =
  | 'READY_FOR_DROP_OFF'
  | 'PICKUP_PENDING'
  | 'RELAY_ORIGIN_RECEIVED'
  | 'CARRIER_COLLECTED'
  | 'IN_TRANSIT'
  | 'RELAY_FINAL_RECEIVED'
  | 'AVAILABLE_FOR_PICKUP'
  | 'PICKED_UP_BY_CUSTOMER'
  | 'DELIVERED'
  | 'DELIVERED_TO_CUSTOMER'
  | 'RETURN_TO_SENDER'
  | 'CANCELLED'
  | 'PAYMENT_AWAITING_VALIDATION'
  | 'PAYMENT_VALIDATED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_CONFIRMED_AWAITING_DROP'
  | 'PAYMENT_PENDING_AT_RELAY'
  | 'PAYMENT_RECEIVED_AT_RELAY';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

const DEFAULT_LIFECYCLE_STATUS: ShipmentLifecycleStatus = 'READY_FOR_DROP_OFF';

const VALID_STATUSES: Set<ShipmentLifecycleStatus> = new Set([
  'READY_FOR_DROP_OFF',
  'PICKUP_PENDING',
  'RELAY_ORIGIN_RECEIVED',
  'CARRIER_COLLECTED',
  'IN_TRANSIT',
  'RELAY_FINAL_RECEIVED',
  'AVAILABLE_FOR_PICKUP',
  'PICKED_UP_BY_CUSTOMER',
  'DELIVERED',
  'DELIVERED_TO_CUSTOMER',
  'RETURN_TO_SENDER',
  'CANCELLED',
  'PAYMENT_AWAITING_VALIDATION',
  'PAYMENT_VALIDATED',
  'PAYMENT_REJECTED',
  'PAYMENT_CONFIRMED_AWAITING_DROP',
  'PAYMENT_PENDING_AT_RELAY',
  'PAYMENT_RECEIVED_AT_RELAY',
]);

export function normalizeShipmentStatus(
  status?: string | null
): ShipmentLifecycleStatus {
  if (!status) {
    return DEFAULT_LIFECYCLE_STATUS;
  }
  const upper = status.toUpperCase() as ShipmentLifecycleStatus;
  return VALID_STATUSES.has(upper) ? upper : DEFAULT_LIFECYCLE_STATUS;
}

export function normalizePaymentStatus(status?: string | null): PaymentStatus {
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (normalized === 'paid' || normalized === 'cancelled') {
      return normalized;
    }
  }
  return 'pending';
}

export function getPaymentStatusLabel(status?: string | null): string {
  const normalized = normalizePaymentStatus(status);
  switch (normalized) {
    case 'paid':
      return 'Payé';
    case 'cancelled':
      return 'Annulé';
    case 'pending':
    default:
      return 'En attente';
  }
}

export function getPaymentStatusBadgeClass(status?: string | null): string {
  const normalized = normalizePaymentStatus(status);
  switch (normalized) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

export function isShipmentDelivered(status?: string | null): boolean {
  const normalized = normalizeShipmentStatus(status);
  return (
    normalized === 'DELIVERED' ||
    normalized === 'DELIVERED_TO_CUSTOMER' ||
    normalized === 'PICKED_UP_BY_CUSTOMER'
  );
}

export function isShipmentAtDestinationRelay(status?: string | null): boolean {
  const normalized = normalizeShipmentStatus(status);
  return (
    normalized === 'RELAY_FINAL_RECEIVED' ||
    normalized === 'AVAILABLE_FOR_PICKUP' ||
    normalized === 'PICKED_UP_BY_CUSTOMER'
  );
}

export function shipmentStatusForFilter(status?: string | null): string {
  const normalized = normalizeShipmentStatus(status);
  switch (normalized) {
    case 'PICKUP_PENDING':
      return 'pickup_pending';
    case 'READY_FOR_DROP_OFF':
    case 'RELAY_ORIGIN_RECEIVED':
    case 'PAYMENT_AWAITING_VALIDATION':
    case 'PAYMENT_CONFIRMED_AWAITING_DROP':
    case 'PAYMENT_VALIDATED':
      return 'pending';
    case 'CARRIER_COLLECTED':
    case 'IN_TRANSIT':
      return 'in_transit';
    case 'RELAY_FINAL_RECEIVED':
    case 'AVAILABLE_FOR_PICKUP':
      return 'at_relay';
    case 'PICKED_UP_BY_CUSTOMER':
    case 'DELIVERED':
    case 'DELIVERED_TO_CUSTOMER':
      return 'delivered';
    case 'RETURN_TO_SENDER':
      return 'return_to_sender';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'other';
  }
}

export function getShipmentStatusLabel(status?: string | null): string {
  const normalized = normalizeShipmentStatus(status);
  switch (normalized) {
    case 'READY_FOR_DROP_OFF':
      return 'En attente de dépôt';
    case 'PICKUP_PENDING':
      return 'Ramassage à domicile prévu';
    case 'PAYMENT_AWAITING_VALIDATION':
      return 'En attente de confirmation du paiement';
    case 'PAYMENT_CONFIRMED_AWAITING_DROP':
      return 'Paiement confirmé – en attente de dépôt';
    case 'PAYMENT_VALIDATED':
      return 'Paiement validé';
    case 'PAYMENT_REJECTED':
      return 'Paiement non reçu';
    case 'PAYMENT_PENDING_AT_RELAY':
      return 'Paiement à régler au relais';
    case 'PAYMENT_RECEIVED_AT_RELAY':
      return 'Paiement encaissé au relais';
    case 'RELAY_ORIGIN_RECEIVED':
      return 'Reçu au relais d’origine';
    case 'CARRIER_COLLECTED':
      return 'Pris en charge par transporteur';
    case 'IN_TRANSIT':
      return 'En transit';
    case 'RELAY_FINAL_RECEIVED':
      return 'Arrivé au relais de destination';
    case 'AVAILABLE_FOR_PICKUP':
      return 'Disponible au relais';
    case 'PICKED_UP_BY_CUSTOMER':
      return 'Retiré par le destinataire';
    case 'DELIVERED':
    case 'DELIVERED_TO_CUSTOMER':
      return 'Livré';
    case 'RETURN_TO_SENDER':
      return 'Retour à l’expéditeur';
    case 'CANCELLED':
      return 'Annulé';
    default:
      return normalized;
  }
}

export function getShipmentStatusBadgeClass(status?: string | null): string {
  const normalized = normalizeShipmentStatus(status);
  if (isShipmentDelivered(normalized)) {
    return 'bg-green-100 text-green-700';
  }
  switch (normalized) {
    case 'IN_TRANSIT':
    case 'CARRIER_COLLECTED':
      return 'bg-blue-100 text-blue-700';
    case 'RELAY_FINAL_RECEIVED':
    case 'AVAILABLE_FOR_PICKUP':
      return 'bg-purple-100 text-purple-700';
    case 'READY_FOR_DROP_OFF':
    case 'RELAY_ORIGIN_RECEIVED':
    case 'PAYMENT_AWAITING_VALIDATION':
      return 'bg-yellow-100 text-yellow-700';
    case 'PAYMENT_CONFIRMED_AWAITING_DROP':
      return 'bg-teal-100 text-teal-700';
    case 'PICKUP_PENDING':
      return 'bg-sky-100 text-sky-700';
    case 'PAYMENT_VALIDATED':
      return 'bg-green-100 text-green-700';
    case 'PAYMENT_REJECTED':
      return 'bg-red-100 text-red-700';
    case 'PAYMENT_PENDING_AT_RELAY':
      return 'bg-orange-100 text-orange-700';
    case 'PAYMENT_RECEIVED_AT_RELAY':
      return 'bg-green-100 text-green-700';
    case 'RETURN_TO_SENDER':
    case 'CANCELLED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-[#F6F7F9] text-[#3A3A3A]';
  }
}

/**
 * Get status icon component - all statuses have green check except incidents
 * @param status - Shipment status
 * @returns React component for the status icon
 */
export function getStatusIconComponent(status?: string | null): { icon: 'check' | 'error', color: string } {
  const normalized = normalizeShipmentStatus(status);
  
  // Statuts d'incident qui doivent avoir une icône d'erreur
  const incidentStatuses = ['CANCELLED', 'RETURN_TO_SENDER', 'PAYMENT_REJECTED'];
  
  if (incidentStatuses.includes(normalized)) {
    return { icon: 'error', color: 'text-red-600' };
  }
  
  // Tous les autres statuts ont un check vert
  return { icon: 'check', color: 'text-green-600' };
}

/**
 * Get badge class for delivery status, using the same logic as getDeliveryStatusLabel
 * This ensures consistency between the displayed text and color
 */
export function getDeliveryStatusBadgeClass(shipment: Record<string, any>): string {
  // Utiliser la même logique que getDeliveryStatusLabel pour déterminer le statut réel
  const currentStatus = normalizeShipmentStatus(shipment?.current_status ?? shipment?.status);
  
  // Liste des statuts de livraison (non liés au paiement)
  const deliveryStatuses = [
    'RELAY_ORIGIN_RECEIVED',
    'CARRIER_COLLECTED',
    'IN_TRANSIT',
    'RELAY_FINAL_RECEIVED',
    'AVAILABLE_FOR_PICKUP',
    'PICKED_UP_BY_CUSTOMER',
    'DELIVERED',
    'DELIVERED_TO_CUSTOMER'
  ];
  
  // Si le current_status est un statut de livraison avancé, l'utiliser directement
  let logisticStatus: ShipmentLifecycleStatus;
  if (deliveryStatuses.includes(currentStatus)) {
    logisticStatus = currentStatus;
  } else {
    logisticStatus = getEffectiveShipmentStatus(shipment);
    // Si effective_status est un statut de paiement mais que current_status existe, vérifier s'il faut l'utiliser
    const effectiveNormalized = normalizeShipmentStatus(logisticStatus);
    if (
      (effectiveNormalized === 'PAYMENT_RECEIVED_AT_RELAY' || effectiveNormalized === 'PAYMENT_PENDING_AT_RELAY') &&
      currentStatus !== 'READY_FOR_DROP_OFF' && 
      currentStatus !== 'PAYMENT_CONFIRMED_AWAITING_DROP' &&
      deliveryStatuses.includes(currentStatus)
    ) {
      logisticStatus = currentStatus;
    }
  }
  
  // Maintenant utiliser le statut déterminé pour obtenir la couleur
  return getShipmentStatusBadgeClass(logisticStatus);
}

/**
 * Get effective shipment status.
 * 
 * IMPORTANT: Always use effective_status from backend when available.
 * This function is a fallback for cases where backend doesn't provide effective_status.
 * 
 * The backend calculates effective_status in tracking.ts based on:
 * - current_status
 * - payment_method
 * - payment_status
 * - payment_status (paiement en ligne automatique)
 * - relay_cash_payment.status
 * 
 * @param shipment - Shipment object (should include effective_status from backend)
 * @returns Normalized effective status
 */
export function getEffectiveShipmentStatus(shipment: Record<string, any>): ShipmentLifecycleStatus {
  // Always prefer effective_status from backend (single source of truth)
  if (shipment?.effective_status) {
    return normalizeShipmentStatus(shipment.effective_status);
  }

  // Fallback calculation (should only be used if backend doesn't provide effective_status)
  // This matches the logic in backend/src/routes/tracking.ts
  const baseStatus = normalizeShipmentStatus(shipment?.current_status ?? shipment?.status);

  // Terminal delivery statuses are never overridden by payment logic
  const TERMINAL: ShipmentLifecycleStatus[] = [
    'DELIVERED', 'DELIVERED_TO_CUSTOMER', 'PICKED_UP_BY_CUSTOMER',
    'CANCELLED', 'RETURN_TO_SENDER',
  ];
  if ((TERMINAL as string[]).includes(baseStatus)) return baseStatus;

  const paymentMethod = (shipment?.payment_method || '').toString().toLowerCase().trim();
  const paymentStatus = (shipment?.payment_status || '').toString().toLowerCase().trim();

  const mobilePayment = shipment?.mobile_money_payment;
  const mobileStatus = (mobilePayment?.status || '').toString().toLowerCase().trim();

  if (paymentMethod === 'mobile_money') {
    if (mobileStatus === 'rejected') {
      return 'PAYMENT_REJECTED';
    }

    if (paymentStatus === 'paid') {
      if (
        baseStatus === 'READY_FOR_DROP_OFF' ||
        baseStatus === 'PAYMENT_AWAITING_VALIDATION' ||
        baseStatus === 'PAYMENT_VALIDATED' ||
        baseStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP'
      ) {
        return 'PAYMENT_CONFIRMED_AWAITING_DROP';
      }
      return baseStatus;
    }

    if (paymentStatus === 'pending') {
      if (
        baseStatus === 'READY_FOR_DROP_OFF' ||
        baseStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
        baseStatus === 'PAYMENT_VALIDATED' ||
        baseStatus === 'PAYMENT_AWAITING_VALIDATION'
      ) {
        return 'PAYMENT_AWAITING_VALIDATION';
      }
    }
  }

  if (paymentMethod === 'paystack' || paymentMethod === 'cinetpay') {
    if (paymentStatus === 'paid') {
      if (
        baseStatus === 'READY_FOR_DROP_OFF' ||
        baseStatus === 'PAYMENT_AWAITING_VALIDATION' ||
        baseStatus === 'PAYMENT_VALIDATED' ||
        baseStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP'
      ) {
        return 'PAYMENT_CONFIRMED_AWAITING_DROP';
      }
      return baseStatus;
    }
    if (paymentStatus === 'pending') {
      if (
        baseStatus === 'READY_FOR_DROP_OFF' ||
        baseStatus === 'PAYMENT_CONFIRMED_AWAITING_DROP' ||
        baseStatus === 'PAYMENT_VALIDATED' ||
        baseStatus === 'PAYMENT_AWAITING_VALIDATION'
      ) {
        return 'PAYMENT_AWAITING_VALIDATION';
      }
    }
  }

  if (paymentMethod === 'relay_cash') {
    const relayPayment = shipment?.relay_cash_payment;
    const relayStatus = (relayPayment?.status || '').toString().toLowerCase().trim();
    if (relayStatus === 'collected' || paymentStatus === 'paid') {
      return 'PAYMENT_RECEIVED_AT_RELAY';
    }
    return 'PAYMENT_PENDING_AT_RELAY';
  }

  return baseStatus;
}

/**
 * Get delivery status label for display in UI.
 * This function provides user-friendly labels for shipment statuses.
 * 
 * @param shipment - Shipment object with status and delivery information
 * @returns User-friendly status label
 */
export function getDeliveryStatusLabel(shipment: Record<string, any>): string {
  // Pour le statut de livraison, prioriser current_status sur effective_status
  // car effective_status peut être un statut de paiement qui masque le vrai statut de livraison
  const currentStatus = normalizeShipmentStatus(shipment?.current_status ?? shipment?.status);
  
  // Liste des statuts de livraison (non liés au paiement)
  const deliveryStatuses = [
    'RELAY_ORIGIN_RECEIVED',
    'CARRIER_COLLECTED',
    'IN_TRANSIT',
    'RELAY_FINAL_RECEIVED',
    'AVAILABLE_FOR_PICKUP',
    'PICKED_UP_BY_CUSTOMER',
    'DELIVERED',
    'DELIVERED_TO_CUSTOMER'
  ];
  
  // Si le current_status est un statut de livraison avancé, l'utiliser directement
  // Sinon, utiliser effective_status pour les statuts initiaux (paiement, etc.)
  let logisticStatus: ShipmentLifecycleStatus;
  if (deliveryStatuses.includes(currentStatus)) {
    logisticStatus = currentStatus;
  } else {
    logisticStatus = getEffectiveShipmentStatus(shipment);
    // Si effective_status est un statut de paiement mais que current_status existe, vérifier s'il faut l'utiliser
    const effectiveNormalized = normalizeShipmentStatus(logisticStatus);
    if (
      (effectiveNormalized === 'PAYMENT_RECEIVED_AT_RELAY' || effectiveNormalized === 'PAYMENT_PENDING_AT_RELAY') &&
      currentStatus !== 'READY_FOR_DROP_OFF' && 
      currentStatus !== 'PAYMENT_CONFIRMED_AWAITING_DROP' &&
      deliveryStatuses.includes(currentStatus)
    ) {
      logisticStatus = currentStatus;
    }
  }
  
  const normalized = normalizeShipmentStatus(logisticStatus);
  
  // Ramassage à domicile = le transporteur vient chercher chez l'expéditeur
  // Utiliser pickup_method (source de vérité) ; home_delivery concerne la LIVRAISON, pas la collecte
  const isHomePickup = shipment?.pickup_method === 'home_pickup';

  switch (normalized) {
    case 'PICKUP_PENDING':
      return 'Ramassage à domicile prévu';
    case 'READY_FOR_DROP_OFF':
    case 'PAYMENT_AWAITING_VALIDATION':
    case 'PAYMENT_CONFIRMED_AWAITING_DROP':
    case 'PAYMENT_PENDING_AT_RELAY':
      return isHomePickup ? 'En attente de ramassage' : 'En attente de dépôt';
    
    case 'RELAY_ORIGIN_RECEIVED':
      return 'Réceptionné par le relais de dépôt';
    
    case 'PAYMENT_RECEIVED_AT_RELAY':
      // Si le paiement est encaissé, vérifier le current_status pour le statut de livraison réel
      if (deliveryStatuses.includes(currentStatus)) {
        const currentNormalized = normalizeShipmentStatus(currentStatus);
        if (currentNormalized === 'RELAY_FINAL_RECEIVED' || currentNormalized === 'AVAILABLE_FOR_PICKUP') {
          return 'Disponible pour retrait';
        }
        if (currentNormalized === 'RELAY_ORIGIN_RECEIVED') {
          return 'Réceptionné par le relais de dépôt';
        }
        if (currentNormalized === 'CARRIER_COLLECTED' || currentNormalized === 'IN_TRANSIT') {
          return 'En transit';
        }
        if (currentNormalized === 'PICKED_UP_BY_CUSTOMER' || currentNormalized === 'DELIVERED' || currentNormalized === 'DELIVERED_TO_CUSTOMER') {
          return 'Colis Livré';
        }
      }
      return 'Réceptionné par le relais de dépôt';
    
    case 'CARRIER_COLLECTED':
    case 'IN_TRANSIT':
      return 'En transit';
    
    case 'RELAY_FINAL_RECEIVED':
    case 'AVAILABLE_FOR_PICKUP':
      return 'Disponible pour retrait';
    
    case 'PICKED_UP_BY_CUSTOMER':
    case 'DELIVERED':
    case 'DELIVERED_TO_CUSTOMER':
      return 'Colis Livré';
    
    case 'RETURN_TO_SENDER':
      return 'Retourné / Échec livraison';
    
    case 'CANCELLED':
      return 'Annulé';
    
    case 'PAYMENT_REJECTED':
      return 'Paiement rejeté';
    
    default:
      return getShipmentStatusLabel(logisticStatus);
  }
}

