package ci.colisdirect.app.ui.screens.relay

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.domain.RelayShipmentBuckets
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.RelayUiState
import ci.colisdirect.app.viewmodel.RelayViewModel

private sealed class RelayOverlay {
    data object None : RelayOverlay()
    data class ShipmentDetail(val shipment: ShipmentDto) : RelayOverlay()
    data object PhoneSearch : RelayOverlay()
}

private enum class ColisFilter { EnCours, Termine, Incidents }

/** Espace point relais — données complètes type `RelayDashboard.tsx`. */
@Composable
fun RelayMainScreen(
    onLogout: () -> Unit,
    onIntakeEntry: () -> Unit,
    onDeliveryEntry: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: RelayViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    var tab by remember { mutableIntStateOf(0) }
    var overlay by remember { mutableStateOf<RelayOverlay>(RelayOverlay.None) }

    val relayId = authState.user?.relayPointId
    val relayName = state.relayPoint?.name ?: "Mon point relais"
    val displayName = authState.user?.let {
        listOfNotNull(it.firstName, it.lastName).joinToString(" ").trim()
    }.orEmpty().ifBlank { "Partenaire relais" }

    val stats = state.stats

    LaunchedEffect(relayId) { viewModel.loadDashboard(relayId) }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessages()
        }
    }
    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    fun openShipment(s: ShipmentDto) {
        viewModel.loadShipmentDetail(s.id, s)
        overlay = RelayOverlay.ShipmentDetail(s)
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (overlay is RelayOverlay.None) {
                RelayBottomBar(selected = tab, onSelect = { tab = it })
            }
        },
    ) { padding ->
        when (val o = overlay) {
            is RelayOverlay.ShipmentDetail -> {
                val detail = state.detailShipment ?: o.shipment
                RelayShipmentDetailScreen(
                    shipment = detail,
                    relayPointId = relayId,
                    loading = state.detailLoading,
                    busy = state.isLoading,
                    onBack = {
                        viewModel.clearDetailShipment()
                        overlay = RelayOverlay.None
                    },
                    onIntake = { viewModel.relayIntake(detail.trackingNumber) },
                    onFinalIntake = { viewModel.relayFinalIntake(detail.trackingNumber) },
                    onMakeAvailable = { viewModel.makeAvailable(detail.trackingNumber) },
                    onConfirmCash = { viewModel.confirmCashPayment(detail.trackingNumber, detail.price) },
                    onDelivery = onDeliveryEntry,
                )
            }

            RelayOverlay.PhoneSearch -> RelayPhoneSearchScreen(
                busy = state.isLoading,
                results = state.searchResults,
                onBack = { overlay = RelayOverlay.None },
                onSearch = { viewModel.searchByPhone(it) },
                onSelect = { openShipment(it) },
            )

            RelayOverlay.None -> Box(
                Modifier.fillMaxSize().padding(padding).background(Gray50),
            ) {
                when (tab) {
                    0 -> RelayHomeTab(
                        state = state,
                        displayName = displayName,
                        relayName = relayName,
                        onRefresh = { viewModel.loadDashboard(relayId) },
                        onIntake = onIntakeEntry,
                        onDelivery = onDeliveryEntry,
                        onSearch = { overlay = RelayOverlay.PhoneSearch },
                        onColisTab = { tab = 2 },
                        onShipmentClick = ::openShipment,
                    )
                    1 -> RelayFinancesTab(state = state, relayName = relayName)
                    2 -> RelayColisTab(
                        state = state,
                        onRefresh = { viewModel.loadDashboard(relayId) },
                        onShipmentClick = ::openShipment,
                        onMakeAvailable = { viewModel.makeAvailable(it) },
                    )
                    3 -> RelayAssistanceTab(
                        state = state,
                        onIntakeEntry = onIntakeEntry,
                        onDeliveryEntry = onDeliveryEntry,
                        onPhoneSearch = { overlay = RelayOverlay.PhoneSearch },
                        onShipmentClick = ::openShipment,
                    )
                    4 -> RelaySettingsTab(
                        state = state,
                        displayName = displayName,
                        userEmail = authState.user?.email,
                        userPhone = authState.user?.phone,
                        onRefresh = { viewModel.loadDashboard(relayId) },
                        onLogout = onLogout,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RelayHomeTab(
    state: RelayUiState,
    displayName: String,
    relayName: String,
    onRefresh: () -> Unit,
    onIntake: () -> Unit,
    onDelivery: () -> Unit,
    onSearch: () -> Unit,
    onColisTab: () -> Unit,
    onShipmentClick: (ShipmentDto) -> Unit,
) {
    val stats = state.stats
    val pendingNetwork = stats?.pendingPickups ?: state.pendingIntake.size
    val pendingDeliver = stats?.pendingDeliveries ?: 0
    val completedToday = stats?.completedToday ?: 0
    val monthRevenue = stats?.financials?.month?.revenue ?: stats?.monthlyRevenue ?: 0.0
    val todayRevenue = stats?.financials?.today?.revenue ?: 0.0

    PullToRefreshBox(isRefreshing = state.isLoading, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            RelayDarkHeader(
                title = "Bonjour, $displayName",
                subtitle = "Tableau de bord point relais",
                relayName = relayName,
                relayCode = state.relayCode,
                footer = RelayDisplayFormat.statsUpdatedLabel(stats),
            )

            if (state.missingRelayAssignment) {
                Card(Modifier.padding(16.dp).fillMaxWidth(), colors = CardDefaults.cardColors(Color(0xFFFFF3E0))) {
                    Text(
                        "Votre compte n'est pas associé à un point relais. Contactez l'administrateur.",
                        Modifier.padding(16.dp),
                    )
                }
                return@Column
            }

            Column(Modifier.padding(horizontal = 16.dp).offset(y = (-20).dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    RelayMetricCard("À recevoir", pendingNetwork, Icons.Default.Inbox, Modifier.weight(1f), subtitle = "Réseau")
                    RelayMetricCard("En relais", state.inRelay.size, Icons.Default.Store, Modifier.weight(1f))
                    RelayMetricCard(
                        "À livrer",
                        pendingDeliver,
                        Icons.Default.LocalShipping,
                        Modifier.weight(1f),
                        highlight = pendingDeliver > 0,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    RelayMetricCard("Traités auj.", completedToday, Icons.Default.CheckCircle, Modifier.weight(1f))
                    RelayRevenueMetricCard(
                        "Revenus mois",
                        RelayDisplayFormat.formatFcfa(monthRevenue),
                        Icons.Default.TrendingUp,
                        Modifier.weight(1f),
                    )
                    RelayRevenueMetricCard(
                        "Aujourd'hui",
                        RelayDisplayFormat.formatFcfa(todayRevenue),
                        Icons.Default.Payments,
                        Modifier.weight(1f),
                    )
                }
            }

            if (pendingNetwork > 0) {
                RelayAlertBanner(
                    title = "$pendingNetwork colis en attente de dépôt",
                    message = "Un client peut se présenter avec un colis. Saisissez le numéro dès son arrivée.",
                    onAction = onIntake,
                    actionLabel = "Réceptionner",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }

            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                RelayQuickAction("Réception", Icons.Default.Edit, onIntake, Modifier.weight(1f))
                RelayQuickAction("Remise", Icons.Default.CheckCircle, onDelivery, Modifier.weight(1f))
                RelayQuickAction("Recherche", Icons.Default.Search, onSearch, Modifier.weight(1f))
                RelayQuickAction("Tous colis", Icons.Default.Inventory2, onColisTab, Modifier.weight(1f))
            }

            Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                RelayInfoSection("Synthèse activité", Icons.Default.Analytics) {
                    RelayDetailRow("Colis actifs (API)", "${state.activeShipments.size}")
                    RelayDetailRow("Total liés au relais", "${state.allShipments.size}")
                    RelayDetailRow("En cours", "${state.colisEnCours.size}")
                    RelayDetailRow("Terminés", "${state.colisTermine.size}")
                    RelayDetailRow("Incidents", "${state.colisIncidents.size}")
                    RelayDetailRow("Assistés", "${state.assistedShipments.size}")
                    RelayDetailRow("Disponibles retrait", "${state.awaitingPickup.size}")
                }
            }

            if (state.awaitingPickup.isNotEmpty()) {
                RelaySectionHeader("Prêts pour retrait client", state.awaitingPickup.size, Icons.Default.PersonPin)
                state.awaitingPickup.take(8).forEach { s ->
                    RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            }

            if (state.activeShipments.isNotEmpty()) {
                RelaySectionHeader("Colis actifs", state.activeShipments.size, Icons.Default.LocalShipping)
                state.activeShipments.take(10).forEach { s ->
                    RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            } else if (state.inRelay.isNotEmpty()) {
                RelaySectionHeader("En stock au relais", state.inRelay.size, Icons.Default.Store)
                state.inRelay.take(8).forEach { s ->
                    RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                }
            }

            Spacer(Modifier.height(28.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RelayColisTab(
    state: RelayUiState,
    onRefresh: () -> Unit,
    onShipmentClick: (ShipmentDto) -> Unit,
    onMakeAvailable: (String) -> Unit,
) {
    var filter by remember { mutableStateOf(ColisFilter.EnCours) }
    var search by remember { mutableStateOf("") }

    val baseList = when (filter) {
        ColisFilter.EnCours -> state.colisEnCours
        ColisFilter.Termine -> state.colisTermine
        ColisFilter.Incidents -> state.colisIncidents
    }
    val filtered = remember(baseList, search) { RelayShipmentBuckets.filterSearch(baseList, search) }

    PullToRefreshBox(isRefreshing = state.isLoading, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
            item {
                RelayDarkHeader(
                    "Mes colis",
                    "${state.allShipments.size} colis au total",
                    state.relayPoint?.name,
                    state.relayCode,
                )
            }
            item {
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text("N° suivi, envoi, nom, téléphone, commune…") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    singleLine = true,
                )
            }
            item {
                Row(
                    Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    FilterChip(
                        selected = filter == ColisFilter.EnCours,
                        onClick = { filter = ColisFilter.EnCours },
                        label = { Text("En cours (${state.colisEnCours.size})") },
                    )
                    FilterChip(
                        selected = filter == ColisFilter.Termine,
                        onClick = { filter = ColisFilter.Termine },
                        label = { Text("Terminés (${state.colisTermine.size})") },
                    )
                    FilterChip(
                        selected = filter == ColisFilter.Incidents,
                        onClick = { filter = ColisFilter.Incidents },
                        label = { Text("Incidents (${state.colisIncidents.size})") },
                    )
                }
            }

            if (filter == ColisFilter.EnCours) {
                if (state.pendingIntake.isNotEmpty()) {
                    item { RelaySectionHeader("À réceptionner (dépôt libre)", state.pendingIntake.size, Icons.Default.Inbox) }
                    items(state.pendingIntake, key = { "pi_${it.id}" }) { s ->
                        RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                    }
                }
                if (state.inRelay.isNotEmpty()) {
                    item { RelaySectionHeader("En relais", state.inRelay.size, Icons.Default.Store) }
                    items(state.inRelay, key = { "ir_${it.id}" }) { s ->
                        Column(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                            RelayRichShipmentCard(s, { onShipmentClick(s) })
                            if (RelayShipmentBuckets.statusOf(s) == "RELAY_FINAL_RECEIVED") {
                                Button(
                                    onClick = { onMakeAvailable(s.trackingNumber) },
                                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                                    colors = ButtonDefaults.buttonColors(OrangePrimary),
                                ) { Text("Rendre disponible au retrait") }
                            }
                        }
                    }
                }
                if (state.awaitingPickup.isNotEmpty()) {
                    item { RelaySectionHeader("Disponibles retrait", state.awaitingPickup.size, Icons.Default.PersonPin) }
                    items(state.awaitingPickup, key = { "ap_${it.id}" }) { s ->
                        RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                    }
                }
            }

            if (filtered.isEmpty()) {
                item {
                    Text(
                        if (search.isNotBlank()) "Aucun résultat pour « $search »"
                        else "Aucun colis dans cette catégorie.",
                        Modifier.padding(32.dp),
                        color = Gray500,
                    )
                }
            } else {
                item { RelaySectionHeader("Liste (${filtered.size})", filtered.size, Icons.Default.List) }
                items(filtered, key = { it.id }) { s ->
                    RelayRichShipmentCard(
                        s,
                        { onShipmentClick(s) },
                        Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun RelayFinancesTab(state: RelayUiState, relayName: String) {
    val stats = state.stats
    val month = stats?.financials?.month
    val week = stats?.financials?.week
    val today = stats?.financials?.today

    Column(Modifier.verticalScroll(rememberScrollState())) {
        RelayDarkHeader("Caisse & paiements", "Recettes et commissions", relayName, footer = RelayDisplayFormat.statsUpdatedLabel(stats))

        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            RelayInfoSection("Recettes encaissées", Icons.Default.AccountBalance) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RelayFinanceCard("Aujourd'hui", RelayDisplayFormat.formatFcfa(today?.revenue ?: 0.0), modifier = Modifier.weight(1f))
                    RelayFinanceCard("Semaine", RelayDisplayFormat.formatFcfa(week?.revenue ?: 0.0), modifier = Modifier.weight(1f))
                    RelayFinanceCard(
                        "Mois",
                        RelayDisplayFormat.formatFcfa(month?.revenue ?: stats?.monthlyRevenue ?: 0.0),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            RelayPaymentBreakdownList(month)

            RelayInfoSection("Commissions & volumes", Icons.Default.MonetizationOn) {
                RelayDetailRow("Commissions (mois)", RelayDisplayFormat.formatFcfa(month?.commissions ?: 0.0))
                RelayDetailRow("Revenus assistance", RelayDisplayFormat.formatFcfa(month?.assistanceRevenue ?: 0.0))
                RelayDetailRow("Revenus impression", RelayDisplayFormat.formatFcfa(month?.printingRevenue ?: 0.0))
                RelayDetailRow("Colis assistés", "${month?.assistedCount ?: 0}")
                RelayDetailRow("Livraisons relais", "${month?.relayDeliveryCount ?: 0}")
                RelayDetailRow("Livraisons domicile", "${month?.homeDeliveryCount ?: 0}")
                RelayDetailRow("Colis payés (mois)", "${month?.shipmentsPaid ?: 0} / ${month?.shipments ?: 0}")
            }

            Text("Détail par période", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Gray900)
            RelayPeriodStatsGrid(today, "Aujourd'hui")
            RelayPeriodStatsGrid(week, "Cette semaine")
            RelayPeriodStatsGrid(month, "Ce mois")

            if (state.assistedShipments.isNotEmpty()) {
                RelaySectionHeader("Colis avec assistance", state.assistedShipments.size, Icons.Default.SupportAgent)
                state.assistedShipments.take(15).forEach { s ->
                    RelayRichShipmentCard(
                        s,
                        onClick = {},
                        modifier = Modifier.padding(vertical = 4.dp),
                        compact = true,
                    )
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun RelayAssistanceTab(
    state: RelayUiState,
    onIntakeEntry: () -> Unit,
    onDeliveryEntry: () -> Unit,
    onPhoneSearch: () -> Unit,
    onShipmentClick: (ShipmentDto) -> Unit,
) {
    val actions = ProfileVisibility.visibleRelayAssistanceActions()
    Column(Modifier.verticalScroll(rememberScrollState())) {
        RelayDarkHeader("Assistance client", "Créer ou suivre des envois assistés", state.relayPoint?.name, state.relayCode)
        Card(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(Color.White),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Assistance client",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                )
                Text(
                    "Créez ou traitez un envoi pour le compte d'un client (équivalent onglet web « Assister un client »).",
                    fontSize = 13.sp,
                    color = Gray600,
                )
                if (ProfileVisibility.RelayAssistanceAction.INTAKE in actions) {
                    RelayProfileMenuRow(Icons.Default.Edit, "Saisir — réception au relais", onIntakeEntry)
                }
                if (ProfileVisibility.RelayAssistanceAction.DELIVERY_CONFIRM in actions) {
                    RelayProfileMenuRow(Icons.Default.CheckCircle, "Confirmer remise client", onDeliveryEntry)
                }
                if (ProfileVisibility.RelayAssistanceAction.PHONE_SEARCH in actions) {
                    RelayProfileMenuRow(Icons.Default.Search, "Recherche par téléphone", onPhoneSearch)
                }
            }
        }
        if (state.assistedShipments.isNotEmpty()) {
            RelaySectionHeader("Historique envois assistés", state.assistedShipments.size, Icons.Default.History)
            state.assistedShipments.take(20).forEach { s ->
                RelayRichShipmentCard(s, { onShipmentClick(s) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            }
        } else {
            Text(
                "Aucun envoi assisté pour le moment.",
                Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                fontSize = 13.sp,
                color = Gray500,
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun RelaySettingsTab(
    state: RelayUiState,
    displayName: String,
    userEmail: String?,
    userPhone: String?,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
) {
    val openUri = rememberRelayProfileUriHandler()
    Column(Modifier.verticalScroll(rememberScrollState())) {
        RelayDarkHeader("Paramètres", "Profil du relais", state.relayPoint?.name, state.relayCode)
        RelayProfileInfoCard(
            relay = state.relayPoint,
            userEmail = userEmail,
            userPhone = userPhone,
            userName = displayName,
            onDial = openUri,
        )
        val stats = state.stats
        Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            RelayInfoSection("Performances", Icons.Default.Insights) {
                RelayDetailRow("Traités aujourd'hui", "${stats?.completedToday ?: 0}")
                RelayDetailRow("Revenus du mois", RelayDisplayFormat.formatFcfa(stats?.monthlyRevenue ?: 0.0))
                RelayDetailRow("Colis en cours", "${state.colisEnCours.size}")
            }
        }
        Card(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(Color.White),
        ) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                RelayProfileMenuRow(Icons.Default.Refresh, "Actualiser les données", onRefresh)
                RelayProfileMenuRow(
                    Icons.Default.SupportAgent,
                    "Support COLISDIRECT",
                    { openUri("mailto:support@colisdirect.ci") },
                )
                RelayProfileMenuRow(Icons.AutoMirrored.Filled.Logout, "Déconnexion", onLogout, danger = true)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RelayShipmentDetailScreen(
    shipment: ShipmentDto,
    relayPointId: String?,
    loading: Boolean,
    busy: Boolean,
    onBack: () -> Unit,
    onIntake: () -> Unit,
    onFinalIntake: () -> Unit,
    onMakeAvailable: () -> Unit,
    onConfirmCash: () -> Unit,
    onDelivery: () -> Unit,
) {
    val status = RelayShipmentBuckets.statusOf(shipment)
    val isDest = relayPointId != null && shipment.destinationRelayId.equals(relayPointId, ignoreCase = true)
    val isOrigin = relayPointId != null && shipment.originRelayId.equals(relayPointId, ignoreCase = true)
    val cashPending = shipment.paymentMethod?.lowercase() == "relay_cash" &&
        shipment.paymentStatus?.lowercase() != "paid"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Détail colis", fontSize = 16.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") }
                },
            )
        },
    ) { padding ->
        if (loading && shipment.senderPhone.isNullOrBlank()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = OrangePrimary)
            }
            return@Scaffold
        }
        Column(
            Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RelayStatusBadge(status)
                RelayPaymentBadge(shipment.paymentStatus)
            }
            shipment.shipmentCode?.let {
                RelayDetailRow("N° d'envoi (sur colis)", it, highlight = true)
            }
            RelayDetailRow("N° de suivi", shipment.trackingNumber, highlight = true)
            RelayDetailRow("Statut logistique", RelayDisplayFormat.statusLabel(status))
            shipment.effectiveStatus?.takeIf { it != status }?.let {
                RelayDetailRow("Statut effectif", RelayDisplayFormat.statusLabel(it))
            }

            RelayInfoSection("Expéditeur", Icons.Default.Person) {
                RelayDetailRow("Nom", RelayDisplayFormat.personName(shipment.senderFirstName, shipment.senderLastName))
                shipment.senderPhone?.let { RelayDetailRow("Téléphone", it) }
                shipment.senderEmail?.let { RelayDetailRow("E-mail", it) }
                RelayDetailRow(
                    "Adresse",
                    RelayDisplayFormat.addressLine(shipment.senderCommune, shipment.senderAddress),
                )
            }

            RelayInfoSection("Destinataire", Icons.Default.Person) {
                RelayDetailRow("Nom", RelayDisplayFormat.personName(shipment.recipientFirstName, shipment.recipientLastName))
                shipment.recipientPhone?.let { RelayDetailRow("Téléphone", it) }
                shipment.recipientEmail?.let { RelayDetailRow("E-mail", it) }
                RelayDetailRow(
                    "Adresse",
                    RelayDisplayFormat.addressLine(shipment.recipientCommune, shipment.recipientAddress),
                )
            }

            RelayInfoSection("Colis", Icons.Default.Inventory2) {
                RelayDetailRow("Type", RelayDisplayFormat.packageTypeLabel(shipment.packageType))
                shipment.weight?.let { RelayDetailRow("Poids", "$it kg") }
                RelayDetailRow("Mode", RelayDisplayFormat.deliveryModeLabel(shipment))
                shipment.pickupMethod?.let { RelayDetailRow("Mode retrait", it) }
                if (shipment.relayAssisted == true) RelayDetailRow("Assistance relais", "Oui")
                shipment.pickupCode?.let { RelayDetailRow("Code retrait", it, highlight = true) }
            }

            RelayInfoSection("Parcours relais", Icons.Default.Map) {
                RelayDetailRow("Relais d'origine", RelayDisplayFormat.relayLabel(shipment, origin = true))
                RelayDetailRow("Relais de destination", RelayDisplayFormat.relayLabel(shipment, origin = false))
                shipment.deliveryZoneName?.let { RelayDetailRow("Zone livraison", it) }
                when {
                    isDest -> RelayDetailRow("Votre rôle", "Relais de destination")
                    isOrigin -> RelayDetailRow("Votre rôle", "Relais d'origine")
                    else -> RelayDetailRow("Votre rôle", "Autre relais / réseau")
                }
            }

            RelayInfoSection("Paiement", Icons.Default.Payments) {
                RelayDetailRow("Méthode", RelayDisplayFormat.paymentMethodLabel(shipment.paymentMethod))
                RelayDetailRow("Statut", RelayDisplayFormat.paymentStatusLabel(shipment.paymentStatus))
                shipment.relayCashPayment?.let { cash ->
                    RelayDetailRow("Espèces — statut", cash.status ?: "—")
                    cash.amountExpected?.let { RelayDetailRow("Montant attendu", RelayDisplayFormat.formatFcfa(it)) }
                    cash.amountCollected?.let { RelayDetailRow("Montant encaissé", RelayDisplayFormat.formatFcfa(it)) }
                }
                shipment.mobileMoneyPayment?.let { mm ->
                    RelayDetailRow("Mobile Money — statut", mm.status ?: "—")
                    mm.transactionId?.let { RelayDetailRow("Transaction", it) }
                }
            }

            RelayInfoSection("Montants", Icons.Default.Receipt) {
                shipment.price?.let { RelayDetailRow("Expédition", RelayDisplayFormat.formatFcfa(it)) }
                shipment.printingFee?.takeIf { it > 0 }?.let { RelayDetailRow("Impression relais", RelayDisplayFormat.formatFcfa(it)) }
                shipment.assistanceFee?.takeIf { it > 0 }?.let { RelayDetailRow("Assistance", RelayDisplayFormat.formatFcfa(it)) }
                shipment.boxPrice?.takeIf { it > 0 }?.let { RelayDetailRow("Carton", RelayDisplayFormat.formatFcfa(it)) }
                RelayDetailRow("Total", RelayDisplayFormat.formatFcfa(RelayDisplayFormat.shipmentTotal(shipment)), highlight = true)
            }

            RelayInfoSection("Dates", Icons.Default.Schedule) {
                RelayDetailRow("Créé le", RelayDisplayFormat.formatDateTime(shipment.createdAt))
                RelayDetailRow("Mis à jour", RelayDisplayFormat.formatDateTime(shipment.updatedAt))
            }

            Text("Actions", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            when {
                status == "READY_FOR_DROP_OFF" -> RelayActionButton("Réceptionner (dépôt réseau)", busy, onIntake)
                status == "IN_TRANSIT" || status == "CARRIER_COLLECTED" ->
                    RelayActionButton("Réception finale au relais", busy, onFinalIntake)
                status == "RELAY_FINAL_RECEIVED" -> RelayActionButton("Rendre disponible au retrait", busy, onMakeAvailable)
                cashPending || (status.contains("PAYMENT") && shipment.paymentStatus?.lowercase() != "paid") ->
                    RelayActionButton("Confirmer paiement espèces", busy, onConfirmCash)
                status == "AVAILABLE_FOR_PICKUP" -> RelayActionButton("Remise au client (code retrait)", busy, onDelivery)
            }
        }
    }
}

@Composable
private fun RelayActionButton(label: String, busy: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = !busy,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(OrangePrimary),
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        else Text(label, fontWeight = FontWeight.Bold)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RelayPhoneSearchScreen(
    busy: Boolean,
    results: List<ShipmentDto>,
    onBack: () -> Unit,
    onSearch: (String) -> Unit,
    onSelect: (ShipmentDto) -> Unit,
) {
    var phone by remember { mutableStateOf("") }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Recherche") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") } },
            )
        },
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp)) {
            Text(
                "Saisissez un numéro de téléphone (expéditeur ou destinataire), un n° de suivi ou un ID transporteur.",
                fontSize = 13.sp,
                color = Gray600,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Recherche") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                leadingIcon = { Icon(Icons.Default.Search, null) },
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = { onSearch(phone.trim()) },
                enabled = phone.length >= 6 && !busy,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(OrangePrimary),
            ) {
                if (busy) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Valider")
            }
            Spacer(Modifier.height(16.dp))
            if (results.isEmpty() && phone.length >= 6 && !busy) {
                Text("Aucun colis trouvé.", color = Gray500, modifier = Modifier.padding(16.dp))
            }
            results.forEach { s ->
                RelayRichShipmentCard(s, { onSelect(s) }, Modifier.padding(vertical = 6.dp))
            }
        }
    }
}
