package ci.colisdirect.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun ShipmentCard(
    shipment: ShipmentDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val status = shipment.effectiveStatus ?: shipment.currentStatus ?: "UNKNOWN"
    val createdAt = shipment.createdAt?.let { formatDate(it) } ?: ""
    val accentColor = StatusColors[status] ?: Gray300

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Left accent bar (colored per status)
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(
                        color = accentColor,
                        shape = RoundedCornerShape(topStart = 16.dp, bottomStart = 16.dp)
                    )
                    .defaultMinSize(minHeight = 80.dp)
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 14.dp, top = 14.dp, end = 12.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Header: tracking number + chevron
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Status dot
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(RoundedCornerShape(50))
                                .background(accentColor)
                        )
                        Text(
                            text = shipment.trackingNumber,
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            letterSpacing = 0.5.sp,
                            color = OrangePrimary,
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        StatusBadge(status = status)
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Gray500,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }

                // Route: sender commune → recipient commune
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Gray500,
                        modifier = Modifier.size(13.dp),
                    )
                    Text(
                        buildString {
                            append(shipment.senderCommune ?: "—")
                            append("  →  ")
                            append(shipment.recipientCommune ?: "—")
                        },
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Normal,
                        fontSize = 12.sp,
                        color = Gray500,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                // Recipient
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Gray500,
                        modifier = Modifier.size(13.dp),
                    )
                    Text(
                        "Pour : ${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""}".trim(),
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                        color = Gray900.copy(alpha = 0.8f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                // Footer: date + price
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        createdAt,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Normal,
                        fontSize = 11.sp,
                        color = Gray500,
                    )
                    if (shipment.price != null && shipment.price > 0) {
                        Text(
                            "${shipment.price.toInt().toString().reversed().chunked(3).joinToString(" ").reversed()} FCFA",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = OrangePrimary,
                        )
                    }
                }
            }
        }
    }
}

private fun formatDate(isoDate: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(isoDate) ?: return ""
        val formatter = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        formatter.format(date)
    } catch (e: Exception) {
        isoDate.take(10)
    }
}
