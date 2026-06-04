package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.components.formatPriceFcfa
import ci.colisdirect.app.ui.components.formatShipmentDate
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentHistoryScreen(
    onBack: () -> Unit,
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadShipments() }

    val paidShipments = remember(state.shipments) {
        state.shipments.filter { it.paymentStatus?.lowercase() == "paid" }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Historique paiements", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = OrangePrimary)
                }
            }
            paidShipments.isEmpty() -> {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Aucun paiement effectué.", color = Gray500, fontSize = 13.sp)
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(paidShipments, key = { it.id }) { shipment ->
                        PaymentRow(shipment)
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentRow(shipment: ShipmentDto) {
    val methodLabel = when (shipment.paymentMethod?.lowercase()) {
        "paystack" -> "Mobile Money / Carte"
        "relay_cash" -> "Paiement au relais"
        else -> shipment.paymentMethod ?: "—"
    }
    val code = shipment.shipmentCode ?: shipment.trackingNumber.takeLast(6).uppercase()

    Card(shape = RoundedCornerShape(14.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(40.dp),
                contentAlignment = Alignment.Center,
            ) {
                Surface(
                    color = Color(0xFFE6F6EC),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {}
                Icon(Icons.Default.CreditCard, null, tint = Color(0xFF16A34A), modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("Colis $code", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(methodLabel, fontSize = 11.sp, color = Gray500)
                Text(
                    formatShipmentDate(shipment.createdAt),
                    fontSize = 11.sp,
                    color = Gray500,
                )
            }
            Text(
                formatPriceFcfa(shipment.price),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                color = Color(0xFF16A34A),
            )
        }
    }
}
