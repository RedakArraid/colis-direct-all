package ci.colisdirect.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.ui.theme.StatusColors

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier,
) {
    val color = StatusColors[status] ?: MaterialTheme.colorScheme.outline
    val label = statusLabel(status)

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.15f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(color, shape = RoundedCornerShape(50))
                    .align(androidx.compose.ui.Alignment.CenterVertically)
            )
            Text(
                text = label,
                color = color,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
        }
    }
}

fun statusLabel(status: String): String = when (status) {
    "READY_FOR_DROP_OFF"                  -> "En attente de dépôt"
    "PICKUP_PENDING"                      -> "Ramassage en attente"
    "RELAY_ORIGIN_RECEIVED"               -> "Reçu au relais départ"
    "CARRIER_COLLECTED"                   -> "Pris par transporteur"
    "IN_TRANSIT"                          -> "En transit"
    "RELAY_FINAL_RECEIVED"                -> "Au relais destination"
    "AVAILABLE_FOR_PICKUP"                -> "Disponible au retrait"
    "PICKED_UP_BY_CUSTOMER"               -> "Retiré par le client"
    "DELIVERED"                           -> "Livré"
    "DELIVERED_TO_CUSTOMER"               -> "Livré à domicile"
    "RETURN_TO_SENDER"                    -> "Retour expéditeur"
    "CANCELLED"                           -> "Annulé"
    "PAYMENT_AWAITING_VALIDATION"         -> "Paiement en cours"
    "PAYMENT_VALIDATED"                   -> "Paiement validé"
    "PAYMENT_REJECTED"                    -> "Paiement rejeté"
    "PAYMENT_CONFIRMED_AWAITING_DROP"     -> "Payé — À déposer"
    "PAYMENT_PENDING_AT_RELAY"            -> "Paiement au relais"
    "PAYMENT_RECEIVED_AT_RELAY"           -> "Paiement encaissé"
    else                                  -> status
}
