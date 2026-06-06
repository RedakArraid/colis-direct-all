package ci.colisdirect.app.ui.screens.client

import androidx.compose.animation.*
import androidx.compose.foundation.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Intent
import android.net.Uri
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.components.StatusBadge
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.ClientViewModel
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDashboard(
    onShipmentClick: (String) -> Unit,
    onCreateShipment: () -> Unit,
    onTrackingClick: () -> Unit,
    onLogout: () -> Unit,
    viewModel: ClientViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { viewModel.loadShipments() }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    // States for filter, tab, search
    var activeTab by remember { mutableStateOf("Tous") } // "Tous", "En cours", "Expédiés"
    var searchTerm by remember { mutableStateOf("") }
    var filterStatus by remember { mutableStateOf("all") }
    var sortOrder by remember { mutableStateOf("desc") } // "desc", "asc"

    // Map to keep track of payment method change selections local to each card
    val retryPaymentMethodMap = remember { mutableStateMapOf<String, String>() }

    // Status definitions
    val inProgressStatuses = setOf(
        "READY_FOR_DROP_OFF", "PICKUP_PENDING", "RELAY_ORIGIN_RECEIVED",
        "CARRIER_COLLECTED", "IN_TRANSIT", "RELAY_FINAL_RECEIVED",
        "AVAILABLE_FOR_PICKUP", "PAYMENT_AWAITING_VALIDATION",
        "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY"
    )
    val deliveredStatuses = setOf("DELIVERED", "DELIVERED_TO_CUSTOMER", "PICKED_UP_BY_CUSTOMER")
    val terminalStatuses = setOf("DELIVERED", "DELIVERED_TO_CUSTOMER", "PICKED_UP_BY_CUSTOMER", "CANCELLED", "RETURN_TO_SENDER")

    // Filter and search logic
    val filteredShipments = remember(state.shipments, searchTerm, filterStatus, sortOrder) {
        state.shipments.filter { s ->
            val q = searchTerm.lowercase().trim()
            val matchesSearch = q.isEmpty() ||
                    s.trackingNumber.lowercase().contains(q) ||
                    (s.shipmentCode?.lowercase()?.contains(q) ?: false) ||
                    "${s.recipientFirstName ?: ""} ${s.recipientLastName ?: ""}".lowercase().contains(q) ||
                    (s.recipientCommune?.lowercase()?.contains(q) ?: false) ||
                    (s.senderCommune?.lowercase()?.contains(q) ?: false)

            val status = s.effectiveStatus ?: s.currentStatus ?: ""
            val matchesStatus = filterStatus == "all" ||
                    (filterStatus == "pickup_pending" && s.pickupMethod == "home_pickup" && status == "PICKUP_PENDING") ||
                    (filterStatus == "pending" && (status == "READY_FOR_DROP_OFF" || status == "PAYMENT_CONFIRMED_AWAITING_DROP" || status == "PAYMENT_AWAITING_VALIDATION")) ||
                    (filterStatus == "in_transit" && (status == "CARRIER_COLLECTED" || status == "IN_TRANSIT")) ||
                    (filterStatus == "at_relay" && (status == "RELAY_FINAL_RECEIVED" || status == "AVAILABLE_FOR_PICKUP")) ||
                    (filterStatus == "delivered" && deliveredStatuses.contains(status)) ||
                    (filterStatus == "cancelled" && (status == "CANCELLED" || status == "PAYMENT_REJECTED"))

            matchesSearch && matchesStatus
        }.sortedWith { a, b ->
            val dateA = parseDate(a.createdAt)
            val dateB = parseDate(b.createdAt)
            if (sortOrder == "desc") dateB.compareTo(dateA) else dateA.compareTo(dateB)
        }
    }

    // Filter by tab
    val displayShipments = remember(filteredShipments, activeTab) {
        when (activeTab) {
            "En cours" -> filteredShipments.filter { s ->
                val status = s.effectiveStatus ?: s.currentStatus ?: ""
                inProgressStatuses.contains(status) && !terminalStatuses.contains(status)
            }
            "Expédiés" -> filteredShipments.filter { s ->
                val status = s.effectiveStatus ?: s.currentStatus ?: ""
                deliveredStatuses.contains(status)
            }
            else -> filteredShipments
        }
    }

    // Special categories mapping for warning cards
    val pendingPickupShipments = remember(state.shipments) {
        state.shipments.filter { s ->
            val status = s.effectiveStatus ?: s.currentStatus ?: ""
            s.pickupMethod == "home_pickup" && (status == "PICKUP_PENDING" || status == "READY_FOR_DROP_OFF" || status == "PAYMENT_CONFIRMED_AWAITING_DROP")
        }
    }

    val readyToDepositShipments = remember(state.shipments) {
        state.shipments.filter { s ->
            val status = s.effectiveStatus ?: s.currentStatus ?: ""
            (s.pickupMethod == "relay_deposit" || s.pickupMethod.isNullOrBlank()) && (status == "READY_FOR_DROP_OFF" || status == "PAYMENT_CONFIRMED_AWAITING_DROP")
        }
    }

    val onlinePaymentPendingShipments = remember(state.shipments) {
        state.shipments.filter { s ->
            val status = s.effectiveStatus ?: s.currentStatus ?: ""
            val method = s.paymentMethod?.lowercase() ?: ""
            val isOnline = method == "mobile_money" || method == "paystack" || method == "cinetpay"
            val isUnpaid = s.paymentStatus?.lowercase() != "paid"
            isOnline && isUnpaid && !terminalStatuses.contains(status)
        }
    }

    Scaffold(
        containerColor = Gray50,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading && state.shipments.isNotEmpty(),
            onRefresh = { viewModel.loadShipments() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Title Section
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Mes colis",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 28.sp,
                                color = Gray900,
                                letterSpacing = (-0.5).sp
                            )
                            Text(
                                "Gérez et suivez tous vos envois",
                                fontFamily = InterFontFamily,
                                fontSize = 14.sp,
                                color = Gray500
                            )
                        }

                        IconButton(
                            onClick = onLogout,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFEF2F2))
                        ) {
                            Icon(Icons.Default.ExitToApp, "Déconnexion", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                        }
                    }
                }

                // 1. Navigation Tabs
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE6E6E6)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            val tabs = listOf("Tous", "En cours", "Expédiés")
                            tabs.forEach { tab ->
                                val count = when (tab) {
                                    "En cours" -> state.shipments.count { s ->
                                        val status = s.effectiveStatus ?: s.currentStatus ?: ""
                                        inProgressStatuses.contains(status) && !terminalStatuses.contains(status)
                                    }
                                    "Expédiés" -> state.shipments.count { s ->
                                        val status = s.effectiveStatus ?: s.currentStatus ?: ""
                                        deliveredStatuses.contains(status)
                                    }
                                    else -> state.shipments.size
                                }
                                val isActive = activeTab == tab
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { activeTab = tab }
                                        .padding(vertical = 14.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            "$tab ($count)",
                                            fontFamily = InterFontFamily,
                                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                            fontSize = 13.sp,
                                            color = if (isActive) OrangePrimary else Gray500
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Box(
                                            modifier = Modifier
                                                .width(28.dp)
                                                .height(2.dp)
                                                .background(if (isActive) OrangePrimary else Color.Transparent)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Search and filter card
                item {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFE6E6E6)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Search field
                            OutlinedTextField(
                                value = searchTerm,
                                onValueChange = { searchTerm = it },
                                placeholder = {
                                    Text("Numéro, destinataire, commune…", fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray500)
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Search, null, tint = Gray500, modifier = Modifier.size(18.dp))
                                },
                                trailingIcon = {
                                    if (searchTerm.isNotEmpty()) {
                                        IconButton(onClick = { searchTerm = "" }) {
                                            Icon(Icons.Default.Clear, null, tint = Gray500, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OrangePrimary,
                                    unfocusedBorderColor = Gray300,
                                    focusedContainerColor = Gray50,
                                    unfocusedContainerColor = Gray50
                                ),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = InterFontFamily,
                                    fontSize = 13.sp
                                )
                            )

                            // Select filters
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // Status selector (Fake exposed select)
                                var showStatusMenu by remember { mutableStateOf(false) }
                                val statusOptions = mapOf(
                                    "all" to "Tous les statuts",
                                    "pickup_pending" to "Ramassage domicile",
                                    "pending" to "En attente",
                                    "in_transit" to "En transit",
                                    "at_relay" to "Au relais",
                                    "delivered" to "Livré",
                                    "cancelled" to "Annulé"
                                )
                                Box(modifier = Modifier.weight(1f)) {
                                    OutlinedButton(
                                        onClick = { showStatusMenu = true },
                                        shape = RoundedCornerShape(10.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.fillMaxWidth().height(36.dp),
                                        border = BorderStroke(1.dp, Gray300)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                statusOptions[filterStatus] ?: "Filtrer",
                                                fontFamily = InterFontFamily,
                                                fontSize = 11.sp,
                                                color = Gray900,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Icon(Icons.Default.ArrowDropDown, null, tint = Gray500, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                    DropdownMenu(
                                        expanded = showStatusMenu,
                                        onDismissRequest = { showStatusMenu = false }
                                    ) {
                                        statusOptions.forEach { (k, v) ->
                                            DropdownMenuItem(
                                                text = { Text(v, fontFamily = InterFontFamily, fontSize = 13.sp) },
                                                onClick = {
                                                    filterStatus = k
                                                    showStatusMenu = false
                                                }
                                            )
                                        }
                                    }
                                }

                                // Sort selector
                                var showSortMenu by remember { mutableStateOf(false) }
                                val sortOptions = mapOf(
                                    "desc" to "Plus récents",
                                    "asc" to "Plus anciens"
                                )
                                Box(modifier = Modifier.weight(1f)) {
                                    OutlinedButton(
                                        onClick = { showSortMenu = true },
                                        shape = RoundedCornerShape(10.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.fillMaxWidth().height(36.dp),
                                        border = BorderStroke(1.dp, Gray300)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                sortOptions[sortOrder] ?: "Trier",
                                                fontFamily = InterFontFamily,
                                                fontSize = 11.sp,
                                                color = Gray900,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Icon(Icons.Default.ArrowDropDown, null, tint = Gray500, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                    DropdownMenu(
                                        expanded = showSortMenu,
                                        onDismissRequest = { showSortMenu = false }
                                    ) {
                                        sortOptions.forEach { (k, v) ->
                                            DropdownMenuItem(
                                                text = { Text(v, fontFamily = InterFontFamily, fontSize = 13.sp) },
                                                onClick = {
                                                    sortOrder = k
                                                    showSortMenu = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Warning Card: Pending Pickup
                if (pendingPickupShipments.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Ramassage à domicile prévu (${pendingPickupShipments.size})",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Gray900
                            )

                            pendingPickupShipments.forEach { s ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                                    border = BorderStroke(1.5.dp, Color(0xFFBFDBFE)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.LocalShipping, null, tint = Color(0xFF1D4ED8), modifier = Modifier.size(16.dp))
                                                Text(
                                                    s.trackingNumber,
                                                    fontFamily = FontFamily.Monospace,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFF1D4ED8),
                                                    modifier = Modifier.clickable { onShipmentClick(s.id) }
                                                )
                                            }
                                            Text(
                                                "${s.price?.toInt() ?: 0} FCFA",
                                                fontFamily = InterFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Color(0xFF1D4ED8)
                                            )
                                        }
                                        Text(
                                            "Destinataire : ${s.recipientFirstName ?: ""} ${s.recipientLastName ?: ""} — ${s.recipientCommune ?: ""}",
                                            fontFamily = InterFontFamily,
                                            fontSize = 12.sp,
                                            color = Color(0xFF1E40AF)
                                        )
                                        Text(
                                            "📍 Adresse de collecte : ${s.senderAddress ?: ""}, ${s.senderCommune ?: ""}",
                                            fontFamily = InterFontFamily,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFF1D4ED8)
                                        )
                                        HorizontalDivider(color = Color(0xFFDBEAFE))
                                        Text(
                                            "ℹ️ Info : Un transporteur passera chez vous pour récupérer votre colis. Vous n'avez rien à déposer en point relais.",
                                            fontFamily = InterFontFamily,
                                            fontSize = 11.sp,
                                            color = Color(0xFF1E40AF)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 4. Warning Card: Ready to Deposit
                if (readyToDepositShipments.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Colis à déposer au point relais (${readyToDepositShipments.size})",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Gray900
                            )

                            readyToDepositShipments.forEach { s ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    border = BorderStroke(1.5.dp, OrangePrimary.copy(alpha = 0.3f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.Inventory2, null, tint = OrangePrimary, modifier = Modifier.size(16.dp))
                                                Text(
                                                    s.trackingNumber,
                                                    fontFamily = FontFamily.Monospace,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = OrangePrimary,
                                                    modifier = Modifier.clickable { onShipmentClick(s.id) }
                                                )
                                            }
                                            Text(
                                                "${s.price?.toInt() ?: 0} FCFA",
                                                fontFamily = InterFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Gray900
                                            )
                                        }
                                        Text(
                                            "Destinataire : ${s.recipientFirstName ?: ""} ${s.recipientLastName ?: ""} — ${s.recipientCommune ?: ""}",
                                            fontFamily = InterFontFamily,
                                            fontSize = 12.sp,
                                            color = Gray500
                                        )

                                        // Relay deposit address helper
                                        s.destinationRelay?.let { relay ->
                                            HorizontalDivider(color = Color(0xFFF3F4F6))
                                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Icon(Icons.Default.Store, null, tint = OrangePrimary, modifier = Modifier.size(14.dp))
                                                    Text(
                                                        "Dépôt suggéré : ${relay.name ?: ""}",
                                                        fontFamily = InterFontFamily,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 12.sp,
                                                        color = Gray900
                                                    )
                                                }
                                                Text(
                                                    "${relay.address ?: ""}, ${relay.commune ?: ""}",
                                                    fontFamily = InterFontFamily,
                                                    fontSize = 11.sp,
                                                    color = Gray500
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 5. Warning Card: Pending Payment
                if (onlinePaymentPendingShipments.isNotEmpty()) {
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Paiements en attente (${onlinePaymentPendingShipments.size})",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Gray900
                            )

                            onlinePaymentPendingShipments.forEach { s ->
                                val selectedMethod = retryPaymentMethodMap[s.trackingNumber] ?: "online"

                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                                    border = BorderStroke(1.5.dp, Color(0xFFFEF3C7)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.Warning, null, tint = Color(0xFFD97706), modifier = Modifier.size(16.dp))
                                                Text(
                                                    s.trackingNumber,
                                                    fontFamily = FontFamily.Monospace,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFFD97706)
                                                )
                                            }
                                            Text(
                                                "${s.price?.toInt() ?: 0} FCFA",
                                                fontFamily = InterFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Color(0xFFD97706)
                                            )
                                        }
                                        Text(
                                            "Destinataire : ${s.recipientFirstName ?: ""} ${s.recipientLastName ?: ""} — ${s.recipientCommune ?: ""}",
                                            fontFamily = InterFontFamily,
                                            fontSize = 12.sp,
                                            color = Color(0xFFB45309)
                                        )

                                        // Selector for payment retry method
                                        var showMethodDropdown by remember { mutableStateOf(false) }
                                        Box(modifier = Modifier.fillMaxWidth()) {
                                            OutlinedButton(
                                                onClick = { showMethodDropdown = true },
                                                shape = RoundedCornerShape(10.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                modifier = Modifier.fillMaxWidth().height(40.dp),
                                                border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White)
                                            ) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        if (selectedMethod == "online") "Mobile Money et Cartes prépayées" else "Payer lors de la prise en charge",
                                                        fontFamily = InterFontFamily,
                                                        fontSize = 12.sp,
                                                        color = Gray900
                                                    )
                                                    Icon(Icons.Default.ArrowDropDown, null, tint = Gray500, modifier = Modifier.size(16.dp))
                                                }
                                            }
                                            DropdownMenu(
                                                expanded = showMethodDropdown,
                                                onDismissRequest = { showMethodDropdown = false }
                                            ) {
                                                DropdownMenuItem(
                                                    text = { Text("Mobile Money et Cartes prépayées", fontFamily = InterFontFamily, fontSize = 13.sp) },
                                                    onClick = {
                                                        retryPaymentMethodMap[s.trackingNumber] = "online"
                                                        showMethodDropdown = false
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("Payer lors de la prise en charge (Au relais / Livreur)", fontFamily = InterFontFamily, fontSize = 13.sp) },
                                                    onClick = {
                                                        retryPaymentMethodMap[s.trackingNumber] = "relay_cash"
                                                        showMethodDropdown = false
                                                    }
                                                )
                                            }
                                        }

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Button(
                                                onClick = {
                                                    if (selectedMethod == "relay_cash") {
                                                        viewModel.switchToRelayPayment(s.trackingNumber)
                                                    } else {
                                                        viewModel.initiatePaystackPayment(context, s.trackingNumber) { url ->
                                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                                            context.startActivity(intent)
                                                        }
                                                    }
                                                },
                                                shape = RoundedCornerShape(10.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                                                modifier = Modifier.weight(1f).height(40.dp)
                                            ) {
                                                Text(
                                                    if (selectedMethod == "relay_cash") "Confirmer" else "Payer maintenant",
                                                    fontFamily = InterFontFamily,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp
                                                )
                                            }

                                            Button(
                                                onClick = { viewModel.cancelShipment(s.trackingNumber) },
                                                shape = RoundedCornerShape(10.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFFEF4444)),
                                                border = BorderStroke(1.dp, Color(0xFFFCA5A5)),
                                                modifier = Modifier.width(50.dp).height(40.dp),
                                                contentPadding = PaddingValues(0.dp)
                                            ) {
                                                Icon(Icons.Default.Delete, null, modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Detailed Shipments List Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Tous mes colis (${displayShipments.size})",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Gray900
                        )
                    }
                }

                // 7. Detailed Shipments List
                if (displayShipments.isEmpty()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFE6E6E6)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(Icons.Default.Inventory2, null, tint = Gray300, modifier = Modifier.size(44.dp))
                                Text("Aucun colis trouvé", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray500)
                            }
                        }
                    }
                } else {
                    items(displayShipments, key = { it.id }) { shipment ->
                        val status = shipment.effectiveStatus ?: shipment.currentStatus ?: ""
                        val formattedDate = formatDateShort(shipment.createdAt)

                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFE6E6E6)),
                            modifier = Modifier.fillMaxWidth().clickable { onShipmentClick(shipment.id) }
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(
                                            shipment.trackingNumber,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = OrangePrimary
                                        )
                                        if (!shipment.shipmentCode.isNullOrBlank()) {
                                            Text(
                                                shipment.shipmentCode,
                                                fontFamily = FontFamily.Monospace,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
                                                color = OrangePrimary,
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(OrangeLight)
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }

                                    // Status Badge
                                    StatusBadge(status = status)
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            "${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""}",
                                            fontFamily = InterFontFamily,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = Gray900
                                        )
                                        Text(
                                            shipment.recipientCommune ?: "—",
                                            fontFamily = InterFontFamily,
                                            fontSize = 12.sp,
                                            color = Gray500
                                        )
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "${shipment.price?.toInt() ?: 0} FCFA",
                                            fontFamily = InterFontFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Gray900
                                        )
                                        Text(
                                            formattedDate,
                                            fontFamily = InterFontFamily,
                                            fontSize = 11.sp,
                                            color = Gray500
                                        )
                                    }
                                }

                                // Delivery mode indicators
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Origin
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            if (shipment.pickupMethod == "home_pickup") Icons.Default.LocalShipping else Icons.Default.Store,
                                            null,
                                            tint = if (shipment.pickupMethod == "home_pickup") Color(0xFF3B82F6) else OrangePrimary,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            if (shipment.pickupMethod == "home_pickup") "Ramassage" else "Dépôt relais",
                                            fontFamily = InterFontFamily,
                                            fontSize = 11.sp,
                                            color = Gray500
                                        )
                                    }

                                    Icon(Icons.Default.ArrowForward, null, tint = Gray400, modifier = Modifier.size(12.dp))

                                    // Destination
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            if (shipment.homeDelivery == true) Icons.Default.Home else Icons.Default.Store,
                                            null,
                                            tint = if (shipment.homeDelivery == true) Color(0xFF1D4ED8) else Color(0xFF7E22CE),
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            if (shipment.homeDelivery == true) "A domicile" else "Relais retrait",
                                            fontFamily = InterFontFamily,
                                            fontSize = 11.sp,
                                            color = Gray500
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun parseDate(isoDate: String?): Date {
    if (isoDate == null) return Date()
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        parser.parse(isoDate) ?: Date()
    } catch (e: Exception) {
        Date()
    }
}

private fun formatDateShort(isoDate: String?): String {
    if (isoDate == null) return ""
    return try {
        val date = parseDate(isoDate)
        SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        isoDate.take(10)
    }
}
