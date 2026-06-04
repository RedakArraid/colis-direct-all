package ci.colisdirect.app.ui.screens.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.DeliveryOfferDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.TransporterRideFormat
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.TransporterViewModel

private enum class CourierTab { Home, Courses, Gains, Profile }

private sealed class CourierOverlay {
    data object None : CourierOverlay()
    data class OfferDetail(val offer: DeliveryOfferDto) : CourierOverlay()
    data class AssignmentDetail(val shipment: ShipmentDto) : CourierOverlay()
    data class Active(val shipment: ShipmentDto) : CourierOverlay()
    data class Proof(val shipment: ShipmentDto) : CourierOverlay()
    data object History : CourierOverlay()
}

/** App livreur — données web, UI maquette mobile. */
@Composable
fun CourierMainScreen(
    onLogout: () -> Unit,
    onPickupEntry: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: TransporterViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var tab by remember { mutableStateOf(CourierTab.Home) }
    var overlay by remember { mutableStateOf<CourierOverlay>(CourierOverlay.None) }
    var courseFilter by remember { mutableIntStateOf(0) }
    var showWithdrawDialog by remember { mutableStateOf(false) }
    var withdrawPhone by remember { mutableStateOf(authState.user?.phone.orEmpty()) }

    val activeRides = remember(state.assignments) { viewModel.activeAssignments }
    val profile = state.profile
    val ini = TransporterRideFormat.initials(
        profile?.firstName ?: authState.user?.firstName,
        profile?.lastName ?: authState.user?.lastName,
    )
    val displayName = remember(profile, authState.user) {
        listOfNotNull(
            profile?.firstName ?: authState.user?.firstName,
            profile?.lastName ?: authState.user?.lastName,
        ).joinToString(" ").trim().ifBlank { "Livreur" }
    }
    val rating = profile?.rating?.let { "%.1f".format(it) } ?: "5.0"
    val successRate = profile?.successRate?.let { "$it%" } ?: "100%"
    val deliveryCount = profile?.totalDeliveries ?: state.deliveredShipments.size

    LaunchedEffect(Unit) { viewModel.loadDashboard() }

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

    val filteredOffers = remember(state.offers, courseFilter) {
        when (courseFilter) {
            3 -> state.offers.sortedByDescending { TransporterRideFormat.earningsFcfa(it) }
            else -> state.offers
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        when (val o = overlay) {
            is CourierOverlay.OfferDetail -> CourierOfferDetailScreen(
                offer = o.offer,
                busy = state.isLoading,
                onBack = { overlay = CourierOverlay.None },
                onDecline = {
                    viewModel.declineOffer(o.offer.id)
                    overlay = CourierOverlay.None
                },
                onAccept = {
                    viewModel.acceptOffer(o.offer.id) {
                        overlay = CourierOverlay.Active(
                            viewModel.activeAssignments.firstOrNull()
                                ?: return@acceptOffer,
                        )
                        tab = CourierTab.Courses
                    }
                },
            )
            is CourierOverlay.AssignmentDetail -> CourierAssignmentDetailScreen(
                shipment = o.shipment,
                onBack = { overlay = CourierOverlay.None },
                onStart = {
                    overlay = CourierOverlay.Active(o.shipment)
                },
            )
            is CourierOverlay.Active -> CourierActiveScreen(
                shipment = o.shipment,
                onBack = { overlay = CourierOverlay.None },
                onProof = { overlay = CourierOverlay.Proof(o.shipment) },
            )
            is CourierOverlay.Proof -> CourierProofScreen(
                shipment = o.shipment,
                onBack = { overlay = CourierOverlay.Active(o.shipment) },
                onSuccess = {
                    overlay = CourierOverlay.History
                    tab = CourierTab.Courses
                },
                viewModel = viewModel,
            )
            CourierOverlay.History -> CourierHistoryScreen(
                shipments = state.deliveredShipments,
                onBack = { overlay = CourierOverlay.None },
            )
            CourierOverlay.None -> {
                Scaffold(
                    modifier = Modifier.padding(padding),
                    bottomBar = {
                        NavigationBar(containerColor = Color.White) {
                            listOf(
                                CourierTab.Home to ("Accueil" to Icons.Default.Home),
                                CourierTab.Courses to ("Courses" to Icons.Default.LocalShipping),
                                CourierTab.Gains to ("Gains" to Icons.Default.AccountBalanceWallet),
                                CourierTab.Profile to ("Profil" to Icons.Default.Person),
                            ).forEach { (t, pair) ->
                                NavigationBarItem(
                                    selected = tab == t,
                                    onClick = { tab = t },
                                    icon = { Icon(pair.second, pair.first) },
                                    label = { Text(pair.first, fontSize = 11.sp) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = OrangePrimary,
                                        selectedTextColor = OrangePrimary,
                                        indicatorColor = OrangeLight,
                                    ),
                                )
                            }
                        }
                    },
                ) { innerPadding ->
                    Box(Modifier.fillMaxSize().padding(innerPadding)) {
                        when (tab) {
                            CourierTab.Home -> CourierHomeTab(
                                initials = ini,
                                name = displayName,
                                isOnline = state.isOnline,
                                onToggleOnline = viewModel::setOnline,
                                showBellBadge = state.offers.isNotEmpty(),
                                onBellClick = { tab = CourierTab.Courses },
                                stats = listOf(
                                    Icons.Default.LocalShipping to (activeRides.size.toString() to "Courses en cours"),
                                    Icons.Default.AccountBalanceWallet to (
                                        TransporterRideFormat.formatFcfa(state.walletStats.today) to "Gains aujourd'hui"
                                    ),
                                    Icons.Default.Star to (rating to "Note moyenne"),
                                    Icons.Default.CheckCircle to (successRate to "Taux de réussite"),
                                ),
                                offers = state.offers,
                                activeRide = activeRides.firstOrNull(),
                                delivered = state.deliveredShipments,
                                isLoading = state.isLoading,
                                onSeeAllOffers = { tab = CourierTab.Courses },
                                onSeeHistory = { overlay = CourierOverlay.History },
                                onOfferClick = { overlay = CourierOverlay.OfferDetail(it) },
                                onActiveClick = { overlay = CourierOverlay.Active(it) },
                            )
                            CourierTab.Courses -> CourierCoursesTab(
                                offers = filteredOffers,
                                assignments = activeRides,
                                filterIndex = courseFilter,
                                onFilterChange = { courseFilter = it },
                                isLoading = state.isLoading,
                                onRefresh = { viewModel.loadDashboard() },
                                onPickupEntry = onPickupEntry,
                                onOfferClick = { overlay = CourierOverlay.OfferDetail(it) },
                                onAssignmentClick = { overlay = CourierOverlay.AssignmentDetail(it) },
                                onHistory = { overlay = CourierOverlay.History },
                            )
                            CourierTab.Gains -> CourierGainsTab(
                                weekFcfa = TransporterRideFormat.formatFcfa(state.walletStats.week),
                                todayFcfa = TransporterRideFormat.formatFcfa(state.walletStats.today),
                                monthFcfa = TransporterRideFormat.formatFcfa(state.walletStats.month),
                                balanceFcfa = TransporterRideFormat.formatFcfa(state.wallet?.balanceFcfa),
                                deliveredCount = state.deliveredShipments.size,
                                activeCount = activeRides.size,
                                transactions = state.walletTransactions,
                                onLoadTransactions = { viewModel.loadWalletTransactions() },
                                onWithdraw = { showWithdrawDialog = true },
                            )
                            CourierTab.Profile -> CourierProfileTab(
                                initials = ini,
                                name = displayName,
                                rating = rating,
                                deliveryCount = deliveryCount,
                                profile = profile,
                                userEmail = authState.user?.email ?: profile?.email,
                                userPhone = authState.user?.phone ?: profile?.phone,
                                isOnline = state.isOnline,
                                onToggleOnline = viewModel::setOnline,
                                onHome = { tab = CourierTab.Home },
                                onCourses = { tab = CourierTab.Courses },
                                onGains = {
                                    viewModel.loadWalletTransactions()
                                    tab = CourierTab.Gains
                                },
                                onHistory = {
                                    viewModel.loadDeliveredShipments()
                                    overlay = CourierOverlay.History
                                },
                                onPickupEntry = onPickupEntry,
                                onRefresh = { viewModel.loadDashboard() },
                                onLogout = onLogout,
                                onSubScreenUnavailable = {
                                    scope.launch { snackbar.showSnackbar("Disponible sur la version web livreur") }
                                },
                            )
                        }
                        if (state.isLoading && tab == CourierTab.Home) {
                            CircularProgressIndicator(
                                Modifier.align(Alignment.Center),
                                color = OrangePrimary,
                            )
                        }
                    }
                }
            }
        }
    }

    if (showWithdrawDialog) {
        AlertDialog(
            onDismissRequest = { showWithdrawDialog = false },
            title = { Text("Retirer mes gains") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Solde : ${TransporterRideFormat.formatFcfa(state.wallet?.balanceFcfa)} FCFA (min. 5 000)")
                    OutlinedTextField(
                        value = withdrawPhone,
                        onValueChange = { withdrawPhone = it },
                        label = { Text("Numéro Mobile Money") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showWithdrawDialog = false
                        viewModel.requestWithdrawal(withdrawPhone) {
                            viewModel.loadWalletTransactions()
                        }
                    },
                ) { Text("Confirmer") }
            },
            dismissButton = {
                TextButton(onClick = { showWithdrawDialog = false }) { Text("Annuler") }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourierHomeTab(
    initials: String,
    name: String,
    isOnline: Boolean,
    onToggleOnline: (Boolean) -> Unit,
    showBellBadge: Boolean,
    onBellClick: () -> Unit,
    stats: List<Pair<androidx.compose.ui.graphics.vector.ImageVector, Pair<String, String>>>,
    offers: List<DeliveryOfferDto>,
    activeRide: ShipmentDto?,
    delivered: List<ShipmentDto>,
    isLoading: Boolean,
    onSeeAllOffers: () -> Unit,
    onSeeHistory: () -> Unit,
    onOfferClick: (DeliveryOfferDto) -> Unit,
    onActiveClick: (ShipmentDto) -> Unit,
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        CourierDarkHeader(
            initials = initials,
            greeting = "Bonjour 👋",
            name = name,
            isOnline = isOnline,
            onToggleOnline = onToggleOnline,
            onBellClick = onBellClick,
            showBellBadge = showBellBadge,
        )
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            stats.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { (icon, data) ->
                        CourierStatCard(icon, data.first, data.second, Modifier.weight(1f))
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Nouvelles offres (${offers.size})", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                TextButton(onClick = onSeeAllOffers) { Text("Voir tout", color = OrangePrimary) }
            }
            if (offers.isEmpty() && !isLoading) {
                Text("Recherche de courses…", color = Gray500, fontSize = 13.sp, modifier = Modifier.padding(8.dp))
            }
            offers.take(3).forEach { offer ->
                CourierOfferCard(
                    from = TransporterRideFormat.fromOf(offer),
                    to = TransporterRideFormat.toOf(offer),
                    packageLabel = TransporterRideFormat.packageLabel(offer.packageType, offer.weight),
                    priceFcfa = TransporterRideFormat.formatFcfa(TransporterRideFormat.earningsFcfa(offer)),
                    onClick = { onOfferClick(offer) },
                )
            }
            activeRide?.let { ride ->
                Text("Course active", fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.padding(top = 8.dp))
                Card(
                    onClick = { onActiveClick(ride) },
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(ride.trackingNumber, fontWeight = FontWeight.Bold, color = OrangePrimary)
                        Text(
                            "${TransporterRideFormat.fromOf(ride)} → ${TransporterRideFormat.toOf(ride)}",
                            fontSize = 13.sp,
                            color = Gray600,
                        )
                        Text("Suivre la course", color = OrangePrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Courses récentes", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                TextButton(onClick = onSeeHistory) { Text("Historique", color = OrangePrimary) }
            }
            delivered.take(3).forEach { s ->
                Text(
                    "${TransporterRideFormat.fromOf(s)} → ${TransporterRideFormat.toOf(s)} · +${TransporterRideFormat.formatFcfa(s.price)} F",
                    fontSize = 12.sp,
                    color = Gray700,
                )
            }
        }
    }
}

@Composable
private fun CourierCoursesTab(
    offers: List<DeliveryOfferDto>,
    assignments: List<ShipmentDto>,
    filterIndex: Int,
    onFilterChange: (Int) -> Unit,
    isLoading: Boolean,
    onRefresh: () -> Unit,
    onPickupEntry: () -> Unit,
    onOfferClick: (DeliveryOfferDto) -> Unit,
    onAssignmentClick: (ShipmentDto) -> Unit,
    onHistory: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Offres & colis", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            IconButton(onClick = onRefresh) { Icon(Icons.Default.Refresh, "Actualiser") }
        }
        CourierFilterChips(
            listOf("Toutes", "Express", "Proche", "Mieux payées"),
            filterIndex,
            onFilterChange,
        )
        OutlinedButton(
            onClick = onPickupEntry,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        ) {
            Icon(Icons.Default.Edit, null)
            Spacer(Modifier.width(8.dp))
            Text("Saisir un n° de suivi")
        }
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (offers.isNotEmpty()) {
                item { Text("Offres disponibles", fontWeight = FontWeight.Bold, color = Gray700) }
                items(offers, key = { it.id }) { offer ->
                    CourierOfferCard(
                        from = TransporterRideFormat.fromOf(offer),
                        to = TransporterRideFormat.toOf(offer),
                        packageLabel = TransporterRideFormat.packageLabel(offer.packageType, offer.weight),
                        priceFcfa = TransporterRideFormat.formatFcfa(TransporterRideFormat.earningsFcfa(offer)),
                        tag = if (offer.pickupMethod == "home_pickup") "Express" else null,
                        onClick = { onOfferClick(offer) },
                        footer = {
                            Icon(Icons.Default.Place, null, tint = Gray500, modifier = Modifier.size(14.dp))
                            Text(TransporterRideFormat.toOf(offer), fontSize = 12.sp, color = Gray500)
                            Spacer(Modifier.weight(1f))
                            Text("Détails", color = OrangePrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        },
                    )
                }
            }
            if (assignments.isNotEmpty()) {
                item { Text("Mes colis assignés", fontWeight = FontWeight.Bold, color = Gray700) }
                items(assignments, key = { it.id }) { s ->
                    CourierOfferCard(
                        from = TransporterRideFormat.fromOf(s),
                        to = TransporterRideFormat.toOf(s),
                        packageLabel = TransporterRideFormat.packageLabel(s.packageType, s.weight),
                        priceFcfa = TransporterRideFormat.formatFcfa(TransporterRideFormat.earningsFcfa(s)),
                        onClick = { onAssignmentClick(s) },
                        footer = {
                            Text(s.trackingNumber, fontSize = 11.sp, color = Gray500)
                            Spacer(Modifier.weight(1f))
                            StatusBadgeCompact(s.currentStatus)
                        },
                    )
                }
            }
            if (offers.isEmpty() && assignments.isEmpty() && !isLoading) {
                item {
                    Text(
                        "Aucune course pour le moment",
                        modifier = Modifier.padding(32.dp),
                        color = Gray500,
                    )
                }
            }
            item {
                TextButton(onClick = onHistory, modifier = Modifier.fillMaxWidth()) {
                    Text("Historique des livraisons")
                }
            }
        }
    }
}

@Composable
private fun StatusBadgeCompact(status: String?) {
    Text(
        status?.replace('_', ' ') ?: "",
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        color = OrangePrimary,
    )
}

@Composable
private fun CourierGainsTab(
    weekFcfa: String,
    todayFcfa: String,
    monthFcfa: String,
    balanceFcfa: String,
    deliveredCount: Int,
    activeCount: Int,
    transactions: List<ci.colisdirect.app.data.api.model.WalletTransactionDto>,
    onLoadTransactions: () -> Unit,
    onWithdraw: () -> Unit,
) {
    LaunchedEffect(Unit) { onLoadTransactions() }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(Brush.linearGradient(listOf(NavyDark, Color(0xFF222222))))
                .padding(24.dp),
        ) {
            Column {
                Text("Gains cette semaine", color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
                Text("$weekFcfa FCFA", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp)
                Text("Aujourd'hui : $todayFcfa FCFA", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
            }
        }
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CourierStatCard(Icons.Default.LocalShipping, "$deliveredCount", "Courses accomplies", Modifier.weight(1f))
                CourierStatCard(Icons.Default.AccountBalanceWallet, monthFcfa, "Gains du mois", Modifier.weight(1f))
            }
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(18.dp)) {
                    Text("Solde disponible", fontSize = 12.sp, color = Gray500)
                    Text("$balanceFcfa FCFA", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = OrangePrimary)
                    Button(
                        onClick = onWithdraw,
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                    ) {
                        Text("Retirer mes gains", fontWeight = FontWeight.Bold)
                    }
                    Text(
                        "Virement Mobile Money sous 24h",
                        fontSize = 11.sp,
                        color = Gray500,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
            Text("Dernières transactions", fontWeight = FontWeight.Bold)
            transactions.take(10).forEach { tx ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(tx.trackingNumber ?: tx.type ?: "—", fontSize = 12.sp)
                    Text(
                        "${if ((tx.amountFcfa ?: 0.0) >= 0) "+" else ""}${TransporterRideFormat.formatFcfa(tx.amountFcfa)} F",
                        fontWeight = FontWeight.Bold,
                        color = SuccessGreen,
                    )
                }
            }
        }
    }
}

@Composable
private fun CourierProfileTab(
    initials: String,
    name: String,
    rating: String,
    deliveryCount: Int,
    profile: ci.colisdirect.app.data.api.model.TransporterProfileDto?,
    userEmail: String?,
    userPhone: String?,
    isOnline: Boolean,
    onToggleOnline: (Boolean) -> Unit,
    onHome: () -> Unit,
    onCourses: () -> Unit,
    onGains: () -> Unit,
    onHistory: () -> Unit,
    onPickupEntry: () -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit,
    onSubScreenUnavailable: () -> Unit = {},
) {
    val openUri = rememberCourierProfileUriHandler()
    val items = ProfileVisibility.visibleCourierProfileItems()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(NavyDark)
                .statusBarsPadding()
                .padding(20.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    Modifier.size(68.dp).clip(CircleShape).background(OrangePrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initials, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
                }
                Column {
                    Text(name, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, null, tint = Color(0xFFFFC93C), modifier = Modifier.size(16.dp))
                        Text("$rating · $deliveryCount livraisons", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                    }
                    CourierPill("Livreur vérifié", bg = Color(0xFF34D058).copy(alpha = 0.18f), color = Color(0xFF34D058))
                }
            }
        }
        Column(Modifier.padding(16.dp)) {
            Card(shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Box(
                        Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(OrangeLight),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.LocalShipping, null, tint = OrangePrimary)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            "${profile?.vehicleType ?: "Véhicule"} · ${profile?.licensePlate ?: "—"}",
                            fontWeight = FontWeight.Bold,
                        )
                        Text("Code : ${profile?.transporterCode ?: "—"}", fontSize = 12.sp, color = Gray500)
                    }
                    CourierPill("Actif", bg = SuccessLight, color = SuccessGreen)
                }
            }
            profile?.email?.let { email ->
                CourierProfileMenuRow(Icons.Default.Email, email, { openUri("mailto:$email") })
            }
            userPhone?.let { phone ->
                CourierProfileMenuRow(Icons.Default.Phone, phone, { openUri("tel:$phone") })
            }
            if (ProfileVisibility.CourierProfileItem.AVAILABILITY_TOGGLE in items) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Disponible pour les courses", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Switch(
                        checked = isOnline,
                        onCheckedChange = onToggleOnline,
                        colors = SwitchDefaults.colors(checkedThumbColor = OrangePrimary, checkedTrackColor = OrangeLight),
                    )
                }
                HorizontalDivider(color = Gray300)
            }
            if (ProfileVisibility.CourierProfileItem.PERSONAL_INFO in items) {
                CourierProfileMenuRow(Icons.Default.Person, "Informations personnelles", onSubScreenUnavailable)
            }
            if (ProfileVisibility.CourierProfileItem.DOCUMENTS in items) {
                CourierProfileMenuRow(Icons.Default.VerifiedUser, "Documents & vérifications", onSubScreenUnavailable)
            }
            if (ProfileVisibility.CourierProfileItem.PAYMENTS in items) {
                CourierProfileMenuRow(Icons.Default.CreditCard, "Moyens de paiement", onSubScreenUnavailable)
            }
            if (ProfileVisibility.CourierProfileItem.EARNINGS_DETAIL in items) {
                CourierProfileMenuRow(Icons.Default.AccountBalanceWallet, "Détails des transactions", onGains)
            }
            if (ProfileVisibility.CourierProfileItem.DELIVERY_HISTORY in items) {
                CourierProfileMenuRow(Icons.Default.History, "Historique des livraisons", onHistory)
            }
            CourierProfileMenuRow(Icons.Default.Home, "Tableau de bord", onHome)
            CourierProfileMenuRow(Icons.Default.LocalShipping, "Mes courses", onCourses)
            CourierProfileMenuRow(Icons.Default.Edit, "Saisir un colis (ramassage)", onPickupEntry)
            if (ProfileVisibility.CourierProfileItem.NOTIFICATIONS in items) {
                CourierProfileMenuRow(Icons.Default.Notifications, "Préférences notifications", onSubScreenUnavailable)
            }
            if (ProfileVisibility.CourierProfileItem.SUPPORT in items) {
                CourierProfileMenuRow(
                    Icons.Default.SupportAgent,
                    "Aide & centre de support",
                    { openUri("mailto:support@colisdirect.ci") },
                )
            }
            if (ProfileVisibility.CourierProfileItem.ACCOUNT_SETTINGS in items) {
                CourierProfileMenuRow(Icons.Default.Settings, "Paramètres du compte", onSubScreenUnavailable)
            }
            if (ProfileVisibility.CourierProfileItem.REFRESH in items) {
                CourierProfileMenuRow(Icons.Default.Refresh, "Actualiser le profil", onRefresh)
            }
            if (ProfileVisibility.CourierProfileItem.LOGOUT in items) {
                CourierProfileMenuRow(Icons.Default.Logout, "Déconnexion", onLogout, danger = true)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourierOfferDetailScreen(
    offer: DeliveryOfferDto,
    busy: Boolean,
    onBack: () -> Unit,
    onDecline: () -> Unit,
    onAccept: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.height(220.dp).fillMaxWidth()) {
            CourierMapPlaceholder(Modifier.fillMaxSize(), route = true)
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
            )
        }
        Column(
            Modifier
                .fillMaxWidth()
                .offset(y = (-22).dp)
                .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                .background(Color.White)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Box(Modifier.width(40.dp).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Gray300).align(Alignment.CenterHorizontally))
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                CourierPill("Détails de l'offre")
                Text(
                    "${TransporterRideFormat.formatFcfa(TransporterRideFormat.earningsFcfa(offer))} FCFA",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    color = OrangePrimary,
                )
            }
            Spacer(Modifier.height(16.dp))
            CourierRouteSection(
                pickupLabel = "ENLÈVEMENT",
                pickupTitle = offer.originRelayName ?: offer.senderCommune ?: "—",
                pickupSub = "${offer.senderFirstName ?: ""} ${offer.senderLastName ?: ""} · ${offer.senderPhone ?: ""}",
                deliveryLabel = "DESTINATION",
                deliveryTitle = offer.destinationRelayName ?: offer.recipientCommune ?: "—",
                deliverySub = "${offer.recipientFirstName ?: ""} ${offer.recipientLastName ?: ""} · ${offer.recipientPhone ?: ""}",
            )
            Spacer(Modifier.height(16.dp))
            CourierMetaRow(
                listOf(
                    "Poids" to "${offer.weight ?: "?"} kg",
                    "Type" to (offer.packageType ?: "Colis"),
                    "Suivi" to (offer.trackingNumber ?: "—"),
                ),
            )
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onDecline, modifier = Modifier.weight(1f), enabled = !busy) {
                    Text("Refuser")
                }
                Button(
                    onClick = onAccept,
                    modifier = Modifier.weight(1f),
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                ) {
                    Text("Accepter la course", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourierAssignmentDetailScreen(
    shipment: ShipmentDto,
    onBack: () -> Unit,
    onStart: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.height(220.dp).fillMaxWidth()) {
            CourierMapPlaceholder(Modifier.fillMaxSize(), route = true)
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
            )
        }
        Column(
            Modifier
                .fillMaxWidth()
                .offset(y = (-22).dp)
                .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                .background(Color.White)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                CourierPill("Colis assigné")
                Text(
                    "${TransporterRideFormat.formatFcfa(TransporterRideFormat.earningsFcfa(shipment))} FCFA",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    color = OrangePrimary,
                )
            }
            Spacer(Modifier.height(16.dp))
            CourierRouteSection(
                pickupLabel = "ENLÈVEMENT",
                pickupTitle = shipment.originRelayName ?: shipment.senderCommune ?: "—",
                pickupSub = "${shipment.senderFirstName ?: ""} ${shipment.senderLastName ?: ""} · ${shipment.senderPhone ?: ""}",
                deliveryLabel = "DESTINATION",
                deliveryTitle = shipment.destinationRelayName ?: shipment.recipientCommune ?: "—",
                deliverySub = "${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""} · ${shipment.recipientPhone ?: ""}",
            )
            Spacer(Modifier.height(16.dp))
            CourierMetaRow(
                listOf(
                    "Poids" to "${shipment.weight ?: "?"} kg",
                    "Type" to (shipment.packageType ?: "Colis"),
                    "Suivi" to shipment.trackingNumber,
                ),
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onStart,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                Text("Continuer la course", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun CourierActiveScreen(
    shipment: ShipmentDto,
    onBack: () -> Unit,
    onProof: () -> Unit,
) {
    val context = LocalContext.current
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.height(260.dp).fillMaxWidth()) {
            CourierMapPlaceholder(Modifier.fillMaxSize())
            Column(Modifier.padding(16.dp).statusBarsPadding()) {
                Card(colors = CardDefaults.cardColors(NavyDark)) {
                    Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Default.LocalShipping, null, tint = OrangePrimary)
                        Column {
                            Text("En route vers la livraison", color = Color.White, fontWeight = FontWeight.Bold)
                            Text("N° ${shipment.trackingNumber}", color = Color.White.copy(alpha = 0.6f), fontSize = 11.sp)
                        }
                    }
                }
            }
            IconButton(onClick = onBack, modifier = Modifier.align(Alignment.TopStart)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
            }
        }
        Column(
            Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    Modifier.size(48.dp).clip(CircleShape).background(OrangePrimary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        TransporterRideFormat.initials(shipment.recipientFirstName, shipment.recipientLastName),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        "${shipment.recipientFirstName ?: ""} ${shipment.recipientLastName ?: ""}".trim(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                    Text("Destinataire · ${shipment.recipientPhone ?: "—"}", fontSize = 12.sp, color = Gray500)
                }
                shipment.recipientPhone?.let { phone ->
                    IconButton(
                        onClick = {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                        },
                    ) {
                        Icon(Icons.Default.Phone, null)
                    }
                }
            }
            CourierRouteSection(
                pickupLabel = "RÉCUPÉRATION",
                pickupTitle = TransporterRideFormat.fromOf(shipment),
                pickupSub = "✓ Colis récupéré",
                deliveryLabel = "LIVRAISON",
                deliveryTitle = shipment.recipientAddress ?: TransporterRideFormat.toOf(shipment),
                deliverySub = shipment.recipientCommune ?: "",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Card(Modifier.weight(1f)) {
                    Column(Modifier.padding(12.dp)) {
                        Text("MONTANT", fontSize = 10.sp, color = Gray500)
                        Text("${TransporterRideFormat.formatFcfa(shipment.price)} FCFA", fontWeight = FontWeight.Bold, color = OrangePrimary)
                    }
                }
                Card(Modifier.weight(1f)) {
                    Column(Modifier.padding(12.dp)) {
                        Text("TYPE", fontSize = 10.sp, color = Gray500)
                        Text(TransporterRideFormat.packageLabel(shipment.packageType, shipment.weight), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
            OutlinedButton(
                onClick = {
                    val dest = Uri.encode(shipment.recipientAddress ?: TransporterRideFormat.toOf(shipment))
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$dest")),
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Map, null)
                Spacer(Modifier.width(8.dp))
                Text("Ouvrir le GPS")
            }
            Button(
                onClick = onProof,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                Text("Confirmer la livraison", fontWeight = FontWeight.Bold)
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourierProofScreen(
    shipment: ShipmentDto,
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: TransporterViewModel,
) {
    val state by viewModel.uiState.collectAsState()
    var pickupCode by remember { mutableStateOf("") }
    var recipientPhone by remember { mutableStateOf(shipment.recipientPhone.orEmpty()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Preuve de livraison") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Card(colors = CardDefaults.cardColors(SuccessLight), shape = RoundedCornerShape(14.dp)) {
                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(28.dp))
                    Column {
                        Text("Vous êtes à destination !", fontWeight = FontWeight.Bold, color = Color(0xFF0F5A2B))
                        Text("Colis ${shipment.trackingNumber}", fontSize = 12.sp, color = Color(0xFF0F5A2B).copy(alpha = 0.85f))
                    }
                }
            }
            Text("Code de retrait du destinataire *", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            OutlinedTextField(
                value = pickupCode,
                onValueChange = { pickupCode = it.trim() },
                placeholder = { Text("Code à 4 chiffres ou plus") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )
            OutlinedTextField(
                value = recipientPhone,
                onValueChange = { recipientPhone = it },
                label = { Text("Tél. destinataire (vérif.)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Button(
                onClick = {
                    viewModel.deliverToCustomer(
                        trackingNumber = shipment.trackingNumber,
                        pickupCode = pickupCode,
                        recipientIdentifier = recipientPhone.ifBlank { null },
                        onSuccess = onSuccess,
                    )
                },
                enabled = pickupCode.length >= 4 && !state.isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Confirmer la livraison", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourierHistoryScreen(shipments: List<ShipmentDto>, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Historique") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour") } },
            )
        },
    ) { padding ->
        LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(16.dp)) {
            if (shipments.isEmpty()) {
                item { Text("Aucune livraison", color = Gray500, modifier = Modifier.padding(24.dp)) }
            } else {
                items(shipments, key = { it.id }) { s ->
                    Card(Modifier.fillMaxWidth().padding(vertical = 6.dp), shape = RoundedCornerShape(14.dp)) {
                        Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(
                                Modifier.size(42.dp).clip(RoundedCornerShape(10.dp)).background(SuccessLight),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen)
                            }
                            Column(Modifier.weight(1f)) {
                                Text(
                                    "${TransporterRideFormat.fromOf(s)} → ${TransporterRideFormat.toOf(s)}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                )
                                Text(s.trackingNumber, fontSize = 11.sp, color = Gray500)
                                Text(
                                    formatTime(s.updatedAt ?: s.createdAt),
                                    fontSize = 11.sp,
                                    color = SuccessGreen,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Text(
                                "${TransporterRideFormat.formatFcfa(s.price)}",
                                fontWeight = FontWeight.ExtraBold,
                                color = Gray900,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatTime(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    val t = iso.substringAfter('T').take(5)
    return if (t.contains(':')) t else iso.take(10)
}
