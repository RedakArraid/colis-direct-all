package ci.colisdirect.app.ui.screens.transporter

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.ShipmentCard
import ci.colisdirect.app.viewmodel.TransporterViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransporterDashboard(
    onPickupScan: () -> Unit,
    onHomePickup: () -> Unit,
    onLogout: () -> Unit,
    viewModel: TransporterViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    LaunchedEffect(Unit) {
        viewModel.loadAssignments()
        viewModel.loadDeliveredShipments()
    }

    // Success snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Tournée", fontWeight = FontWeight.Bold)
                        Text(
                            "${state.assignments.size} colis assigné(s)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, "Déconnexion")
                    }
                },
            )
        },
        floatingActionButton = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SmallFloatingActionButton(
                    onClick = onHomePickup,
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                ) {
                    Icon(Icons.Default.Home, "Ramassage domicile")
                }
                FloatingActionButton(
                    onClick = onPickupScan,
                    containerColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(Icons.Default.QrCodeScanner, "Scanner un colis")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = { viewModel.loadAssignments() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (state.isLoading && state.assignments.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (state.assignments.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                    )
                    Text("Aucun colis en cours", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Utilisez le scanner pour collecter un colis",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(
                        start = 16.dp, end = 16.dp, top = 8.dp, bottom = 100.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Active assignments
                    item {
                        Text(
                            "Colis en cours",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    items(state.assignments, key = { it.id }) { shipment ->
                        ShipmentCard(
                            shipment = shipment,
                            onClick = { },
                        )
                    }

                    // Delivered
                    if (state.deliveredShipments.isNotEmpty()) {
                        item {
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Livraisons effectuées",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        items(state.deliveredShipments.take(5), key = { "d_${it.id}" }) { shipment ->
                            ShipmentCard(shipment = shipment, onClick = { })
                        }
                    }
                }
            }
        }
    }
}
