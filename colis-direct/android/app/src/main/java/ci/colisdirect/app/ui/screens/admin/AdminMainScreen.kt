package ci.colisdirect.app.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.api.model.SupportTicketDto
import ci.colisdirect.app.domain.AdminDisplayFormat
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.domain.RelayShipmentBuckets
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AdminUiState
import ci.colisdirect.app.viewmodel.AdminViewModel
import ci.colisdirect.app.viewmodel.AuthViewModel

private sealed class AdminOverlay {
    data object None : AdminOverlay()
    data class Shipment(val shipment: ShipmentDto) : AdminOverlay()
    data class Ticket(val ticket: SupportTicketDto) : AdminOverlay()
}

/** Espace admin — `AdminDashboard.tsx` + APIs `/stats`, listes gestion. */
@Composable
fun AdminMainScreen(
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: AdminViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    var tab by remember { mutableIntStateOf(0) }
    var overlay by remember { mutableStateOf<AdminOverlay>(AdminOverlay.None) }

    val displayName = authState.user?.let {
        listOfNotNull(it.firstName, it.lastName).joinToString(" ").trim()
    }.orEmpty().ifBlank { "Administrateur" }

    LaunchedEffect(authState.user?.role) {
        viewModel.setRole(authState.user?.role)
        viewModel.loadDashboard()
    }

    LaunchedEffect(state.error) {
        state.error?.let { snackbar.showSnackbar(it); viewModel.clearMessages() }
    }
    LaunchedEffect(state.successMessage) {
        state.successMessage?.let { snackbar.showSnackbar(it); viewModel.clearMessages() }
    }

    fun openShipment(s: ShipmentDto) {
        viewModel.loadShipmentDetail(s.id, s)
        overlay = AdminOverlay.Shipment(s)
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (overlay is AdminOverlay.None) {
                AdminBottomBar(tab, isAdmin = true, onSelect = { tab = it })
            }
        },
    ) { padding ->
        when (val o = overlay) {
            is AdminOverlay.Shipment -> AdminShipmentDetailScreen(
                shipment = state.detailShipment ?: o.shipment,
                loading = state.detailLoading,
                onBack = { viewModel.clearDetailShipment(); overlay = AdminOverlay.None },
            )
            is AdminOverlay.Ticket -> AdminTicketDetailScreen(
                detail = state.ticketDetail,
                loading = state.isLoading,
                onBack = { viewModel.clearTicketDetail(); overlay = AdminOverlay.None },
                onReply = { viewModel.replyTicket(o.ticket.id, it) },
                onStatus = { viewModel.updateTicketStatus(o.ticket.id, it) },
            )
            AdminOverlay.None -> Box(Modifier.fillMaxSize().padding(padding).background(Gray50)) {
                when (tab) {
                    0 -> AdminHomeTab(state, displayName, { viewModel.loadDashboard() }, ::openShipment)
                    1 -> AdminShipmentsTab(state, { viewModel.loadDashboard() }, ::openShipment) { viewModel.searchShipments(it) }
                    2 -> AdminNetworkTab(state)
                    3 -> AdminSupportTab(state, viewModel::loadSupportTickets) {
                        viewModel.loadTicketDetail(it.id)
                        overlay = AdminOverlay.Ticket(it)
                    }
                    4 -> AdminProfileTab(
                        state = state,
                        isAdmin = state.isAdmin,
                        displayName = displayName,
                        userEmail = authState.user?.email,
                        userPhone = authState.user?.phone,
                        userRole = authState.user?.role,
                        onRefresh = { viewModel.loadDashboard() },
                        onTabHome = { tab = 0 },
                        onTabShipments = { tab = 1 },
                        onTabNetwork = { tab = 2 },
                        onTabSupportEscalated = {
                            viewModel.loadSupportTickets("escalated")
                            tab = 3
                        },
                        onLogout = onLogout,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminHomeTab(
    state: AdminUiState,
    displayName: String,
    onRefresh: () -> Unit,
    onShipmentClick: (ShipmentDto) -> Unit,
) {
    val stats = state.adminStats
    PullToRefreshBox(state.isLoading, onRefresh, Modifier.fillMaxSize()) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            AdminDarkHeader("Bonjour, $displayName", "Vue d'ensemble plateforme", "Administrateur")
            Column(Modifier.padding(horizontal = 16.dp).offset(y = (-16).dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminMetricCard("Colis jour", "${stats?.dailyShipments ?: 0}", Icons.Default.Inventory2, Modifier.weight(1f),
                        trend = stats?.weekGrowth?.let { if (it >= 0) "+$it%" else "$it%" })
                    AdminMetricCard("En transit", "${stats?.inTransit ?: 0}", Icons.Default.LocalShipping, Modifier.weight(1f))
                    AdminMetricCard("Livrés jour", "${stats?.deliveredToday ?: 0}", Icons.Default.CheckCircle, Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminMetricCard("Utilisateurs", "${stats?.totalUsers ?: 0}", Icons.Default.People, Modifier.weight(1f))
                    AdminMetricCard("Revenus mois", AdminDisplayFormat.formatFcfa(stats?.monthlyRevenue), Icons.Default.Payments, Modifier.weight(1f))
                    AdminMetricCard("Relais actifs", "${stats?.activeRelays ?: 0}", Icons.Default.Store, Modifier.weight(1f))
                }
                AdminMetricCard("Total livrés", "${stats?.totalDelivered ?: 0}", Icons.Default.DoneAll, Modifier.fillMaxWidth())
            }

            Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                AdminInfoSection("Performance (30 j)", Icons.Default.Speed) {
                    AdminKeyValueRow("Délai moyen", AdminDisplayFormat.formatHours(stats?.performance?.avgDeliveryHours))
                    AdminKeyValueRow("Taux réussite", AdminDisplayFormat.formatPercent(stats?.performance?.successRate))
                    AdminKeyValueRow("Incidents", "${stats?.performance?.incidentCount ?: 0}")
                    AdminKeyValueRow("Colis bloqués >48h", "${stats?.performance?.stuckShipments ?: 0}")
                }
            }

            val modes = stats?.deliveryModes
            if (modes != null) {
                Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    AdminInfoSection("Modes livraison (30 j)", Icons.Default.PieChart) {
                        AdminKeyValueRow("Point relais", "${modes.relay}")
                        AdminKeyValueRow("Domicile", "${modes.home}")
                    }
                }
            }

            stats?.supportSummary?.let { summary ->
                Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    AdminInfoSection("Tickets support", Icons.Default.SupportAgent) {
                        listOf("open", "pending", "escalated", "resolved", "closed").forEach { key ->
                            val count = summary[key] ?: 0
                            if (count > 0) AdminKeyValueRow(AdminDisplayFormat.ticketStatusLabel(key), "$count")
                        }
                    }
                }
            }

            stats?.zoneSummary?.let { z ->
                Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    AdminInfoSection("Zones livraison", Icons.Default.Map) {
                        AdminKeyValueRow("Total", "${z.total}")
                        AdminKeyValueRow("Actives", "${z.active}")
                        AdminKeyValueRow("Inactives", "${z.inactive}")
                    }
                }
            }

            if (!stats?.byStatus.isNullOrEmpty()) {
                Text("Par statut", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
                stats!!.byStatus.take(8).forEach { row ->
                    val (label, count) = AdminDisplayFormat.statusRow(row)
                    AdminKeyValueRow(label, "$count", Modifier.padding(horizontal = 20.dp, vertical = 2.dp))
                }
            }

            if (!stats?.stuckShipmentsDetails.isNullOrEmpty()) {
                Text("Colis bloqués", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold, color = Color(0xFFB45309))
                stats!!.stuckShipmentsDetails.forEach { stuck ->
                    Card(Modifier.padding(horizontal = 16.dp, vertical = 4.dp).fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Text(stuck.trackingNumber ?: "—", fontWeight = FontWeight.Bold, color = OrangePrimary)
                            Text(AdminDisplayFormat.statusLabel(stuck.currentStatus), fontSize = 12.sp)
                            stuck.ageHours?.let { Text("Depuis ${AdminDisplayFormat.formatHours(it)}", fontSize = 11.sp, color = Gray500) }
                        }
                    }
                }
            }

            if (!stats?.recentActivity.isNullOrEmpty()) {
                Text("Activité récente", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
                stats!!.recentActivity.take(12).forEach { act ->
                    val tn = act.trackingNumber
                    if (tn != null) {
                        Card(Modifier.padding(horizontal = 16.dp, vertical = 4.dp).fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(tn, fontWeight = FontWeight.Bold, color = OrangePrimary)
                                Text("${act.senderName ?: "—"} → ${act.recipientName ?: "—"}", fontSize = 12.sp, color = Gray600)
                                Text(AdminDisplayFormat.statusLabel(act.currentStatus), fontSize = 11.sp, color = OrangePrimary)
                                act.price?.let { Text(RelayDisplayFormat.formatFcfa(it), fontSize = 12.sp) }
                            }
                        }
                    }
                }
            }

            if (state.shipments.isNotEmpty()) {
                Text("Derniers envois", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
                state.shipments.take(8).forEach { s ->
                    AdminShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminShipmentsTab(
    state: AdminUiState,
    onRefresh: () -> Unit,
    onClick: (ShipmentDto) -> Unit,
    searchFn: (String) -> List<ShipmentDto>,
) {
    var search by remember { mutableStateOf("") }
    val list = remember(state.shipments, search) { searchFn(search) }

    PullToRefreshBox(state.isLoading, onRefresh, Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
            item { AdminDarkHeader("Envois", "${state.shipments.size} colis", null) }
            item {
                OutlinedTextField(
                    search,
                    { search = it },
                    Modifier.fillMaxWidth().padding(16.dp),
                    placeholder = { Text("Rechercher…") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    singleLine = true,
                )
            }
            item {
                Text(
                    "${list.size} résultat(s) sur ${state.shipments.size}",
                    Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    fontSize = 12.sp,
                    color = Gray600,
                )
            }
            if (list.isEmpty()) {
                item { Text("Aucun envoi", Modifier.padding(32.dp), color = Gray500) }
            } else {
                items(list.take(100), key = { it.id }) { s ->
                    AdminShipmentCard(s, { onClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            }
        }
    }
}

@Composable
private fun AdminNetworkTab(state: AdminUiState) {
    Column(Modifier.verticalScroll(rememberScrollState())) {
        AdminDarkHeader("Réseau", "Utilisateurs, relais, candidatures", null)
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AdminInfoSection("Utilisateurs (${state.users.size})", Icons.Default.People) {
                state.users.take(25).forEach { AdminUserCard(it) }
                if (state.users.size > 25) Text("+ ${state.users.size - 25} autres", color = Gray500, fontSize = 12.sp)
            }
            AdminInfoSection("Points relais (${state.relayPoints.size})", Icons.Default.Store) {
                state.relayPoints.take(20).forEach { rp ->
                    AdminDetailRow(rp.name, listOfNotNull(rp.commune, rp.relayCode).joinToString(" · "), highlight = true)
                    HorizontalDivider(color = Gray200)
                }
            }
            AdminInfoSection("Candidatures PR (${state.relayApplications.size})", Icons.Default.Description) {
                if (state.relayApplications.isEmpty()) Text("Aucune en attente", color = Gray500)
                state.relayApplications.forEach { app ->
                    AdminDetailRow(app.businessName ?: "—", "${app.commune} · ${app.quartier}", highlight = true)
                    app.phone?.let { AdminDetailRow("Tél.", it) }
                    AdminDetailRow("Date", AdminDisplayFormat.formatDateTime(app.createdAt))
                    HorizontalDivider(color = Gray200)
                }
            }
            AdminInfoSection("Candidatures livreurs (${state.transporterApplications.size})", Icons.Default.TwoWheeler) {
                if (state.transporterApplications.isEmpty()) Text("Aucune en attente", color = Gray500)
                state.transporterApplications.forEach { app ->
                    AdminDetailRow(
                        listOfNotNull(app.firstName, app.lastName).joinToString(" "),
                        app.vehicleType ?: "—",
                        highlight = true,
                    )
                    app.email?.let { AdminDetailRow("E-mail", it) }
                    app.phone?.let { AdminDetailRow("Tél.", it) }
                    HorizontalDivider(color = Gray200)
                }
            }
            val top = state.adminStats?.topRelayPoints.orEmpty()
            if (top.isNotEmpty()) {
                AdminInfoSection("Top relais (30 j)", Icons.Default.Leaderboard) {
                    top.forEach { r ->
                        AdminKeyValueRow("${r.name} (${r.commune})", "${AdminDisplayFormat.parseCount(r.count)} colis")
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun AdminSupportTab(
    state: AdminUiState,
    onLoadTickets: (String?) -> Unit,
    onTicketClick: (SupportTicketDto) -> Unit,
) {
    var filter by remember { mutableStateOf<String?>("escalated") }
    LaunchedEffect(filter) { onLoadTickets(filter) }

    Column(Modifier.fillMaxSize()) {
        AdminDarkHeader("Support", "${state.supportTickets.size} tickets", "Escaladés & messagerie")
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "Tous", "escalated" to "Escaladés", "open" to "Ouverts", "pending" to "En cours").forEach { (s, label) ->
                FilterChip(
                    selected = filter == s,
                    onClick = { filter = s },
                    label = { Text(label) },
                )
            }
        }
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.supportTickets, key = { it.id }) { t ->
                AdminTicketCard(t, { onTicketClick(t) })
            }
        }
    }
}

@Composable
private fun AdminProfileTab(
    state: AdminUiState,
    isAdmin: Boolean,
    displayName: String,
    userEmail: String?,
    userPhone: String?,
    userRole: String?,
    onRefresh: () -> Unit,
    onTabHome: () -> Unit,
    onTabShipments: () -> Unit,
    onTabNetwork: () -> Unit,
    onTabSupportEscalated: () -> Unit,
    onLogout: () -> Unit,
) {
    val openUri = rememberAdminUriHandler()
    val openWebConsole = { openUri("https://colisdirect.com") }
    val stats = state.adminStats
    val modules = ProfileVisibility.visibleAdminProfileModules(isAdmin)
    Column(Modifier.verticalScroll(rememberScrollState())) {
        AdminDarkHeader("Profil", displayName, AdminDisplayFormat.roleLabel(userRole))

        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AdminInfoSection("Compte administrateur", Icons.Default.AdminPanelSettings) {
                AdminDetailRow("Nom", displayName, highlight = true)
                userEmail?.let { email ->
                    AdminClickableRow("E-mail", email, Icons.Default.Email) { openUri("mailto:$email") }
                }
                userPhone?.let { phone ->
                    AdminClickableRow("Téléphone", phone, Icons.Default.Phone) { openUri("tel:$phone") }
                }
                AdminDetailRow("Rôle", AdminDisplayFormat.roleLabel(userRole))
            }

            if (ProfileVisibility.canSeeAdminPlatformSummary(isAdmin)) {
                AdminInfoSection("Synthèse plateforme", Icons.Default.Insights) {
                    AdminDetailRow("Utilisateurs", "${stats?.totalUsers ?: state.users.size}")
                    AdminDetailRow("Envois", "${state.shipments.size}")
                    AdminDetailRow("Relais actifs", "${stats?.activeRelays ?: state.relayPoints.size}")
                    AdminDetailRow("Revenus du mois", AdminDisplayFormat.formatFcfa(stats?.monthlyRevenue))
                    AdminDetailRow("Tickets escaladés", "${stats?.supportSummary?.get("escalated") ?: state.supportTickets.size}")
                }
            }
        }

        if (isAdmin) {
            Card(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(Color.White),
            ) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                    Text("Navigation", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(vertical = 10.dp))
                    AdminProfileMenuRow(Icons.Default.Dashboard, "Tableau de bord", onTabHome)
                    AdminProfileMenuRow(Icons.Default.LocalShipping, "Envois (${state.shipments.size})", onTabShipments)
                    AdminProfileMenuRow(Icons.Default.AccountTree, "Réseau & candidatures", onTabNetwork)
                    AdminProfileMenuRow(
                        Icons.Default.SupportAgent,
                        "Support — tickets escaladés",
                        onTabSupportEscalated,
                        badge = state.supportTickets.size,
                    )
                    AdminProfileMenuRow(Icons.Default.Refresh, "Actualiser toutes les données", onRefresh)
                }
            }
        }

        if (modules.isNotEmpty()) {
            Card(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(Color.White),
            ) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                    Text("Modules métier", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(vertical = 10.dp))
                    Text(
                        "Listes sur l'app · réglages avancés sur la console web.",
                        fontSize = 12.sp,
                        color = Gray600,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    if (ProfileVisibility.AdminProfileModule.USERS in modules) {
                        AdminModuleTile("Utilisateurs", Icons.Default.People, state.users.size, onTabNetwork)
                    }
                    if (ProfileVisibility.AdminProfileModule.RELAY_POINTS in modules) {
                        AdminModuleTile("Points relais", Icons.Default.Store, state.relayPoints.size, onTabNetwork)
                    }
                    if (ProfileVisibility.AdminProfileModule.RELAY_APPLICATIONS in modules) {
                        AdminModuleTile("Candidatures PR", Icons.Default.Description, state.relayApplications.size, onTabNetwork)
                    }
                    if (ProfileVisibility.AdminProfileModule.TRANSPORTER_APPLICATIONS in modules) {
                        AdminModuleTile("Candidatures livreurs", Icons.Default.TwoWheeler, state.transporterApplications.size, onTabNetwork)
                    }
                    if (ProfileVisibility.AdminProfileModule.SHIPMENTS in modules) {
                        AdminModuleTile("Envois", Icons.Default.LocalShipping, state.shipments.size, onTabShipments)
                    }
                    if (ProfileVisibility.AdminProfileModule.ESCALATED_TICKETS in modules) {
                        AdminModuleTile("Tickets escaladés", Icons.Default.SupportAgent, state.supportTickets.size, onTabSupportEscalated)
                    }
                    if (ProfileVisibility.AdminProfileModule.DELIVERY_ZONES in modules) {
                        AdminModuleTile("Zones de livraison", Icons.Default.Map, stats?.zoneSummary?.total, onTabHome)
                    }
                    if (ProfileVisibility.AdminProfileModule.PRICING in modules) {
                        AdminModuleTile("Tarifs", Icons.Default.PriceChange, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.PROMO_CODES in modules) {
                        AdminModuleTile("Codes promo", Icons.Default.Discount, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.BATCH_DISPATCH in modules) {
                        AdminModuleTile("Dispatch par lots", Icons.Default.Layers, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.MARKETPLACE_FINANCE in modules) {
                        AdminModuleTile("Finance marketplace", Icons.Default.AccountBalance, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.JOB_POSTINGS in modules) {
                        AdminModuleTile("Offres d'emploi", Icons.Default.Work, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.API_KEYS in modules) {
                        AdminModuleTile("API & intégrations", Icons.Default.Code, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.SYSTEM_SETTINGS in modules) {
                        AdminModuleTile("Paramètres système", Icons.Default.Settings, null, openWebConsole)
                    }
                    if (ProfileVisibility.AdminProfileModule.WEB_CONSOLE in modules) {
                        AdminProfileMenuRow(
                            Icons.Default.Language,
                            "Ouvrir la console web COLISDIRECT",
                            openWebConsole,
                        )
                    }
                    AdminProfileMenuRow(
                        Icons.Default.SupportAgent,
                        "Support technique",
                        { openUri("mailto:support@colisdirect.ci") },
                    )
                    AdminProfileMenuRow(Icons.AutoMirrored.Filled.Logout, "Déconnexion", onLogout, danger = true)
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun AdminClickableRow(
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminShipmentDetailScreen(
    shipment: ShipmentDto,
    loading: Boolean,
    onBack: () -> Unit,
) {
    val status = RelayShipmentBuckets.statusOf(shipment)
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(shipment.trackingNumber) },
                navigationIcon = { IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") } },
            )
        },
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = OrangePrimary)
            }
            return@Scaffold
        }
        Column(Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AdminDetailRow("Statut", AdminDisplayFormat.statusLabel(status), highlight = true)
            shipment.shipmentCode?.let { AdminDetailRow("N° envoi", it, highlight = true) }
            AdminInfoSection("Expéditeur", Icons.Default.Person) {
                AdminDetailRow("Nom", RelayDisplayFormat.personName(shipment.senderFirstName, shipment.senderLastName))
                shipment.senderPhone?.let { AdminDetailRow("Tél.", it) }
                shipment.senderEmail?.let { AdminDetailRow("E-mail", it) }
                AdminDetailRow("Adresse", RelayDisplayFormat.addressLine(shipment.senderCommune, shipment.senderAddress))
            }
            AdminInfoSection("Destinataire", Icons.Default.Person) {
                AdminDetailRow("Nom", RelayDisplayFormat.personName(shipment.recipientFirstName, shipment.recipientLastName))
                shipment.recipientPhone?.let { AdminDetailRow("Tél.", it) }
                AdminDetailRow("Adresse", RelayDisplayFormat.addressLine(shipment.recipientCommune, shipment.recipientAddress))
            }
            AdminInfoSection("Colis & paiement", Icons.Default.Inventory2) {
                AdminDetailRow("Type", RelayDisplayFormat.packageTypeLabel(shipment.packageType))
                AdminDetailRow("Mode", RelayDisplayFormat.deliveryModeLabel(shipment))
                AdminDetailRow("Paiement", RelayDisplayFormat.paymentMethodLabel(shipment.paymentMethod))
                AdminDetailRow("Statut paiement", RelayDisplayFormat.paymentStatusLabel(shipment.paymentStatus))
                AdminDetailRow("Total", RelayDisplayFormat.formatFcfa(RelayDisplayFormat.shipmentTotal(shipment)), highlight = true)
            }
            AdminInfoSection("Relais", Icons.Default.Store) {
                AdminDetailRow("Origine", RelayDisplayFormat.relayLabel(shipment, true))
                AdminDetailRow("Destination", RelayDisplayFormat.relayLabel(shipment, false))
                shipment.deliveryZoneName?.let { AdminDetailRow("Zone", it) }
            }
            AdminDetailRow("Créé", AdminDisplayFormat.formatDateTime(shipment.createdAt))
            AdminDetailRow("Mis à jour", AdminDisplayFormat.formatDateTime(shipment.updatedAt))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AdminTicketDetailScreen(
    detail: ci.colisdirect.app.data.api.model.SupportTicketDetailDto?,
    loading: Boolean,
    onBack: () -> Unit,
    onReply: (String) -> Unit,
    onStatus: (String) -> Unit,
) {
    var reply by remember { mutableStateOf("") }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ticket") },
                navigationIcon = { IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") } },
            )
        },
    ) { padding ->
        if (loading && detail == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = OrangePrimary)
            }
            return@Scaffold
        }
        Column(Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            detail?.let { t ->
                AdminDetailRow("Objet", t.subject ?: "—", highlight = true)
                AdminDetailRow("Statut", AdminDisplayFormat.ticketStatusLabel(t.status))
                AdminDetailRow("Priorité", AdminDisplayFormat.priorityLabel(t.priority))
                AdminDetailRow("Canal", t.channel ?: "—")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { onStatus("resolved") }) { Text("Résolu") }
                    OutlinedButton(onClick = { onStatus("closed") }) { Text("Fermer") }
                }
                Text("Messages", fontWeight = FontWeight.Bold)
                t.messages.forEach { msg ->
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(Gray50)) {
                        Column(Modifier.padding(10.dp)) {
                            Text(msg.senderType ?: "—", fontSize = 10.sp, color = Gray500)
                            Text(msg.body ?: "", fontSize = 13.sp)
                            Text(AdminDisplayFormat.formatDateTime(msg.createdAt), fontSize = 10.sp, color = Gray400)
                        }
                    }
                }
                OutlinedTextField(reply, { reply = it }, Modifier.fillMaxWidth(), label = { Text("Réponse") }, minLines = 3)
                Button(
                    onClick = { onReply(reply.trim()) },
                    enabled = reply.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(OrangePrimary),
                ) { Text("Envoyer") }
            }
        }
    }
}
