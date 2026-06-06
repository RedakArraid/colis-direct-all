package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.AppHeader
import ci.colisdirect.app.ui.components.MobilePackageCard
import ci.colisdirect.app.ui.components.isTerminalShipmentStatus
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel
import ci.colisdirect.app.viewmodel.NotificationsViewModel

@Composable
fun MobileHomeScreen(
    onNavigateToTab: (Int) -> Unit,
    onCreateShipment: () -> Unit,
    onShipmentClick: (String) -> Unit,
    onTrackNumber: (String) -> Unit,
    onNotificationsClick: () -> Unit,
    onOpenPartner: (String?) -> Unit = {},
    onOpenPartnerLivreur: () -> Unit = { onOpenPartner("livreur") },
    onOpenPartnerRelais: () -> Unit = { onOpenPartner("relais") },
    nonClientRoleLabel: String? = null,
    authViewModel: AuthViewModel = hiltViewModel(),
    clientViewModel: ClientViewModel = appClientViewModel(),
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val clientState by clientViewModel.uiState.collectAsState()
    val notifications by notificationsViewModel.notifications.collectAsState()
    val unreadCount = notifications.count { it.unread }
    val isLoggedIn = authState.isLoggedIn && authState.user != null
    val firstName = authState.user?.firstName

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) clientViewModel.loadShipments()
    }

    LaunchedEffect(isLoggedIn, clientState.shipments) {
        if (isLoggedIn && clientState.shipments.isNotEmpty()) {
            notificationsViewModel.syncFromShipments(clientState.shipments)
        }
    }

    val activeShipments = remember(clientState.shipments) {
        clientState.shipments.filter { s ->
            val status = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
            !isTerminalShipmentStatus(status)
        }
    }
    val lastShipment = remember(clientState.shipments) {
        clientState.shipments.maxByOrNull { it.createdAt.orEmpty() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState()),
    ) {
        AppHeader(
            unreadCount = if (isLoggedIn) unreadCount else 0,
            onNotificationsClick = onNotificationsClick,
        )

        if (!nonClientRoleLabel.isNullOrBlank()) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = Gray50,
            ) {
                Text(
                    "Interface client — rôle $nonClientRoleLabel. Les outils métier sont dans Profil.",
                    modifier = Modifier.padding(12.dp),
                    fontFamily = InterFontFamily,
                    fontSize = 12.sp,
                    color = Gray500,
                    lineHeight = 18.sp,
                )
            }
        }

        if (isLoggedIn && !firstName.isNullOrBlank()) {
            Text(
                "Bonjour $firstName 👋",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                color = Gray600,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }

        // Hero maquette — gradient pêche + illustration
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(Color(0xFFFFF6EE), Color(0xFFFFE8D2)),
                    ),
                )
                .padding(18.dp),
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                Text(
                    "Envoyez et recevez vos colis en toute sécurité",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    color = Gray900,
                    lineHeight = 26.sp,
                    modifier = Modifier.weight(0.58f),
                )
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(OrangeLight),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.LocalShipping,
                        contentDescription = null,
                        tint = OrangePrimary,
                        modifier = Modifier.size(56.dp),
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Button(
                onClick = onCreateShipment,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                shape = RoundedCornerShape(10.dp),
            ) {
                Text("Envoyer un colis", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            OutlinedButton(
                onClick = { onNavigateToTab(2) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.5.dp, Gray300),
            ) {
                Text("Suivre un colis", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
            }
        }

        // Services rapides (2 actions)
        Text(
            "SERVICES RAPIDES",
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            color = Gray500,
            letterSpacing = 0.8.sp,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            QuickServiceTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Inventory2,
                label = "Envoyer un colis",
                onClick = onCreateShipment,
            )
            QuickServiceTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Default.Map,
                label = "Retrouver un point relais",
                onClick = { onNavigateToTab(3) },
            )
        }

        Spacer(Modifier.height(16.dp))

        // Dernier envoi
        if (isLoggedIn && lastShipment != null) {
            Text(
                "DERNIER ENVOI",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                color = Gray500,
                letterSpacing = 0.8.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
            val ls = lastShipment!!
            val route = "${ls.senderCommune ?: "—"} → ${ls.recipientCommune ?: "—"}"
            val statusLabel = (ls.effectiveStatus ?: ls.currentStatus ?: "—").replace('_', ' ')
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clickable { onShipmentClick(ls.id) },
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Gray300),
            ) {
                Row(
                    Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        Modifier
                            .size(42.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(OrangeLight),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.Inventory2, null, tint = OrangePrimary)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(
                            ls.trackingNumber,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Gray900,
                        )
                        Text("$route · $statusLabel", fontSize = 12.sp, color = Gray500)
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = Gray400)
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        Spacer(Modifier.height(4.dp))

        // Colis en cours
        if (isLoggedIn) {
            when {
                clientState.isLoading && clientState.shipments.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = OrangePrimary, strokeWidth = 2.dp)
                    }
                }
                activeShipments.isNotEmpty() -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Colis en cours",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Gray900,
                        )
                        TextButton(onClick = { onNavigateToTab(1) }) {
                            Text(
                                "Tout voir",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = OrangePrimary,
                            )
                            Icon(
                                Icons.Default.ChevronRight,
                                null,
                                tint = OrangePrimary,
                                modifier = Modifier.size(16.dp),
                            )
                        }
                    }
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(activeShipments, key = { it.id }) { shipment ->
                            MobilePackageCard(
                                shipment = shipment,
                                onClick = { onShipmentClick(shipment.id) },
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
                else -> {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(OrangeLight)
                            .clickable(onClick = onCreateShipment)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(13.dp))
                                .background(OrangePrimary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.Add, null, tint = Color.White, modifier = Modifier.size(24.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Envoyez votre premier colis",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Gray900,
                            )
                            Text(
                                "Simple, rapide et sécurisé",
                                fontFamily = InterFontFamily,
                                fontSize = 12.sp,
                                color = Gray500,
                            )
                        }
                        Icon(Icons.Default.ChevronRight, null, tint = OrangePrimary)
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }

        // Partenaires CTA
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.linearGradient(listOf(OrangePrimary, Color(0xFFFF8533))))
                .padding(20.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "REJOIGNEZ-NOUS",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color.White.copy(alpha = 0.85f),
                    letterSpacing = 0.8.sp,
                )
                Text(
                    "Devenez partenaire",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = Color.White,
                )
                Text(
                    "Livreur agréé ou point relais — développez votre activité avec ColisDirect.",
                    fontFamily = InterFontFamily,
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.8f),
                    lineHeight = 18.sp,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onOpenPartnerLivreur,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Black.copy(alpha = 0.35f)),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Default.DirectionsBike, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Livreur", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = onOpenPartnerRelais,
                        modifier = Modifier.weight(1f),
                        border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    ) {
                        Icon(Icons.Default.Store, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Point relais", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(Modifier.height(88.dp))
    }
}

@Composable
private fun QuickServiceTile(
    modifier: Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Gray300),
    ) {
        Column(
            Modifier.padding(vertical = 14.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(OrangeLight),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(20.dp))
            }
            Text(
                label,
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 10.sp,
                color = Gray600,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 13.sp,
                maxLines = 3,
            )
        }
    }
}
