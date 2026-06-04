package ci.colisdirect.app.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.RelayCashDashboardEntryDto
import ci.colisdirect.app.data.api.model.SupportTicketDto
import ci.colisdirect.app.domain.AdminDisplayFormat
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.RelayDisplayFormat
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AdminViewModel
import ci.colisdirect.app.viewmodel.AuthViewModel

private sealed class SupportOverlay {
    data object None : SupportOverlay()
    data class Ticket(val ticket: SupportTicketDto) : SupportOverlay()
}

/** Espace support — `CustomerSupportDashboard` (vue, tickets, paiements relais, profil). */
@Composable
fun SupportMainScreen(
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: AdminViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val state by viewModel.uiState.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var tab by remember { mutableIntStateOf(0) }
    var overlay by remember { mutableStateOf<SupportOverlay>(SupportOverlay.None) }

    val displayName = authState.user?.let {
        listOfNotNull(it.firstName, it.lastName).joinToString(" ").trim()
    }.orEmpty().ifBlank { "Support" }

    val relayCashPending = state.relayCashDashboard?.pending?.size ?: 0

    LaunchedEffect(Unit) {
        viewModel.setRole(authState.user?.role)
        viewModel.loadDashboard()
    }

    LaunchedEffect(tab) {
        if (tab == 2) viewModel.loadRelayCashDashboard()
    }

    LaunchedEffect(state.error, state.successMessage) {
        state.error?.let { snackbar.showSnackbar(it); viewModel.clearMessages() }
        state.successMessage?.let { snackbar.showSnackbar(it); viewModel.clearMessages() }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (overlay is SupportOverlay.None) {
                SupportBottomBar(tab, relayCashPending) { tab = it }
            }
        },
    ) { padding ->
        when (val o = overlay) {
            is SupportOverlay.Ticket -> AdminTicketDetailScreen(
                detail = state.ticketDetail,
                loading = state.isLoading,
                onBack = { viewModel.clearTicketDetail(); overlay = SupportOverlay.None },
                onReply = { viewModel.replyTicket(o.ticket.id, it) },
                onStatus = { viewModel.updateTicketStatus(o.ticket.id, it) },
            )
            SupportOverlay.None -> Box(Modifier.fillMaxSize().padding(padding).background(Gray50)) {
                when (tab) {
                    0 -> SupportHomeTab(state, displayName, { viewModel.loadDashboard() }) { t ->
                        viewModel.loadTicketDetail(t.id)
                        overlay = SupportOverlay.Ticket(t)
                    }
                    1 -> SupportTicketsTab(state, viewModel::loadSupportTickets) { t ->
                        viewModel.loadTicketDetail(t.id)
                        overlay = SupportOverlay.Ticket(t)
                    }
                    2 -> SupportRelayCashTab(state, { viewModel.loadRelayCashDashboard() })
                    3 -> SupportProfileTab(
                        name = displayName,
                        email = authState.user?.email,
                        phone = authState.user?.phone,
                        onRefresh = { viewModel.loadDashboard() },
                        onTicketsTab = { tab = 1 },
                        onRelayCashTab = {
                            viewModel.loadRelayCashDashboard()
                            tab = 2
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
private fun SupportHomeTab(
    state: ci.colisdirect.app.viewmodel.AdminUiState,
    displayName: String,
    onRefresh: () -> Unit,
    onTicketClick: (SupportTicketDto) -> Unit,
) {
    val dash = state.supportDashboard
    PullToRefreshBox(state.isLoading, onRefresh, Modifier.fillMaxSize()) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            AdminDarkHeader("Bonjour, $displayName", "Centre de support", "Agent support")
            Column(Modifier.padding(16.dp).offset(y = (-12).dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminMetricCard("Ouverts", "${dash?.open ?: 0}", Icons.Default.MarkChatUnread, Modifier.weight(1f))
                    AdminMetricCard("En cours", "${dash?.pending ?: 0}", Icons.Default.Schedule, Modifier.weight(1f))
                    AdminMetricCard("Escaladés", "${dash?.escalated ?: 0}", Icons.Default.Warning, Modifier.weight(1f), highlight = (dash?.escalated ?: 0) > 0)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AdminMetricCard("Résolus", "${dash?.resolved ?: 0}", Icons.Default.CheckCircle, Modifier.weight(1f))
                    AdminMetricCard("Fermés", "${dash?.closed ?: 0}", Icons.Default.Archive, Modifier.weight(1f))
                    AdminMetricCard("Urgents", "${dash?.urgent ?: 0}", Icons.Default.PriorityHigh, Modifier.weight(1f))
                }
            }
            Box(Modifier.padding(horizontal = 16.dp)) {
                AdminInfoSection("Performance support", Icons.Default.Speed) {
                    AdminKeyValueRow("Temps réponse moyen", "${dash?.avgResponseMinutes?.toInt() ?: 0} min")
                    AdminKeyValueRow("Tickets chargés", "${state.supportTickets.size}")
                }
            }
            if (!dash?.channelVolume.isNullOrEmpty()) {
                Box(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    AdminInfoSection("Volume par canal", Icons.Default.Forum) {
                        dash!!.channelVolume.forEach { ch ->
                            AdminKeyValueRow(ch.channel ?: "—", "${ch.count}")
                        }
                    }
                }
            }
            Text("Tickets récents", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
            state.supportTickets.take(10).forEach { t ->
                AdminTicketCard(t, { onTicketClick(t) }, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SupportTicketsTab(
    state: ci.colisdirect.app.viewmodel.AdminUiState,
    onLoad: (String?) -> Unit,
    onClick: (SupportTicketDto) -> Unit,
) {
    var filter by remember { mutableStateOf<String?>(ProfileVisibility.defaultSupportTicketFilter(false)) }
    LaunchedEffect(filter) { onLoad(filter) }
    Column(Modifier.fillMaxSize()) {
        AdminDarkHeader("Tickets", "${state.supportTickets.size}", null)
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "Tous", "open" to "Ouverts", "pending" to "En cours", "escalated" to "Escaladés").forEach { (s, label) ->
                FilterChip(selected = filter == s, onClick = { filter = s }, label = { Text(label) })
            }
        }
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.supportTickets, key = { it.id }) { t ->
                AdminTicketCard(t, { onClick(t) })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SupportRelayCashTab(
    state: ci.colisdirect.app.viewmodel.AdminUiState,
    onRefresh: () -> Unit,
) {
    val dash = state.relayCashDashboard
    PullToRefreshBox(state.relayCashLoading, onRefresh, Modifier.fillMaxSize()) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            AdminDarkHeader("Paiements Point Relais", "${dash?.pending?.size ?: 0} en attente", null)
            if (dash == null && !state.relayCashLoading) {
                Text(
                    "Aucune donnée — tirez pour actualiser.",
                    Modifier.padding(20.dp),
                    color = Gray500,
                )
            }
            dash?.summary?.byRelay?.take(8)?.forEach { row ->
                Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    AdminInfoSection(row.relayName ?: "Relais", Icons.Default.Store) {
                        AdminKeyValueRow("En attente", "${row.pendingCount}")
                        AdminKeyValueRow("Montant attendu", RelayDisplayFormat.formatFcfa(row.pendingAmount))
                    }
                }
            }
            Text("Paiements en attente", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
            dash?.pending?.forEach { p ->
                SupportRelayCashCard(p, Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            }
            if (!dash?.collected.isNullOrEmpty()) {
                Text("Récemment encaissés", Modifier.padding(horizontal = 20.dp, vertical = 8.dp), fontWeight = FontWeight.Bold)
                dash!!.collected.take(15).forEach { p ->
                    SupportRelayCashCard(p, Modifier.padding(horizontal = 16.dp, vertical = 4.dp), collected = true)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SupportRelayCashCard(
    payment: RelayCashDashboardEntryDto,
    modifier: Modifier = Modifier,
    collected: Boolean = false,
) {
    Card(modifier.fillMaxWidth(), colors = CardDefaults.cardColors(Color.White)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(payment.trackingNumber ?: "—", fontWeight = FontWeight.Bold)
            Text(payment.relayName ?: "Point relais", fontSize = 12.sp, color = Gray600)
            Text(
                RelayDisplayFormat.formatFcfa(
                    if (collected) payment.amountCollected else payment.amountExpected,
                ),
                fontWeight = FontWeight.SemiBold,
                color = if (collected) SuccessGreen else OrangePrimary,
            )
            Text(
                if (collected) "Encaissé" else "En attente",
                fontSize = 11.sp,
                color = Gray500,
            )
        }
    }
}

@Composable
private fun SupportProfileTab(
    name: String,
    email: String?,
    phone: String?,
    onRefresh: () -> Unit,
    onTicketsTab: () -> Unit,
    onRelayCashTab: () -> Unit,
    onLogout: () -> Unit,
) {
    val openUri = rememberAdminUriHandler()
    Column(Modifier.verticalScroll(rememberScrollState())) {
        AdminDarkHeader("Profil", name, "Support COLISDIRECT")
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AdminInfoSection("Compte", Icons.Default.Person) {
                AdminDetailRow("Nom", name, highlight = true)
                email?.let { AdminDetailRow("E-mail", it) }
                phone?.let { AdminDetailRow("Téléphone", it) }
            }
        }
        Card(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            colors = CardDefaults.cardColors(Color.White),
        ) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                Text("Navigation", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(vertical = 10.dp))
                AdminProfileMenuRow(Icons.Default.Dashboard, "Vue d'ensemble", onRefresh)
                AdminProfileMenuRow(Icons.Default.SupportAgent, "Tickets support", onTicketsTab)
                AdminProfileMenuRow(Icons.Default.Store, "Paiements Point Relais", onRelayCashTab)
                email?.let { AdminProfileMenuRow(Icons.Default.Email, "E-mail", { openUri("mailto:$it") }) }
                AdminProfileMenuRow(
                    Icons.Default.SupportAgent,
                    "Support technique",
                    { openUri("mailto:support@colisdirect.ci") },
                )
                AdminProfileMenuRow(Icons.AutoMirrored.Filled.Logout, "Déconnexion", onLogout, danger = true)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
