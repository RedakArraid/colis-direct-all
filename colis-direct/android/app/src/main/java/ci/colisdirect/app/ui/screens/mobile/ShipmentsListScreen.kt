package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.domain.ShipmentPayment.needsOnlinePayment
import ci.colisdirect.app.domain.ShipmentPayment.paymentRouteLabel
import ci.colisdirect.app.domain.ShipmentPayment.totalAmountFcfa
import ci.colisdirect.app.domain.formatFcfa
import ci.colisdirect.app.ui.components.*
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShipmentsListScreen(
    onShipmentClick: (String) -> Unit,
    onCreateShipment: () -> Unit,
    onPayOnline: (trackingNumber: String, amountFcfa: Int, routeLabel: String) -> Unit = { _, _, _ -> },
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var activeChip by remember { mutableStateOf("all") }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadShipments() }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.loadShipments()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val terminalStatuses = setOf(
        "PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER", "CANCELLED", "RETURN_TO_SENDER",
    )
    val deliveredStatuses = setOf("PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER")

    val all = state.shipments
    val activeCount = all.count { s ->
        val st = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
        !terminalStatuses.contains(st)
    }
    val deliveredCount = all.count { s ->
        val st = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
        deliveredStatuses.contains(st)
    }
    val pendingPayCount = all.count { it.needsOnlinePayment() }

    val filtered = remember(all, activeChip, searchQuery) {
        var list = when (activeChip) {
            "active" -> all.filter { s ->
                val st = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
                !terminalStatuses.contains(st)
            }
            "delivered" -> all.filter { s ->
                val st = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
                deliveredStatuses.contains(st)
            }
            "pending_pay" -> all.filter { it.needsOnlinePayment() }
            else -> all
        }
        val q = searchQuery.trim().lowercase()
        if (q.isNotEmpty()) {
            list = list.filter { s ->
                s.trackingNumber.lowercase().contains(q) ||
                    (s.shipmentCode?.lowercase()?.contains(q) == true) ||
                    "${s.recipientFirstName} ${s.recipientLastName}".lowercase().contains(q) ||
                    (s.recipientCommune?.lowercase()?.contains(q) == true) ||
                    (s.senderCommune?.lowercase()?.contains(q) == true)
            }
        }
        list
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Mes colis",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = Gray900,
            )
            IconButton(
                onClick = onCreateShipment,
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(50)),
            ) {
                Icon(Icons.Default.Add, "Nouveau colis", tint = Gray900)
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ShipmentChip("Tous (${all.size})", activeChip == "all") { activeChip = "all" }
            ShipmentChip("En cours ($activeCount)", activeChip == "active") { activeChip = "active" }
            if (pendingPayCount > 0) {
                ShipmentChip("À payer ($pendingPayCount)", activeChip == "pending_pay") { activeChip = "pending_pay" }
            }
            ShipmentChip("Livrés ($deliveredCount)", activeChip == "delivered") { activeChip = "delivered" }
        }

        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            placeholder = {
                Text(
                    "N° de suivi, destinataire, commune…",
                    fontFamily = InterFontFamily,
                    fontSize = 13.sp,
                    color = Gray500,
                )
            },
            leadingIcon = {
                Icon(Icons.Default.Search, null, tint = Gray500, modifier = Modifier.size(18.dp))
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Gray300,
                unfocusedBorderColor = Gray300,
            ),
        )

        Spacer(Modifier.height(8.dp))

        PullToRefreshBox(
            isRefreshing = state.isLoading,
            onRefresh = { viewModel.loadShipments() },
            modifier = Modifier.fillMaxSize(),
        ) {
            when {
                state.isLoading && all.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = OrangePrimary)
                    }
                }
                filtered.isEmpty() -> {
                    EmptyShipmentsState(
                        hasSearch = searchQuery.isNotBlank(),
                        onCreateShipment = onCreateShipment,
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(0.dp),
                    ) {
                        items(filtered, key = { it.id }) { shipment ->
                            ShipmentListRow(
                                shipment = shipment,
                                onClick = { onShipmentClick(shipment.id) },
                                onPayOnline = {
                                    val amount = shipment.totalAmountFcfa()
                                    if (amount > 0) {
                                        onPayOnline(
                                            shipment.trackingNumber,
                                            amount,
                                            shipment.paymentRouteLabel(),
                                        )
                                    }
                                },
                            )
                            HorizontalDivider(color = Gray300.copy(alpha = 0.6f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ShipmentChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) OrangePrimary else Color.White,
        border = BorderStroke(1.dp, if (selected) OrangePrimary else Gray300),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
            color = if (selected) Color.White else Gray700,
        )
    }
}

@Composable
private fun ShipmentListRow(
    shipment: ShipmentDto,
    onClick: () -> Unit,
    onPayOnline: () -> Unit,
) {
    val status = (shipment.effectiveStatus ?: shipment.currentStatus ?: "UNKNOWN").uppercase()
    val progress = shipmentProgressPercent(shipment) / 100f
    val code = shipment.shipmentCode ?: shipment.trackingNumber.takeLast(6).uppercase()
    val awaitingPay = shipment.needsOnlinePayment()
    val total = shipment.totalAmountFcfa()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
    ) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(OrangeLight),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Inventory2, null, tint = OrangePrimary, modifier = Modifier.size(22.dp))
        }

        Column(modifier = Modifier.weight(1f)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    code,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp,
                    color = OrangePrimary,
                )
                StatusBadge(status = status)
            }
            Text(
                "${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""}".trim(),
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = Gray900,
            )
            Text(
                "${shipment.senderCommune ?: "—"} → ${shipment.recipientCommune ?: "—"}",
                fontFamily = InterFontFamily,
                fontSize = 12.sp,
                color = Gray500,
            )
            Spacer(Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = OrangePrimary,
                trackColor = Gray300,
            )
        }

        Column(horizontalAlignment = Alignment.End) {
            val price = formatPriceFcfa(shipment.price)
            if (price.isNotEmpty()) {
                Text(price, fontFamily = InterFontFamily, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = OrangePrimary)
            }
            Text(
                shipment.createdAt?.let { formatListDate(it) } ?: "",
                fontFamily = InterFontFamily,
                fontSize = 10.sp,
                color = Gray400,
            )
            Icon(Icons.Default.ChevronRight, null, tint = Gray300, modifier = Modifier.size(18.dp))
        }
    }
        if (awaitingPay && total > 0) {
            Spacer(Modifier.height(10.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFFFBEB),
                    border = BorderStroke(1.dp, Color(0xFFFEF3C7)),
                ) {
                    Text(
                        "Paiement en attente · ${formatFcfa(total)}",
                        Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFD97706),
                    )
                }
                Button(
                    onClick = onPayOnline,
                    modifier = Modifier.height(36.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                    contentPadding = PaddingValues(horizontal = 14.dp),
                ) {
                    Icon(Icons.Default.CreditCard, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Payer en ligne", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun EmptyShipmentsState(hasSearch: Boolean, onCreateShipment: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(OrangeLight),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Inventory2, null, tint = OrangePrimary, modifier = Modifier.size(36.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            if (hasSearch) "Aucun colis trouvé" else "Aucun colis trouvé",
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Gray900,
        )
        Text(
            if (hasSearch) "Essayez un autre terme de recherche." else "Commencez par envoyer votre premier colis.",
            fontFamily = InterFontFamily,
            fontSize = 13.sp,
            color = Gray500,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        if (!hasSearch) {
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onCreateShipment,
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                shape = RoundedCornerShape(12.dp),
            ) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Envoyer un colis", fontWeight = FontWeight.Bold)
            }
        }
    }
}

private fun formatListDate(isoDate: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.FRANCE)
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val clean = isoDate.replace("Z", "").take(19)
        val date = parser.parse(clean) ?: return ""
        SimpleDateFormat("d MMM yyyy", Locale.FRANCE).format(date)
    } catch (_: Exception) {
        isoDate.take(10)
    }
}
