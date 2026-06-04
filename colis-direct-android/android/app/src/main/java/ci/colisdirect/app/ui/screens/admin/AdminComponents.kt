package ci.colisdirect.app.ui.screens.admin

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
import ci.colisdirect.app.data.api.model.*
import ci.colisdirect.app.domain.AdminDisplayFormat
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.domain.RelayShipmentBuckets
import ci.colisdirect.app.ui.theme.*

@Composable
fun AdminDarkHeader(
    title: String,
    subtitle: String,
    badge: String? = null,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(NavyDark, Color(0xFF1E293B))))
            .statusBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 28.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(OrangePrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = Color.White,
                    )
                }
                Spacer(Modifier.width(8.dp))
                Text("COLISDIRECT", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color.White)
            }
            Spacer(Modifier.height(6.dp))
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color.White)
            Text(subtitle, fontSize = 13.sp, color = Color.White.copy(alpha = 0.7f))
            badge?.let { Text(it, fontSize = 11.sp, color = OrangeLight) }
        }
    }
}

@Composable
fun AdminMetricCard(
    label: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
    trend: String? = null,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(if (highlight) OrangeLight else Color.White),
        elevation = CardDefaults.cardElevation(3.dp),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(20.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Gray900, maxLines = 2)
            Text(label, fontSize = 10.sp, color = Gray500)
            trend?.let { Text(it, fontSize = 10.sp, color = if (it.startsWith("+")) SuccessGreen else Gray600) }
        }
    }
}

@Composable
fun AdminInfoSection(title: String, icon: ImageVector, content: @Composable ColumnScope.() -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            content()
        }
    }
}

@Composable
fun AdminDetailRow(label: String, value: String, highlight: Boolean = false) {
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
fun AdminKeyValueRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = Gray600)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Gray900)
    }
}

@Composable
fun AdminShipmentCard(shipment: ShipmentDto, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val status = RelayShipmentBuckets.statusOf(shipment)
    Card(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    shipment.shipmentCode?.let {
                        Text("Envoi $it", fontSize = 11.sp, color = OrangePrimary, fontWeight = FontWeight.Bold)
                    }
                    Text(shipment.trackingNumber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Gray400)
            }
            Text(AdminDisplayFormat.statusLabel(status), fontSize = 12.sp, color = OrangePrimary, fontWeight = FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    Text("Exp.", fontSize = 10.sp, color = Gray500)
                    Text(
                        RelayDisplayFormat.personName(shipment.senderFirstName, shipment.senderLastName),
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text("Dest.", fontSize = 10.sp, color = Gray500)
                    Text(
                        RelayDisplayFormat.personName(shipment.recipientFirstName, shipment.recipientLastName),
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(RelayDisplayFormat.formatFcfa(RelayDisplayFormat.shipmentTotal(shipment)), fontWeight = FontWeight.Bold)
                Text(RelayDisplayFormat.formatDate(shipment.createdAt), fontSize = 11.sp, color = Gray500)
            }
        }
    }
}

@Composable
fun AdminUserCard(user: UserDto, modifier: Modifier = Modifier) {
    Card(modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(Gray50)) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(OrangeLight), contentAlignment = Alignment.Center) {
                Text(
                    (user.firstName.firstOrNull() ?: '?').uppercase(),
                    fontWeight = FontWeight.Bold,
                    color = OrangePrimary,
                )
            }
            Column(Modifier.weight(1f)) {
                Text("${user.firstName} ${user.lastName}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(user.email, fontSize = 12.sp, color = Gray600, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(AdminDisplayFormat.roleLabel(user.role), fontSize = 11.sp, color = OrangePrimary)
            }
        }
    }
}

@Composable
fun AdminTicketCard(ticket: SupportTicketDto, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Color.White),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(ticket.subject ?: "Sans objet", fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                AssistChip(
                    onClick = {},
                    label = { Text(AdminDisplayFormat.ticketStatusLabel(ticket.status), fontSize = 11.sp) },
                    enabled = false,
                )
                ticket.priority?.let {
                    AssistChip(
                        onClick = {},
                        label = { Text(AdminDisplayFormat.priorityLabel(it), fontSize = 11.sp) },
                        enabled = false,
                    )
                }
            }
            ticket.customerName?.let { Text(it, fontSize = 12.sp, color = Gray600) }
            Text(AdminDisplayFormat.formatDateTime(ticket.updatedAt ?: ticket.createdAt), fontSize = 11.sp, color = Gray500)
        }
    }
}

@Composable
fun AdminProfileMenuRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    danger: Boolean = false,
    badge: Int? = null,
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
        if (badge != null && badge > 0) {
            Badge { Text("$badge") }
        }
        if (!danger) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Gray400)
        }
    }
    HorizontalDivider(color = Gray300)
}

@Composable
fun rememberAdminUriHandler(): (String) -> Unit {
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

@Composable
fun AdminModuleTile(label: String, icon: ImageVector, count: Int? = null, onClick: () -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(Color.White),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(icon, null, tint = OrangePrimary)
            Text(label, Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
            if (count != null && count > 0) {
                Badge { Text("$count") }
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Gray400)
        }
    }
}

/** Barre support — 3 onglets métier + profil (`CustomerSupportDashboard`). */
@Composable
fun SupportBottomBar(selected: Int, relayCashBadge: Int, onSelect: (Int) -> Unit) {
    NavigationBar(containerColor = Color.White, tonalElevation = 8.dp) {
        NavigationBarItem(selected = selected == 0, onClick = { onSelect(0) }, icon = { Icon(Icons.Default.Dashboard, null) }, label = { Text("Vue", fontSize = 9.sp) })
        NavigationBarItem(selected = selected == 1, onClick = { onSelect(1) }, icon = { Icon(Icons.Default.SupportAgent, null) }, label = { Text("Tickets", fontSize = 9.sp) })
        NavigationBarItem(
            selected = selected == 2,
            onClick = { onSelect(2) },
            icon = {
                BadgedBox(
                    badge = {
                        if (relayCashBadge > 0) Badge { Text("$relayCashBadge") }
                    },
                ) { Icon(Icons.Default.Store, null) }
            },
            label = { Text("Paiements PR", fontSize = 9.sp) },
        )
        NavigationBarItem(selected = selected == 3, onClick = { onSelect(3) }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Profil", fontSize = 9.sp) })
    }
}

@Composable
fun AdminBottomBar(selected: Int, isAdmin: Boolean, onSelect: (Int) -> Unit) {
    NavigationBar(containerColor = Color.White, tonalElevation = 8.dp) {
        NavigationBarItem(selected = selected == 0, onClick = { onSelect(0) }, icon = { Icon(Icons.Default.Dashboard, null) }, label = { Text("Accueil", fontSize = 10.sp) })
        if (isAdmin) {
            NavigationBarItem(selected = selected == 1, onClick = { onSelect(1) }, icon = { Icon(Icons.Default.LocalShipping, null) }, label = { Text("Envois", fontSize = 10.sp) })
            NavigationBarItem(selected = selected == 2, onClick = { onSelect(2) }, icon = { Icon(Icons.Default.AccountTree, null) }, label = { Text("Réseau", fontSize = 10.sp) })
            NavigationBarItem(selected = selected == 3, onClick = { onSelect(3) }, icon = { Icon(Icons.Default.SupportAgent, null) }, label = { Text("Support", fontSize = 10.sp) })
            NavigationBarItem(selected = selected == 4, onClick = { onSelect(4) }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Profil", fontSize = 10.sp) })
        } else {
            NavigationBarItem(selected = selected == 1, onClick = { onSelect(1) }, icon = { Icon(Icons.Default.SupportAgent, null) }, label = { Text("Tickets", fontSize = 10.sp) })
            NavigationBarItem(selected = selected == 2, onClick = { onSelect(2) }, icon = { Icon(Icons.Default.Person, null) }, label = { Text("Profil", fontSize = 10.sp) })
        }
    }
}
