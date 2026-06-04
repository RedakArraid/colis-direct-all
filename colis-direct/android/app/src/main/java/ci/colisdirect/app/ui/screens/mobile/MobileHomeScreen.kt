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
    onOpenPricing: () -> Unit = {},
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
    var trackingInput by remember { mutableStateOf("") }

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

        // Hero orange — aligné Capacitor renderHome
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(bottomStart = 0.dp, bottomEnd = 0.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(OrangePrimary, Color(0xFFFF8533)),
                    ),
                )
                .padding(horizontal = 16.dp, vertical = 20.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    if (isLoggedIn && !firstName.isNullOrBlank()) "Bonjour $firstName 👋" else "Bonjour 👋",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.95f),
                )
                Text(
                    if (isLoggedIn) "Que souhaitez-vous faire ?" else "Bienvenue sur ColisDirect",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    color = Color.White,
                    lineHeight = 26.sp,
                )

                // Suivi rapide
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White.copy(alpha = 0.12f))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(Icons.Default.Search, null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Text(
                            "Suivi rapide",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color.White,
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = trackingInput,
                            onValueChange = { trackingInput = it.uppercase() },
                            placeholder = {
                                Text(
                                    "Ex: CD202605290001CI",
                                    fontFamily = InterFontFamily,
                                    fontSize = 12.sp,
                                    color = Gray400,
                                )
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent,
                            ),
                            textStyle = MaterialTheme.typography.bodyMedium.copy(
                                fontFamily = InterFontFamily,
                                fontSize = 13.sp,
                                color = Gray900,
                            ),
                        )
                        Button(
                            onClick = {
                                val v = trackingInput.trim()
                                if (v.isNotEmpty()) onTrackNumber(v)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                        ) {
                            Text("Suivre", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Services rapides
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = (-8).dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(modifier = Modifier.padding(vertical = 8.dp)) {
                Text(
                    "SERVICES RAPIDES",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Gray500,
                    letterSpacing = 0.8.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
                val quickActions = listOf(
                    Triple(Icons.Default.Inventory2, "Envoyer", onCreateShipment),
                    Triple(Icons.Default.Search, "Suivre", {
                        val v = trackingInput.trim()
                        if (v.isNotEmpty()) onTrackNumber(v)
                    }),
                    Triple(Icons.Default.Map, "Relais", { onNavigateToTab(3) }),
                    Triple(Icons.Default.AttachMoney, "Tarifs", onOpenPricing),
                    Triple(Icons.Default.History, "Historique", { onNavigateToTab(1) }),
                    Triple(Icons.Default.SupportAgent, "Support", { onOpenPartner(null) }),
                )
                quickActions.chunked(3).forEach { row ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        row.forEach { (icon, label, action) ->
                            ServiceTile(
                                modifier = Modifier.weight(1f),
                                icon = icon,
                                iconBg = OrangeLight,
                                iconTint = OrangePrimary,
                                label = label,
                                onClick = action,
                            )
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

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

        Spacer(Modifier.height(16.dp))

        // Tarifs CTA
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Brush.linearGradient(listOf(Color(0xFF0F0F0F), Color(0xFF1A1A2E))))
                .padding(20.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "TARIFS TRANSPARENTS",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = OrangePrimary,
                    letterSpacing = 1.sp,
                )
                Text(
                    "Dès 600 FCFA",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    color = Color.White,
                )
                Text(
                    "Envoyez partout en Côte d'Ivoire.",
                    fontFamily = InterFontFamily,
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.65f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Button(
                    onClick = onOpenPricing,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Voir tous les tarifs", fontWeight = FontWeight.Bold)
                    Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(16.dp))
                }
            }
        }

        Spacer(Modifier.height(88.dp))
    }
}

@Composable
private fun ServiceTile(
    modifier: Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBg: Color,
    iconTint: Color,
    label: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(iconBg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(24.dp))
        }
        Text(
            label,
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
            color = Gray900,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}
