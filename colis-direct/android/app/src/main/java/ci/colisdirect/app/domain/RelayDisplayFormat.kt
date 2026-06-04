package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.RelayFinancialPeriodDto
import ci.colisdirect.app.data.api.model.RelayStatsDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import kotlin.math.roundToInt

object RelayDisplayFormat {

    fun personName(first: String?, last: String?): String =
        listOfNotNull(first, last).joinToString(" ").trim().ifBlank { "—" }

    fun formatFcfa(amount: Double?): String {
        if (amount == null || !amount.isFinite()) return "—"
        val v = amount.roundToInt()
        val grouped = v.toString().reversed().chunked(3).joinToString(" ").reversed()
        return "$grouped FCFA"
    }

    fun shipmentTotal(shipment: ShipmentDto): Double {
        val base = shipment.price ?: 0.0
        val printing = shipment.printingFee ?: 0.0
        val assistance = shipment.assistanceFee ?: 0.0
        val box = shipment.boxPrice ?: 0.0
        return base + printing + assistance + box
    }

    fun formatDateTime(iso: String?): String {
        if (iso.isNullOrBlank()) return "—"
        val datePart = iso.take(10)
        val timePart = iso.substringAfter('T').take(5)
        return if (timePart.contains(':')) "$datePart $timePart" else datePart
    }

    fun formatDate(iso: String?): String = iso?.take(10) ?: "—"

    fun packageTypeLabel(type: String?): String = when (type?.lowercase()) {
        "petit" -> "Petit"
        "moyen" -> "Moyen"
        "grand" -> "Grand"
        else -> type?.replaceFirstChar { it.uppercase() } ?: "—"
    }

    fun deliveryModeLabel(shipment: ShipmentDto): String = when {
        shipment.homeDelivery == true -> "Livraison domicile"
        else -> "Point relais"
    }

    fun statusLabel(status: String): String = when (status.uppercase()) {
        "READY_FOR_DROP_OFF" -> "Prêt pour dépôt"
        "RELAY_ORIGIN_RECEIVED" -> "Reçu au relais d'origine"
        "RELAY_FINAL_RECEIVED" -> "Arrivé au relais"
        "IN_TRANSIT" -> "En transit"
        "CARRIER_COLLECTED" -> "Collecté transporteur"
        "AVAILABLE_FOR_PICKUP" -> "Disponible retrait"
        "PICKUP_PENDING" -> "En attente enlèvement"
        "PAYMENT_PENDING_AT_RELAY" -> "Paiement en attente"
        "PAYMENT_RECEIVED_AT_RELAY" -> "Paiement reçu"
        "PAYMENT_AWAITING_VALIDATION" -> "Validation paiement"
        "PAYMENT_VALIDATED" -> "Paiement validé"
        "DELIVERED", "DELIVERED_TO_CUSTOMER" -> "Livré"
        "PICKED_UP_BY_CUSTOMER" -> "Retiré par client"
        "CANCELLED" -> "Annulé"
        "RETURN_TO_SENDER" -> "Retour expéditeur"
        "PAYMENT_REJECTED" -> "Paiement refusé"
        else -> status.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() }
    }

    fun paymentStatusLabel(status: String?): String = when (status?.lowercase()) {
        "paid" -> "Payé"
        "pending" -> "En attente"
        "cancelled" -> "Annulé"
        "failed" -> "Échoué"
        else -> status?.replaceFirstChar { it.uppercase() } ?: "—"
    }

    fun paymentMethodLabel(method: String?): String = when (method?.lowercase()) {
        "relay_cash" -> "Espèces au relais"
        "mobile_money" -> "Mobile Money"
        "card", "paystack" -> "Carte bancaire"
        "cash" -> "Espèces"
        else -> method?.replace('_', ' ')?.replaceFirstChar { it.uppercase() } ?: "—"
    }

    fun relayLabel(shipment: ShipmentDto, origin: Boolean): String {
        if (origin) {
            return shipment.originRelayName
                ?: shipment.originRelay?.name
                ?: shipment.originRelayCommune?.let { "Relais — $it" }
                ?: "—"
        }
        return shipment.destinationRelayName
            ?: shipment.destinationRelay?.name
            ?: shipment.relayName
            ?: shipment.destinationRelayCommune?.let { "Relais — $it" }
            ?: "—"
    }

    fun addressLine(commune: String?, address: String?, quartier: String? = null): String {
        val parts = listOfNotNull(address, quartier, commune).filter { it.isNotBlank() }
        return parts.joinToString(", ").ifBlank { "—" }
    }

    data class PaymentBreakdownRow(val method: String, val label: String, val amount: Double, val count: Int)

    fun paymentBreakdown(period: RelayFinancialPeriodDto?): List<PaymentBreakdownRow> {
        val raw = period?.paymentBreakdown ?: return emptyList()
        return raw.entries
            .map { (method, info) ->
                PaymentBreakdownRow(
                    method = method,
                    label = paymentMethodLabel(method),
                    amount = info.amount,
                    count = info.count,
                )
            }
            .sortedByDescending { it.amount }
    }

    fun statsUpdatedLabel(stats: RelayStatsDto?): String? {
        val at = stats?.updatedAt ?: return null
        return "Mis à jour : ${formatDateTime(at)}"
    }
}
