package ci.colisdirect.app.ui.screens.relay

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
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
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.RelayViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RelayDashboard(
    onIntakeScan: () -> Unit,
    onDeliveryConfirm: () -> Unit,
    onLogout: () -> Unit,
    viewModel: RelayViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { viewModel.loadDashboard() }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        containerColor = Gray50,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = { viewModel.loadDashboard() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                // ── Header ───────────────────────────────────────────────────
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(NavyDark, Color(0xFF1E293B))
                                )
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
                                "Mon Point Relais",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 24.sp,
                                letterSpacing = (-0.4).sp,
                                color = Color.White,
                            )
                            Text(
                                "Gérez les réceptions et remises",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Normal,
                                fontSize = 13.sp,
                                color = Color.White.copy(alpha = 0.7f),
                            )
                        }
                    }
                }

                // ── Metric cards ─────────────────────────────────────────────
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .offset(y = (-20).dp)
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        RelayMetricCard(
                            label = "À recevoir",
                            count = state.stats?.pendingPickups ?: state.pendingIntake.size,
                            icon = Icons.Default.Inbox,
                            modifier = Modifier.weight(1f),
                            subtitle = "Réseau",
                        )
                        RelayMetricCard(
                            label = "En relais",
                            count = state.inRelay.size,
                            icon = Icons.Default.Store,
                            modifier = Modifier.weight(1f),
                        )
                        RelayMetricCard(
                            label = "À livrer",
                            count = state.stats?.pendingDeliveries ?: state.awaitingPickup.size,
                            icon = Icons.Default.LocalShipping,
                            highlight = (state.stats?.pendingDeliveries ?: state.awaitingPickup.size) > 0,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                item {
                    Text(
                        "${state.stats?.completedToday ?: 0} traités aujourd'hui · " +
                            RelayDisplayFormat.formatFcfa(state.stats?.monthlyRevenue ?: 0.0) + " ce mois",
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                        fontSize = 12.sp,
                        color = Gray600,
                    )
                }

                // ── Pending intake ───────────────────────────────────────────
                if (state.pendingIntake.isNotEmpty()) {
                    item {
                        RelaySectionHeader(
                            title = "Colis à réceptionner",
                            count = state.pendingIntake.size,
                            icon = Icons.Default.Inbox,
                        )
                    }
                    items(state.pendingIntake, key = { it.id }) { shipment ->
                        RelayRichShipmentCard(
                            shipment = shipment,
                            onClick = {},
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        )
                    }
                }

                // ── In relay ─────────────────────────────────────────────────
                if (state.inRelay.isNotEmpty()) {
                    item {
                        RelaySectionHeader(
                            title = "Colis en relais",
                            count = state.inRelay.size,
                            icon = Icons.Default.Store,
                        )
                    }
                    items(state.inRelay, key = { "r_${it.id}" }) { shipment ->
                        Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                            RelayActionCard(
                                shipment = shipment,
                                onMakeAvailable = {
                                    if (shipment.currentStatus == "RELAY_FINAL_RECEIVED") {
                                        viewModel.makeAvailable(shipment.trackingNumber)
                                    }
                                },
                            )
                        }
                    }
                }

                // ── Awaiting pickup ──────────────────────────────────────────
                if (state.awaitingPickup.isNotEmpty()) {
                    item {
                        RelaySectionHeader(
                            title = "Disponibles pour retrait",
                            count = state.awaitingPickup.size,
                            icon = Icons.Default.PersonPin,
                        )
                    }
                    items(state.awaitingPickup, key = { "p_${it.id}" }) { shipment ->
                        RelayRichShipmentCard(
                            shipment = shipment,
                            onClick = {},
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        )
                    }
                }

                // ── Empty state ───────────────────────────────────────────────
                if (state.pendingIntake.isEmpty() && state.inRelay.isEmpty() && state.awaitingPickup.isEmpty() && !state.isLoading) {
                    item {
                        Card(
                            modifier = Modifier
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                                .fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(2.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(72.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFE6F6EC)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        null,
                                        modifier = Modifier.size(38.dp),
                                        tint = SuccessGreen,
                                    )
                                }
                                Text(
                                    "Tout est à jour !",
                                    fontFamily = InterFontFamily,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 17.sp,
                                    color = Gray900,
                                )
                                Text(
                                    "Aucun colis en attente de traitement.",
                                    fontFamily = InterFontFamily,
                                    fontWeight = FontWeight.Normal,
                                    fontSize = 13.sp,
                                    color = Gray500,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Relay action card ────────────────────────────────────────────────────────
@Composable
private fun RelayActionCard(
    shipment: ci.colisdirect.app.data.api.model.ShipmentDto,
    onMakeAvailable: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    shipment.trackingNumber,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    letterSpacing = 0.5.sp,
                    color = OrangePrimary,
                )
                ci.colisdirect.app.ui.components.StatusBadge(status = shipment.currentStatus ?: "")
            }
            Text(
                "Pour : ${shipment.recipientFirstName} ${shipment.recipientLastName}",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                color = Gray900,
            )

            if (shipment.currentStatus == "RELAY_FINAL_RECEIVED") {
                Button(
                    onClick = onMakeAvailable,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                ) {
                    Icon(Icons.Default.NotificationAdd, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Mettre à disposition",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                    )
                }
            }
        }
    }
}
