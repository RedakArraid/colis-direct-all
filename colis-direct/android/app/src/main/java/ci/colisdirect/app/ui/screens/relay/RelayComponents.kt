package ci.colisdirect.app.ui.screens.relay

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.ui.platform.LocalContext
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.data.api.model.RelayFinancialPeriodDto
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.data.api.model.RelayStatsDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.domain.RelayShipmentBuckets
import ci.colisdirect.app.ui.theme.*

@Composable
fun RelayDarkHeader(
    title: String,
    subtitle: String,
    relayName: String? = null,
    relayCode: String? = null,
    footer: String? = null,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(NavyDark, Color(0xFF1E293B))))
            .statusBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 32.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(30.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(OrangePrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Store, null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(8.dp))
                Text("COLISDIRECT", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color.White)
            }
            Spacer(Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color.White)
            Text(subtitle, fontSize = 13.sp, color = Color.White.copy(alpha = 0.7f))
            if (!relayName.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(relayName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = OrangeLight)
            }
            if (!relayCode.isNullOrBlank()) {
                Text("Code relais : $relayCode", fontSize = 12.sp, color = Color.White.copy(alpha = 0.85f))
            }
            if (!footer.isNullOrBlank()) {
                Text(footer, fontSize = 11.sp, color = Color.White.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
fun RelayMetricCard(
    label: String,
    count: Int,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
    subtitle: String? = null,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = if (highlight) OrangeLight else Color.White),
        elevation = CardDefaults.cardElevation(3.dp),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, null, modifier = Modifier.size(20.dp), tint = OrangePrimary)
            Text(
                count.toString(),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 22.sp,
                color = if (highlight) OrangePrimary else Gray900,
            )
            Text(label, fontWeight = FontWeight.Medium, fontSize = 10.sp, color = Gray500, maxLines = 2)
            subtitle?.let { Text(it, fontSize = 9.sp, color = Gray400, maxLines = 1) }
        }
    }
}

@Composable
fun RelayRevenueMetricCard(
    label: String,
    amount: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(3.dp),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(icon, null, tint = Color(0xFF7C3AED), modifier = Modifier.size(20.dp))
            Text(amount, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Gray900, maxLines = 2)
            Text(label, fontSize = 10.sp, color = Gray500)
        }
    }
}

@Composable
fun RelayAlertBanner(
    title: String,
    message: String,
    onAction: () -> Unit,
    actionLabel: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color(0xFFFFF7ED)),
        border = androidx.compose.foundation.BorderStroke(2.dp, OrangePrimary),
    ) {
        Row(
            Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(40.dp).clip(CircleShape).background(OrangePrimary),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Inventory2, null, tint = Color.White)
            }
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, color = Gray900, fontSize = 14.sp)
                Text(message, fontSize = 12.sp, color = Gray600)
            }
            FilledTonalButton(onClick = onAction, colors = ButtonDefaults.filledTonalButtonColors(OrangePrimary)) {
                Text(actionLabel, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun RelayQuickAction(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier.size(44.dp).clip(CircleShape).background(OrangeLight),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(22.dp))
            }
            Text(label, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Gray900, maxLines = 2)
        }
    }
}

@Composable
fun RelayStatusBadge(status: String, modifier: Modifier = Modifier) {
    val label = RelayDisplayFormat.statusLabel(status)
    val bg = when (status.uppercase()) {
        "AVAILABLE_FOR_PICKUP", "DELIVERED", "PICKED_UP_BY_CUSTOMER", "DELIVERED_TO_CUSTOMER" -> SuccessLight
        "CANCELLED", "PAYMENT_REJECTED", "RETURN_TO_SENDER" -> Color(0xFFFEE2E2)
        "IN_TRANSIT", "CARRIER_COLLECTED" -> Color(0xFFDBEAFE)
        else -> OrangeLight
    }
    val fg = when (status.uppercase()) {
        "AVAILABLE_FOR_PICKUP", "DELIVERED", "PICKED_UP_BY_CUSTOMER" -> SuccessGreen
        "CANCELLED", "PAYMENT_REJECTED" -> Color(0xFFB91C1C)
        "IN_TRANSIT" -> Color(0xFF1D4ED8)
        else -> OrangePrimary
    }
    Surface(modifier, shape = RoundedCornerShape(20.dp), color = bg) {
        Text(label, Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = fg)
    }
}

@Composable
fun RelayPaymentBadge(paymentStatus: String?) {
    val label = RelayDisplayFormat.paymentStatusLabel(paymentStatus)
    val paid = paymentStatus?.lowercase() == "paid"
    Surface(shape = RoundedCornerShape(20.dp), color = if (paid) SuccessLight else Color(0xFFFFF3CD)) {
        Text(
            label,
            Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (paid) SuccessGreen else Color(0xFF92400E),
        )
    }
}

@Composable
fun RelayShipmentListCard(
    shipment: ShipmentDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    RelayRichShipmentCard(shipment = shipment, onClick = onClick, modifier = modifier, compact = true)
}

@Composable
fun RelayRichShipmentCard(
    shipment: ShipmentDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val status = RelayShipmentBuckets.statusOf(shipment)
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    shipment.shipmentCode?.let {
                        Text("N° envoi $it", fontSize = 11.sp, color = OrangePrimary, fontWeight = FontWeight.Bold)
                    }
                    Text(shipment.trackingNumber, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
                    if (!compact) {
                        Text(
                            RelayDisplayFormat.deliveryModeLabel(shipment),
                            fontSize = 11.sp,
                            color = Gray500,
                        )
                    }
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Gray400)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                RelayStatusBadge(status)
                RelayPaymentBadge(shipment.paymentStatus)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Expéditeur", fontSize = 10.sp, color = Gray500)
                    Text(
                        RelayDisplayFormat.personName(shipment.senderFirstName, shipment.senderLastName),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!compact && !shipment.senderPhone.isNullOrBlank()) {
                        Text(shipment.senderPhone!!, fontSize = 11.sp, color = Gray600)
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text("Destinataire", fontSize = 10.sp, color = Gray500)
                    Text(
                        RelayDisplayFormat.personName(shipment.recipientFirstName, shipment.recipientLastName),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!compact && !shipment.recipientPhone.isNullOrBlank()) {
                        Text(shipment.recipientPhone!!, fontSize = 11.sp, color = Gray600)
                    }
                }
            }
            if (!compact) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("Type", fontSize = 10.sp, color = Gray500)
                        Text(RelayDisplayFormat.packageTypeLabel(shipment.packageType), fontSize = 12.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Montant", fontSize = 10.sp, color = Gray500)
                        Text(
                            RelayDisplayFormat.formatFcfa(RelayDisplayFormat.shipmentTotal(shipment)),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Créé", fontSize = 10.sp, color = Gray500)
                        Text(RelayDisplayFormat.formatDate(shipment.createdAt), fontSize = 12.sp)
                    }
                }
                val dest = RelayDisplayFormat.relayLabel(shipment, origin = false)
                if (dest != "—") {
                    Text("→ $dest", fontSize = 11.sp, color = Gray600, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(RelayDisplayFormat.formatFcfa(RelayDisplayFormat.shipmentTotal(shipment)), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(RelayDisplayFormat.formatDate(shipment.createdAt), fontSize = 11.sp, color = Gray500)
                }
            }
            if (shipment.relayAssisted == true) {
                Text("Assistance relais", fontSize = 10.sp, color = OrangePrimary, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun RelaySectionHeader(title: String, count: Int, icon: ImageVector) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(17.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
        }
        Box(Modifier.clip(RoundedCornerShape(20.dp)).background(OrangeLight).padding(horizontal = 8.dp, vertical = 3.dp)) {
            Text(count.toString(), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = OrangePrimary)
        }
    }
}

@Composable
fun RelayInfoSection(title: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
            }
            content()
        }
    }
}

@Composable
fun RelayDetailRow(label: String, value: String, highlight: Boolean = false) {
    if (value.isBlank() || value == "—") return
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, fontSize = 11.sp, color = Gray500)
        Text(
            value,
            fontWeight = if (highlight) FontWeight.Bold else FontWeight.Medium,
            fontSize = if (highlight) 15.sp else 13.sp,
            color = if (highlight) OrangePrimary else Gray900,
        )
    }
}

@Composable
fun RelayFinanceCard(
    title: String,
    amount: String,
    lines: List<Pair<String, String>> = emptyList(),
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold, color = Gray600, fontSize = 13.sp)
            Text(amount, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = Gray900)
            lines.forEach { (k, v) ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(k, fontSize = 12.sp, color = Gray500)
                    Text(v, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Gray800)
                }
            }
        }
    }
}

@Composable
fun RelayPaymentBreakdownList(period: RelayFinancialPeriodDto?, modifier: Modifier = Modifier) {
    val rows = RelayDisplayFormat.paymentBreakdown(period)
    Card(modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Détail des paiements", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            if (rows.isEmpty()) {
                Text("Aucun paiement enregistré pour cette période.", fontSize = 13.sp, color = Gray500)
            } else {
                rows.forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            if (row.count > 0) "${row.label} (${row.count})" else row.label,
                            fontSize = 13.sp,
                            color = Gray600,
                        )
                        Text(RelayDisplayFormat.formatFcfa(row.amount), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                    HorizontalDivider(color = Gray200)
                }
            }
        }
    }
}

@Composable
fun RelayPeriodStatsGrid(period: RelayFinancialPeriodDto?, title: String) {
    if (period == null) return
    RelaySectionHeader(title, period.shipments, Icons.Default.Analytics)
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        RelayFinanceCard(
            title = "Revenus",
            amount = RelayDisplayFormat.formatFcfa(period.revenue),
            lines = listOf(
                "Colis" to "${period.shipments}",
                "Payés" to "${period.shipmentsPaid}",
                "Commissions" to RelayDisplayFormat.formatFcfa(period.commissions),
            ),
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            RelayFinanceCard(
                title = "Assistance",
                amount = RelayDisplayFormat.formatFcfa(period.assistanceRevenue),
                lines = listOf("Colis assistés" to "${period.assistedCount}"),
                modifier = Modifier.weight(1f),
            )
            RelayFinanceCard(
                title = "Impression",
                amount = RelayDisplayFormat.formatFcfa(period.printingRevenue),
                modifier = Modifier.weight(1f),
            )
        }
        RelayPaymentBreakdownList(period)
    }
}

@Composable
fun RelayProfileMenuRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    danger: Boolean = false,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, null, tint = if (danger) ErrorRed else Gray700, modifier = Modifier.size(20.dp))
        Text(
            label,
            Modifier.weight(1f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            color = if (danger) ErrorRed else Gray900,
        )
        if (!danger) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Gray400)
        }
    }
    HorizontalDivider(color = Gray300)
}

@Composable
fun RelayProfileInfoCard(
    relay: RelayPointDto?,
    userEmail: String?,
    userPhone: String?,
    userName: String,
    onDial: ((String) -> Unit)? = null,
) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        RelayInfoSection("Compte partenaire", Icons.Default.Person) {
            RelayDetailRow("Nom", userName, highlight = true)
            userEmail?.let { email ->
                if (onDial != null) {
                    RelayClickableDetailRow("E-mail", email, Icons.Default.Email) { onDial("mailto:$email") }
                } else {
                    RelayDetailRow("E-mail", email)
                }
            }
            userPhone?.let { phone ->
                if (onDial != null) {
                    RelayClickableDetailRow("Téléphone compte", phone, Icons.Default.Phone) { onDial("tel:$phone") }
                } else {
                    RelayDetailRow("Téléphone compte", phone)
                }
            }
        }
        relay?.let { r ->
            RelayInfoSection("Point relais", Icons.Default.Store) {
                RelayDetailRow("Nom", r.name, highlight = true)
                r.relayCode?.let { RelayDetailRow("Code relais", it, highlight = true) }
                RelayDetailRow(
                    "Adresse",
                    RelayDisplayFormat.addressLine(r.commune, r.address, r.quartier),
                )
                r.phone?.let { phone ->
                    if (onDial != null) {
                        RelayClickableDetailRow("Téléphone relais", phone, Icons.Default.Phone) { onDial("tel:$phone") }
                    } else {
                        RelayDetailRow("Téléphone relais", phone)
                    }
                }
                r.hours?.let { RelayDetailRow("Horaires", it) }
                RelayDetailRow(
                    "Statut",
                    if (r.isActive != false) "Actif" else "Inactif",
                )
            }
        }
    }
}

@Composable
/** Onglets alignés sur `RelayDashboard.tsx` (overview → paiements → colis → assistance → settings). */
fun RelayBottomBar(
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(modifier = modifier, containerColor = Color.White, tonalElevation = 8.dp) {
        NavigationBarItem(selected = selected == 0, onClick = { onSelect(0) }, icon = { Icon(Icons.Default.Home, null) }, label = { Text("Vue", fontSize = 9.sp) })
        NavigationBarItem(selected = selected == 1, onClick = { onSelect(1) }, icon = { Icon(Icons.Default.AccountBalance, null) }, label = { Text("Paiements", fontSize = 9.sp) })
        NavigationBarItem(selected = selected == 2, onClick = { onSelect(2) }, icon = { Icon(Icons.Default.Inventory2, null) }, label = { Text("Colis", fontSize = 9.sp) })
        NavigationBarItem(selected = selected == 3, onClick = { onSelect(3) }, icon = { Icon(Icons.Default.SupportAgent, null) }, label = { Text("Assistance", fontSize = 9.sp) })
        NavigationBarItem(selected = selected == 4, onClick = { onSelect(4) }, icon = { Icon(Icons.Default.Settings, null) }, label = { Text("Paramètres", fontSize = 9.sp) })
    }
}

@Composable
private fun RelayClickableDetailRow(
    label: String,
    value: String,
    icon: ImageVector,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 11.sp, color = Gray500)
            Text(value, fontWeight = FontWeight.Medium, fontSize = 13.sp, color = OrangePrimary)
        }
        Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
    }
}

/** Ouvre tel:, mailto: ou https: depuis le profil relais. */
@Composable
fun rememberRelayProfileUriHandler(): (String) -> Unit {
    val context = LocalContext.current
    return { uri ->
        runCatching {
            val intent = when {
                uri.startsWith("tel:") -> Intent(Intent.ACTION_DIAL, Uri.parse(uri))
                uri.startsWith("mailto:") -> Intent(Intent.ACTION_SENDTO, Uri.parse(uri))
                else -> Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            }
            context.startActivity(intent)
        }
    }
}
