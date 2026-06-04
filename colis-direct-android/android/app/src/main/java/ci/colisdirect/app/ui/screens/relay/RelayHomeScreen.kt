package ci.colisdirect.app.ui.screens.relay

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
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
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.RelayViewModel

@Composable
fun RelayHomeScreen(
    onIntakeScanClick: () -> Unit,
    onDeliveryConfirmClick: () -> Unit,
    onNavigateToTab: (Int) -> Unit,
    viewModel: RelayViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val stats = state.stats

    LaunchedEffect(Unit) {
        viewModel.loadDashboard()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
            .verticalScroll(rememberScrollState())
    ) {
        // ── NAVBAR HEADER ────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(colors = listOf(NavyDark, Color(0xFF1E293B)))
                )
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
                        Icon(
                            Icons.Default.Store,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "COLISDIRECT",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        letterSpacing = (-0.3).sp,
                        color = Color.White,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "Espace Point Relais",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 24.sp,
                    letterSpacing = (-0.4).sp,
                    color = Color.White,
                )
                Text(
                    "Gérez l'inventaire et les livraisons",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Normal,
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.7f),
                )
            }
        }

        // ── METRIC CARDS ─────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (-20).dp)
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            RelayMetricCard(
                label = "À recevoir",
                count = stats?.pendingPickups ?: state.pendingIntake.size,
                icon = Icons.Default.Inbox,
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTab(1) } // Mes Colis tab is index 1
            )
            RelayMetricCard(
                label = "En relais",
                count = state.inRelay.size,
                icon = Icons.Default.Store,
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTab(1) }
            )
            RelayMetricCard(
                label = "À livrer",
                count = stats?.pendingDeliveries ?: state.awaitingPickup.size,
                icon = Icons.Default.PersonPin,
                highlight = state.awaitingPickup.isNotEmpty(),
                modifier = Modifier.weight(1f),
                onClick = { onNavigateToTab(1) }
            )
        }

        if ((stats?.completedToday ?: 0) > 0 || (stats?.monthlyRevenue ?: 0.0) > 0) {
            Text(
                "${stats?.completedToday ?: 0} colis traités aujourd'hui",
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                fontSize = 13.sp,
                color = Gray600,
            )
        }

        // ── QUICK ACTIONS ────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Opérations au guichet",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = Gray900
            )

            // Reception Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth().clickable(onClick = onIntakeScanClick)
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(OrangeLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Edit, null, tint = OrangePrimary)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Réceptionner un colis", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
                        Text("Saisir le n° de suivi à l'arrivée", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Gray300)
                }
            }

            // Delivery Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth().clickable(onClick = onDeliveryConfirmClick)
            ) {
                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(SuccessLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Handshake, null, tint = SuccessGreen)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Remise client", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
                        Text("Confirmer le retrait et le code de retrait", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Gray300)
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun RelayMetricCard(
    label: String,
    count: Int,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    highlight: Boolean = false,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (highlight) OrangeLight else Color.White,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, null, modifier = Modifier.size(20.dp), tint = OrangePrimary)
            Text(
                count.toString(),
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 22.sp,
                color = if (highlight) OrangePrimary else Gray900,
            )
            Text(
                label,
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 10.sp,
                color = Gray500,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
