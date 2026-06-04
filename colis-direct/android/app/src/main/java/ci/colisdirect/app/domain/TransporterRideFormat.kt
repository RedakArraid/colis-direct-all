package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.DeliveryOfferDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import java.text.NumberFormat
import java.util.Locale

object TransporterRideFormat {
    private val fcfa = NumberFormat.getIntegerInstance(Locale.FRANCE)

    fun formatFcfa(amount: Double?): String = fcfa.format((amount ?: 0.0).toLong())

    fun initials(first: String?, last: String?): String {
        val a = first?.firstOrNull()?.uppercaseChar() ?: ""
        val b = last?.firstOrNull()?.uppercaseChar() ?: ""
        return "$a$b".ifBlank { "LV" }
    }

    fun fromOf(shipment: ShipmentDto): String =
        shipment.senderCommune
            ?: shipment.originRelayName
            ?: shipment.originRelay?.commune
            ?: shipment.relayCommune
            ?: "—"

    fun toOf(shipment: ShipmentDto): String =
        shipment.recipientCommune
            ?: shipment.destinationRelayName
            ?: shipment.destinationRelay?.commune
            ?: "—"

    fun fromOf(offer: DeliveryOfferDto): String =
        offer.senderCommune ?: offer.originRelayName ?: offer.originRelayCommune ?: "—"

    fun toOf(offer: DeliveryOfferDto): String =
        offer.recipientCommune ?: offer.destinationRelayName ?: offer.destinationRelayCommune ?: "—"

    fun earningsFcfa(shipment: ShipmentDto): Double = shipment.price ?: 0.0

    fun earningsFcfa(offer: DeliveryOfferDto): Double =
        offer.netEarningsFcfa ?: offer.price ?: 0.0

    fun packageLabel(type: String?, weight: Double?): String =
        "${type ?: "Colis"} · ${weight ?: "?"} kg"

    fun isTerminalStatus(status: String?): Boolean {
        val s = status?.uppercase() ?: return false
        return s in TERMINAL
    }

    private val TERMINAL = setOf(
        "DELIVERED",
        "DELIVERED_TO_CUSTOMER",
        "PICKED_UP_BY_CUSTOMER",
        "CANCELLED",
        "RETURN_TO_SENDER",
    )
}
