package ci.colisdirect.app.ui.screens.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Intent
import android.net.Uri
import ci.colisdirect.app.ui.theme.*

@Composable
fun CourierRouteDots(modifier: Modifier = Modifier, tall: Boolean = false) {
    Column(
        modifier = modifier.padding(top = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(SuccessGreen))
        Box(
            Modifier
                .width(2.dp)
                .height(if (tall) 32.dp else 24.dp)
                .background(Gray300),
        )
        Box(Modifier.size(9.dp).clip(CircleShape).background(OrangePrimary))
    }
}

@Composable
fun CourierMapPlaceholder(modifier: Modifier = Modifier, route: Boolean = true) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(0.dp))
            .background(Brush.linearGradient(listOf(Color(0xFFE8F0E8), Color(0xFFDDEBDD)))),
        contentAlignment = Alignment.Center,
    ) {
        if (route) {
            Text("Itinéraire", color = Gray600, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun CourierStatCard(
    icon: ImageVector,
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(Gray50),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                Modifier
                    .size(30.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(OrangeLight),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(16.dp))
            }
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Gray900)
            Text(label, fontSize = 11.sp, color = Gray500, lineHeight = 14.sp)
        }
    }
}

@Composable
fun CourierPill(text: String, bg: Color = OrangeLight, color: Color = OrangePrimary) {
    Text(
        text,
        modifier = Modifier
            .background(bg, RoundedCornerShape(999.dp))
            .padding(horizontal = 9.dp, vertical = 3.dp),
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = color,
    )
}

@Composable
fun CourierOfferCard(
    from: String,
    to: String,
    packageLabel: String,
    priceFcfa: String,
    tag: String? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    footer: (@Composable RowScope.() -> Unit)? = null,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, Gray300),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                    CourierRouteDots()
                    Column {
                        Text(from, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
                        Text(packageLabel, fontSize = 11.sp, color = Gray500, modifier = Modifier.padding(vertical = 4.dp))
                        Text(to, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    tag?.let { CourierPill(it) }
                    Spacer(Modifier.height(4.dp))
                    Text(priceFcfa, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = OrangePrimary)
                    Text("FCFA", fontSize = 11.sp, color = Gray500)
                }
            }
            footer?.let {
                HorizontalDivider(color = Gray300)
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    content = it,
                )
            }
        }
    }
}

@Composable
fun CourierFilterChips(
    filters: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        filters.forEachIndexed { i, label ->
            val sel = i == selectedIndex
            Text(
                label,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (sel) OrangePrimary else Gray50)
                    .clickable { onSelect(i) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                color = if (sel) Color.White else Gray700,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
fun CourierDarkHeader(
    initials: String,
    greeting: String,
    name: String,
    isOnline: Boolean,
    onToggleOnline: (Boolean) -> Unit,
    onBellClick: (() -> Unit)? = null,
    showBellBadge: Boolean = false,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(NavyDark)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 20.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(OrangePrimary, Color(0xFFFF8C33)))),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initials, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                }
                Column {
                    Text(greeting, fontSize = 12.sp, color = Color.White.copy(alpha = 0.5f), fontWeight = FontWeight.SemiBold)
                    Text(name, fontSize = 18.sp, color = Color.White, fontWeight = FontWeight.ExtraBold)
                }
            }
            if (onBellClick != null) {
                Box(contentAlignment = Alignment.TopEnd) {
                    IconButton(onClick = onBellClick) {
                        Icon(Icons.Default.Notifications, null, tint = Color.White)
                    }
                    if (showBellBadge) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(OrangePrimary)
                                .align(Alignment.TopEnd),
                        )
                    }
                }
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 18.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White.copy(alpha = 0.06f))
                .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp))
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (isOnline) SuccessGreen else Gray500),
                )
                Column {
                    Text(
                        if (isOnline) "En ligne" else "Hors ligne",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                    Text(
                        if (isOnline) "Vous recevez les nouvelles courses" else "Passez en ligne pour recevoir des offres",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 11.sp,
                    )
                }
            }
            Switch(
                checked = isOnline,
                onCheckedChange = onToggleOnline,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = OrangePrimary,
                ),
            )
        }
    }
}

@Composable
fun CourierRouteSection(
    pickupLabel: String,
    pickupTitle: String,
    pickupSub: String,
    deliveryLabel: String,
    deliveryTitle: String,
    deliverySub: String,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = 6.dp)) {
            Box(Modifier.size(11.dp).clip(CircleShape).background(SuccessGreen))
            Box(Modifier.width(2.dp).height(48.dp).background(Gray300))
            Box(Modifier.size(11.dp).clip(CircleShape).background(OrangePrimary))
        }
        Column(Modifier.weight(1f)) {
            Text(pickupLabel, fontSize = 10.sp, color = Gray500, fontWeight = FontWeight.Bold)
            Text(pickupTitle, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(pickupSub, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(bottom = 16.dp))
            Text(deliveryLabel, fontSize = 10.sp, color = Gray500, fontWeight = FontWeight.Bold)
            Text(deliveryTitle, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(deliverySub, fontSize = 12.sp, color = Gray500)
        }
    }
}

@Composable
fun CourierMetaRow(items: List<Pair<String, String>>) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Gray50)
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items.forEach { (label, value) ->
            Column(Modifier.weight(1f)) {
                Text(label, fontSize = 11.sp, color = Gray500)
                Text(value, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
fun CourierProfileMenuRow(
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
fun rememberCourierProfileUriHandler(): (String) -> Unit {
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
