package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.ShipmentDto
import kotlin.math.roundToInt

/** Logique paiement alignée sur `MyShipmentsPage.tsx`. */
object ShipmentPayment {

    private val TERMINAL_STATUSES = setOf(
        "DELIVERED",
        "DELIVERED_TO_CUSTOMER",
        "PICKED_UP_BY_CUSTOMER",
        "CANCELLED",
        "RETURN_TO_SENDER",
    )

    private val ONLINE_METHODS = setOf("mobile_money", "paystack", "cinetpay", "card")

    fun ShipmentDto.effectiveStatusKey(): String =
        (effectiveStatus ?: currentStatus ?: "").uppercase()

    fun ShipmentDto.paymentStatusKey(): String =
        paymentStatus?.lowercase()?.trim().orEmpty()

    fun ShipmentDto.paymentMethodKey(): String =
        paymentMethod?.lowercase()?.trim().orEmpty()

    fun ShipmentDto.totalAmountFcfa(): Int {
        fun n(v: Double?) = if (v != null && v.isFinite() && v > 0) v.roundToInt() else 0
        return (n(price) + n(printingFee) + n(boxPrice) + n(assistanceFee)).coerceAtLeast(0)
    }

    fun ShipmentDto.paymentRouteLabel(): String {
        val from = senderCommune?.trim().orEmpty().ifBlank { "origine" }
        val to = recipientCommune?.trim().orEmpty().ifBlank { "destination" }
        return "${from}_to_${to}"
    }

    /** Colis éligible au paiement en ligne (Paystack). */
    fun ShipmentDto.needsOnlinePayment(): Boolean {
        val status = effectiveStatusKey()
        if (status in TERMINAL_STATUSES) return false
        val payStatus = paymentStatusKey()
        if (payStatus == "paid" || payStatus == "cancelled") return false

        if (status == "PAYMENT_AWAITING_VALIDATION" || status == "PAYMENT_REJECTED") {
            return payStatus != "paid"
        }

        val method = paymentMethodKey()
        if (method in ONLINE_METHODS && payStatus != "paid") return true

        if (payStatus == "pending" && method != "relay_cash" && method.isNotEmpty()) return true

        return false
    }

    fun ShipmentDto.canSwitchToRelayCashPayment(): Boolean =
        needsOnlinePayment() && paymentMethodKey() != "relay_cash"

    fun paymentStatusLabel(shipment: ShipmentDto): String = when {
        shipment.paymentStatusKey() == "paid" -> "Payé"
        shipment.effectiveStatusKey() == "PAYMENT_REJECTED" -> "Paiement échoué"
        shipment.needsOnlinePayment() -> "En attente de paiement"
        else -> "—"
    }
}
