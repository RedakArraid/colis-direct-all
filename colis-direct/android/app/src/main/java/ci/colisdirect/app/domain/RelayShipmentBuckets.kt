package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.ShipmentDto

/** Regroupements alignés sur `RelayDashboard.tsx` (web). */
object RelayShipmentBuckets {

    data class Buckets(
        val pendingIntake: List<ShipmentDto>,
        val inRelay: List<ShipmentDto>,
        val awaitingPickup: List<ShipmentDto>,
    )

    private val inRelayStatuses = setOf(
        "RELAY_ORIGIN_RECEIVED",
        "RELAY_FINAL_RECEIVED",
        "PICKUP_PENDING",
        "PAYMENT_PENDING_AT_RELAY",
        "PAYMENT_RECEIVED_AT_RELAY",
        "PAYMENT_AWAITING_VALIDATION",
        "PAYMENT_VALIDATED",
    )

    fun categorize(
        relayId: String,
        allShipments: List<ShipmentDto>,
        activeShipments: List<ShipmentDto>,
    ): Buckets {
        val relayShipments = allShipments.filter { s ->
            s.originRelayId.equals(relayId, ignoreCase = true) ||
                s.destinationRelayId.equals(relayId, ignoreCase = true)
        }
        val dedupedActive = dedupe(activeShipments.ifEmpty { relayShipments.filter { statusOf(it) in inRelayStatuses + "AVAILABLE_FOR_PICKUP" } })

        val pendingIntake = relayShipments.filter { s ->
            statusOf(s) == "READY_FOR_DROP_OFF" && s.originRelayId.isNullOrBlank()
        }

        val inRelay = dedupedActive.filter { statusOf(it) in inRelayStatuses }
            .ifEmpty {
                relayShipments.filter { statusOf(it) in setOf("RELAY_ORIGIN_RECEIVED", "RELAY_FINAL_RECEIVED") }
            }

        val awaitingPickup = dedupedActive.filter { statusOf(it) == "AVAILABLE_FOR_PICKUP" }
            .ifEmpty {
                relayShipments.filter { statusOf(it) == "AVAILABLE_FOR_PICKUP" }
            }

        return Buckets(
            pendingIntake = dedupe(pendingIntake),
            inRelay = dedupe(inRelay),
            awaitingPickup = dedupe(awaitingPickup),
        )
    }

    fun statusOf(shipment: ShipmentDto): String =
        (shipment.effectiveStatus ?: shipment.currentStatus).orEmpty().uppercase()

    private val terminalOk = setOf(
        "DELIVERED",
        "PICKED_UP_BY_CUSTOMER",
        "DELIVERED_TO_CUSTOMER",
    )

    private val incidentStatuses = setOf(
        "CANCELLED",
        "RETURN_TO_SENDER",
        "PAYMENT_REJECTED",
    )

    fun colisEnCours(all: List<ShipmentDto>): List<ShipmentDto> =
        dedupe(all.filter { statusOf(it) !in terminalOk + incidentStatuses })

    fun colisTermine(all: List<ShipmentDto>): List<ShipmentDto> =
        dedupe(all.filter { statusOf(it) in terminalOk })

    fun colisIncidents(all: List<ShipmentDto>): List<ShipmentDto> =
        dedupe(all.filter { statusOf(it) in incidentStatuses })

    fun filterSearch(list: List<ShipmentDto>, query: String): List<ShipmentDto> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return list
        return list.filter { s ->
            s.trackingNumber.lowercase().contains(q) ||
                s.shipmentCode?.lowercase()?.contains(q) == true ||
                "${s.senderFirstName} ${s.senderLastName}".lowercase().contains(q) ||
                "${s.recipientFirstName} ${s.recipientLastName}".lowercase().contains(q) ||
                s.senderPhone?.contains(q) == true ||
                s.recipientPhone?.contains(q) == true ||
                s.senderCommune?.lowercase()?.contains(q) == true ||
                s.recipientCommune?.lowercase()?.contains(q) == true
        }
    }

    private fun dedupe(list: List<ShipmentDto>): List<ShipmentDto> {
        val seen = mutableSetOf<String>()
        return list.filter { seen.add(it.id) }
    }
}
