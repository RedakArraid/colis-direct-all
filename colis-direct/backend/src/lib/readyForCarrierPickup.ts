/**
 * Filtre SQL : colis « prêt à être enlevé » par un transporteur.
 *
 * - Ramassage à domicile (pas de relais d’origine) : payé ou relay_cash, statut prêt.
 * - Dépôt au relais : le colis doit être au moins RELAY_ORIGIN_RECEIVED (déjà pris en charge par nos services au relais).
 */
export const SQL_READY_FOR_CARRIER_PICKUP = `
(
  (
    s.origin_relay_id IS NULL
    AND s.current_status IN (
      'READY_FOR_DROP_OFF'::shipment_status,
      'PAYMENT_CONFIRMED_AWAITING_DROP'::shipment_status,
      'PICKUP_PENDING'::shipment_status
    )
    AND (
      s.payment_method::text = 'relay_cash'
      OR s.payment_status::text = 'paid'
    )
  )
  OR (
    s.origin_relay_id IS NOT NULL
    AND s.current_status = 'RELAY_ORIGIN_RECEIVED'::shipment_status
  )
)
`;
