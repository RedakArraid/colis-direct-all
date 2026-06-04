package ci.colisdirect.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun MobilePackageCard(
    shipment: ShipmentDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val status = (shipment.effectiveStatus ?: shipment.currentStatus ?: "").uppercase()
    val progress = shipmentProgressPercent(shipment) / 100f
    val code = shipment.shipmentCode ?: shipment.trackingNumber.takeLast(6)
    val dateLabel = shipment.createdAt?.let { formatShortDate(it) } ?: ""
    val route = "${shortCommune(shipment.senderCommune)} → ${shortCommune(shipment.recipientCommune)}"
    val recipient = "Pour : ${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""}".trim()

    Surface(
        modifier = modifier
            .width(260.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp,
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        code,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = OrangePrimary,
                    )
                    Text(
                        dateLabel,
                        fontFamily = InterFontFamily,
                        fontSize = 10.sp,
                        color = Gray500,
                    )
                }
                StatusBadge(status = status)
            }

            Text(
                route,
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                color = Gray900,
            )
            Text(
                recipient,
                fontFamily = InterFontFamily,
                fontSize = 12.sp,
                color = Gray500,
            )

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = OrangePrimary,
                    trackColor = Gray300,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        "Progression",
                        fontFamily = InterFontFamily,
                        fontSize = 10.sp,
                        color = Gray500,
                    )
                    Text(
                        "${shipmentProgressPercent(shipment)}%",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        color = OrangePrimary,
                    )
                }
            }
        }
    }
}

private fun formatShortDate(isoDate: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.FRANCE)
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val clean = isoDate.replace("Z", "").take(19)
        val date = parser.parse(clean) ?: return isoDate.take(10)
        val out = SimpleDateFormat("d MMM yyyy", Locale.FRANCE)
        out.format(date)
    } catch (_: Exception) {
        isoDate.take(10)
    }
}
