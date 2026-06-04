package ci.colisdirect.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.theme.OrangePrimary

private data class StepDef(
    val statuses: List<String>,
)

private val RELAY_STEPS = listOf(
    StepDef(listOf("READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY")),
    StepDef(listOf("RELAY_ORIGIN_RECEIVED", "PAYMENT_RECEIVED_AT_RELAY")),
    StepDef(listOf("CARRIER_COLLECTED", "IN_TRANSIT")),
    StepDef(listOf("RELAY_FINAL_RECEIVED", "AVAILABLE_FOR_PICKUP")),
    StepDef(listOf("PICKED_UP_BY_CUSTOMER")),
)

private val HOME_STEPS_RELAY = listOf(
    StepDef(listOf("READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY")),
    StepDef(listOf("RELAY_ORIGIN_RECEIVED", "PAYMENT_RECEIVED_AT_RELAY")),
    StepDef(listOf("CARRIER_COLLECTED", "IN_TRANSIT")),
    StepDef(listOf("DELIVERED", "DELIVERED_TO_CUSTOMER")),
)

private val HOME_PICKUP_STEPS_RELAY = listOf(
    StepDef(listOf("PICKUP_PENDING", "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP")),
    StepDef(listOf("CARRIER_COLLECTED")),
    StepDef(listOf("IN_TRANSIT")),
    StepDef(listOf("RELAY_FINAL_RECEIVED", "AVAILABLE_FOR_PICKUP")),
    StepDef(listOf("PICKED_UP_BY_CUSTOMER")),
)

private val HOME_STEPS_DIRECT = listOf(
    StepDef(listOf("PICKUP_PENDING", "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP")),
    StepDef(listOf("CARRIER_COLLECTED")),
    StepDef(listOf("IN_TRANSIT")),
    StepDef(listOf("DELIVERED", "DELIVERED_TO_CUSTOMER")),
)

private val STEP_DONE_STATUSES = setOf(
    "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY",
    "PICKUP_PENDING",
    "RELAY_ORIGIN_RECEIVED",
    "PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER",
)

fun shipmentProgressPercent(shipment: ShipmentDto): Int {
    val currentStatus = (shipment.effectiveStatus ?: shipment.currentStatus ?: "").uppercase()
    val isHomeDelivery = shipment.homeDelivery == true
    val isHomePickup = shipment.pickupMethod == "home_pickup"

    val steps = when {
        isHomePickup && isHomeDelivery -> HOME_STEPS_DIRECT
        isHomePickup -> HOME_PICKUP_STEPS_RELAY
        isHomeDelivery -> HOME_STEPS_RELAY
        else -> RELAY_STEPS
    }

    val idx = steps.indexOfFirst { step -> step.statuses.any { it == currentStatus } }
    val activeStep = when {
        idx == -1 -> 1
        STEP_DONE_STATUSES.contains(currentStatus) -> idx + 1
        else -> idx
    }.coerceIn(1, steps.size)

    return ((activeStep.toFloat() / steps.size) * 100).toInt()
}

fun isTerminalShipmentStatus(status: String): Boolean =
    status.uppercase() in setOf(
        "PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER",
        "CANCELLED", "RETURN_TO_SENDER",
    )

fun shortCommune(commune: String?): String {
    if (commune.isNullOrBlank()) return "—"
    return commune.trim().split(" ").lastOrNull()?.takeIf { it.isNotBlank() } ?: commune
}

@Composable
fun ShipmentProgressBar(
    shipment: ShipmentDto,
    modifier: Modifier = Modifier,
) {
    val progress = shipmentProgressPercent(shipment) / 100f
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().height(6.dp),
            color = OrangePrimary,
            trackColor = Color(0xFFE6E6E6),
        )
        Text(
            text = "${shipmentProgressPercent(shipment)}% · ${statusLabel(shipment.effectiveStatus ?: shipment.currentStatus ?: "")}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

fun formatShipmentDate(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return ""
    return try {
        val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault())
        parser.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val date = parser.parse(isoDate) ?: return isoDate.take(10)
        val formatter = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
        formatter.format(date)
    } catch (_: Exception) {
        isoDate.take(10)
    }
}

fun formatPriceFcfa(price: Double?): String {
    if (price == null || price <= 0) return ""
    val n = price.toInt()
    return "${n.toString().reversed().chunked(3).joinToString(" ").reversed()} F"
}
