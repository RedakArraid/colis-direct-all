package ci.colisdirect.app.ui.screens.client

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.domain.ShipmentPayment.canSwitchToRelayCashPayment
import ci.colisdirect.app.domain.ShipmentPayment.needsOnlinePayment
import ci.colisdirect.app.domain.ShipmentPayment.paymentRouteLabel
import ci.colisdirect.app.domain.ShipmentPayment.paymentStatusLabel
import ci.colisdirect.app.domain.ShipmentPayment.totalAmountFcfa
import ci.colisdirect.app.domain.formatFcfa
import ci.colisdirect.app.ui.components.ShipmentProgressBar
import ci.colisdirect.app.ui.components.StatusBadge
import ci.colisdirect.app.ui.components.formatPriceFcfa
import ci.colisdirect.app.ui.components.isTerminalShipmentStatus
import ci.colisdirect.app.ui.components.statusLabel
import ci.colisdirect.app.ui.theme.Gray700
import ci.colisdirect.app.ui.theme.OrangePrimary
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShipmentDetailScreen(
    shipmentId: String,
    onBack: () -> Unit,
    onCancelled: () -> Unit = onBack,
    onPayOnline: (trackingNumber: String, amountFcfa: Int, routeLabel: String) -> Unit = { _, _, _ -> },
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showCancelDialog by remember { mutableStateOf(false) }

    LaunchedEffect(shipmentId) { viewModel.loadShipmentDetail(shipmentId) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, shipmentId) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.loadShipmentDetail(shipmentId)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val shipment = state.selectedShipment

    LaunchedEffect(shipment?.trackingNumber) {
        shipment?.trackingNumber?.let { viewModel.loadTrackingEvents(it) }
    }

    LaunchedEffect(state.successMessage) {
        if (state.successMessage != null) {
            viewModel.loadShipmentDetail(shipmentId)
            viewModel.clearMessages()
        }
    }

    if (showCancelDialog && shipment != null) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Annuler la commande ?") },
            text = {
                Text(
                    "Le colis ${shipment.shipmentCode ?: shipment.trackingNumber} vers ${shipment.recipientCommune} sera annulé. Action irréversible.",
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCancelDialog = false
                        viewModel.cancelShipment(shipment.trackingNumber)
                        onCancelled()
                    },
                ) { Text("Oui, annuler", color = Color(0xFFDC2626)) }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) { Text("Garder") }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(shipment?.shipmentCode?.let { "Colis $it" } ?: "Détail du colis")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
                actions = {
                    shipment?.trackingNumber?.let { tn ->
                        IconButton(
                            onClick = {
                                val send = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, "Suivez mon colis ColisDirect : $tn")
                                }
                                context.startActivity(Intent.createChooser(send, "Partager"))
                            },
                        ) {
                            Icon(Icons.Default.Share, "Partager")
                        }
                    }
                },
            )
        }
    ) { padding ->
        when {
            state.isLoading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            shipment == null -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text("Colis introuvable", color = MaterialTheme.colorScheme.error)
                }
            }
            else -> {
                val status = (shipment.effectiveStatus ?: shipment.currentStatus ?: "").uppercase()
                val canCancel = !isTerminalShipmentStatus(status) && status != "CANCELLED" && status != "RETURN_TO_SENDER"
                val awaitingPay = shipment.needsOnlinePayment()
                val payAmount = shipment.totalAmountFcfa()

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text("Numéro de suivi", style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        shipment.trackingNumber,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                StatusBadge(status = status)
                            }

                            if (status == "AVAILABLE_FOR_PICKUP" && shipment.pickupCode != null) {
                                HorizontalDivider()
                                Text("Code de retrait", style = MaterialTheme.typography.labelSmall)
                                Text(
                                    shipment.pickupCode,
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = OrangePrimary,
                                )
                            }
                        }
                    }

                    ShipmentProgressBar(
                        shipment = shipment,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    )

                    if (awaitingPay && payAmount > 0) {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        ) {
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.Default.Warning, null, tint = Color(0xFFD97706))
                                    Text(
                                        "Paiement en attente",
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFB45309),
                                    )
                                }
                                Text(
                                    "Finalisez votre paiement en ligne pour activer l'envoi (${paymentStatusLabel(shipment)}).",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Gray700,
                                )
                                Text(
                                    "Montant : ${formatFcfa(payAmount)}",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = MaterialTheme.typography.titleMedium.fontSize,
                                    color = OrangePrimary,
                                )
                                Button(
                                    onClick = {
                                        onPayOnline(
                                            shipment.trackingNumber,
                                            payAmount,
                                            shipment.paymentRouteLabel(),
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                                ) {
                                    Icon(Icons.Default.CreditCard, null, Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        if (status == "PAYMENT_REJECTED") "Réessayer le paiement" else "Payer en ligne",
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                if (shipment.canSwitchToRelayCashPayment()) {
                                    OutlinedButton(
                                        onClick = { viewModel.switchToRelayPayment(shipment.trackingNumber) },
                                        modifier = Modifier.fillMaxWidth(),
                                        enabled = !state.isLoading,
                                    ) {
                                        Text("Payer au point relais à la place", fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }

                    state.tracking?.events?.takeIf { it.isNotEmpty() }?.let { events ->
                        DetailSection(title = "Historique") {
                            events.forEach { event ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(
                                        Icons.Default.Circle,
                                        contentDescription = null,
                                        tint = OrangePrimary,
                                        modifier = Modifier.size(10.dp).padding(top = 4.dp),
                                    )
                                    Column {
                                        Text(
                                            statusLabel(event.status),
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        event.location?.let {
                                            Text(it, style = MaterialTheme.typography.bodySmall)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    DetailSection(title = "Expéditeur") {
                        InfoRow(Icons.Default.Person, "${shipment.senderFirstName} ${shipment.senderLastName}")
                        InfoRow(Icons.Default.Phone, shipment.senderPhone ?: "—")
                        InfoRow(Icons.Default.LocationOn, "${shipment.senderCommune ?: ""} ${shipment.senderAddress ?: ""}".trim())
                    }

                    DetailSection(title = "Destinataire") {
                        InfoRow(Icons.Default.Person, "${shipment.recipientFirstName} ${shipment.recipientLastName}")
                        InfoRow(Icons.Default.Phone, shipment.recipientPhone ?: "—")
                        InfoRow(Icons.Default.LocationOn, "${shipment.recipientCommune ?: ""} ${shipment.recipientAddress ?: ""}".trim())
                    }

                    DetailSection(title = "Colis") {
                        InfoRow(Icons.Default.Inventory2, "Type : ${shipment.packageType ?: "—"}")
                        InfoRow(Icons.Default.Scale, "Poids : ${shipment.weight ?: 0} kg")
                        shipment.price?.let {
                            InfoRow(Icons.Default.Payments, "Prix : ${formatPriceFcfa(it)}")
                        }
                    }

                    if (canCancel) {
                        Button(
                            onClick = { showCancelDialog = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFEF2F2),
                                contentColor = Color(0xFFDC2626),
                            ),
                        ) {
                            Icon(Icons.Default.Cancel, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Annuler la commande", fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun DetailSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            content()
        }
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    if (text.isBlank() || text == "null null") return
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium)
    }
}
