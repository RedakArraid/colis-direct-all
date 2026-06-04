package ci.colisdirect.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import ci.colisdirect.app.ui.icons.ColisDirectIcons
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.UserRoles
import ci.colisdirect.app.ui.screens.mobile.MobileHomeScreen
import ci.colisdirect.app.ui.screens.mobile.ShipmentsListScreen
import ci.colisdirect.app.ui.screens.client.ClientProfileScreen
import ci.colisdirect.app.ui.screens.public.PublicRelayMapScreen
import ci.colisdirect.app.ui.screens.public.PublicShipmentsScreen
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.NotificationsViewModel

enum class TabType {
    HOME,
    SHIPMENTS,
    TRACKING,
    RELAIS,
    PROFILE
}

@Composable
fun MainContainerScreen(
    onCreateShipment: () -> Unit,
    onShipmentClick: (String) -> Unit,
    onNotifications: () -> Unit,
    onOpenPricing: () -> Unit,
    onOpenPartner: (String?) -> Unit,
    onOpenAddressBook: () -> Unit,
    onOpenPaymentHistory: () -> Unit,
    onPayShipmentOnline: (trackingNumber: String, amountFcfa: Int, routeLabel: String) -> Unit,
    onIntakeScan: () -> Unit,
    onDeliveryConfirm: () -> Unit,
    onPickupScan: () -> Unit,
    onHomePickup: () -> Unit,
    initialTrackingPrefill: String? = null,
    onTrackingPrefillConsumed: () -> Unit = {},
    authViewModel: AuthViewModel = hiltViewModel(),
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    var currentTab by remember { mutableStateOf(TabType.HOME) }
    var trackingPrefill by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(initialTrackingPrefill) {
        if (!initialTrackingPrefill.isNullOrBlank()) {
            trackingPrefill = initialTrackingPrefill
            currentTab = TabType.TRACKING
            onTrackingPrefillConsumed()
        }
    }

    val isLoggedIn = authState.isLoggedIn && authState.user != null
    val role = authState.user?.role ?: ""
    val canClientSpace = ProfileVisibility.canAccessClientSpace(role, authState.user?.isPro)
    val isClient = UserRoles.isClient(role) || role == UserRoles.PRO

    LaunchedEffect(authState.user?.id) {
        if (isLoggedIn) currentTab = TabType.HOME
    }

    val showFab = isLoggedIn && canClientSpace && currentTab != TabType.PROFILE

    fun navigateTab(index: Int) {
        currentTab = when (index) {
            1 -> TabType.SHIPMENTS
            2 -> TabType.TRACKING
            3 -> TabType.RELAIS
            4 -> TabType.PROFILE
            else -> TabType.HOME
        }
    }

    fun requestCreateShipment() {
        when {
            !isLoggedIn -> currentTab = TabType.PROFILE
            canClientSpace -> onCreateShipment()
            else -> currentTab = TabType.HOME
        }
    }

    Scaffold(
        containerColor = Color.White,
        floatingActionButton = {
            if (showFab) {
                FloatingActionButton(
                    onClick = { requestCreateShipment() },
                    containerColor = OrangePrimary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.padding(bottom = 8.dp),
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Envoyer un colis")
                }
            }
        },
        bottomBar = {
            Surface(
                shadowElevation = 16.dp,
                color = Color.White,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(Gray300),
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .height(60.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        TabItem("Accueil", ColisDirectIcons.Home, currentTab == TabType.HOME) {
                            currentTab = TabType.HOME
                        }
                        if (!isLoggedIn || canClientSpace) {
                            TabItem("Mes colis", ColisDirectIcons.Package, currentTab == TabType.SHIPMENTS) {
                                currentTab = TabType.SHIPMENTS
                            }
                        }
                        TabItem("Suivre", ColisDirectIcons.Search, currentTab == TabType.TRACKING) {
                            currentTab = TabType.TRACKING
                        }
                        TabItem("Relais", ColisDirectIcons.MapPin, currentTab == TabType.RELAIS) {
                            currentTab = TabType.RELAIS
                        }
                        TabItem("Profil", ColisDirectIcons.User, currentTab == TabType.PROFILE) {
                            currentTab = TabType.PROFILE
                        }
                    }
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (currentTab) {
                TabType.HOME -> when {
                    isLoggedIn && UserRoles.usesDedicatedShell(role) -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                "Reconnectez-vous pour accéder à votre espace ${roleDisplayLabel(role)}.",
                                color = Gray600,
                                modifier = Modifier.padding(24.dp),
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                    else -> MobileHomeScreen(
                        onNavigateToTab = { navigateTab(it) },
                        onCreateShipment = { requestCreateShipment() },
                        onShipmentClick = onShipmentClick,
                        onTrackNumber = { tn ->
                            trackingPrefill = tn
                            currentTab = TabType.TRACKING
                        },
                        onNotificationsClick = onNotifications,
                        onOpenPricing = onOpenPricing,
                        onOpenPartnerLivreur = { onOpenPartner("livreur") },
                        onOpenPartnerRelais = { onOpenPartner("relais") },
                        nonClientRoleLabel = if (isLoggedIn && !canClientSpace) roleDisplayLabel(role) else null,
                    )
                }

                TabType.SHIPMENTS -> when {
                    !isLoggedIn -> PublicShipmentsScreen(onLoginClick = { currentTab = TabType.PROFILE })
                    !canClientSpace && isLoggedIn -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                "Les colis client sont accessibles depuis votre espace ${roleDisplayLabel(role)}.",
                                color = Gray600,
                                modifier = Modifier.padding(24.dp),
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                    else -> ShipmentsListScreen(
                        onShipmentClick = onShipmentClick,
                        onCreateShipment = { requestCreateShipment() },
                        onPayOnline = onPayShipmentOnline,
                    )
                }

                TabType.TRACKING -> {
                    TrackingPublicScreen(
                        onBack = { currentTab = TabType.HOME },
                        initialTrackingNumber = trackingPrefill,
                    )
                }

                TabType.RELAIS -> {
                    PublicRelayMapScreen()
                }

                TabType.PROFILE -> {
                    if (!isLoggedIn) {
                        LoginScreen(
                            authViewModel = authViewModel,
                            onLoginSuccess = { currentTab = TabType.HOME },
                        )
                    } else {
                        ClientProfileScreen(
                            onLogoutClick = {
                                notificationsViewModel.onLogout()
                                authViewModel.signOut()
                                currentTab = TabType.HOME
                            },
                            onOpenPricing = onOpenPricing,
                            onOpenPartner = { onOpenPartner(null) },
                            onOpenAddressBook = onOpenAddressBook,
                            onOpenPaymentHistory = onOpenPaymentHistory,
                            onIntakeScan = if (UserRoles.isRelayPartner(role)) onIntakeScan else null,
                            onDeliveryConfirm = if (UserRoles.isRelayPartner(role)) onDeliveryConfirm else null,
                            onPickupScan = if (UserRoles.isTransporter(role)) onPickupScan else null,
                            onHomePickup = if (UserRoles.isTransporter(role)) onHomePickup else null,
                        )
                    }
                }
            }
        }
    }
}

private fun roleDisplayLabel(role: String): String = when (role) {
    UserRoles.ADMIN -> "Administrateur"
    UserRoles.SUPPORT, UserRoles.SUPPORT_SUPERVISOR -> "Support"
    UserRoles.RELAY_PARTNER -> "Point relais"
    UserRoles.TRANSPORTER -> "Transporteur"
    else -> role
}

@Composable
private fun TabItem(
    label: String,
    icon: ImageVector,
    isActive: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxHeight()
            .width(72.dp)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (isActive) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .width(32.dp)
                    .height(3.dp)
                    .background(OrangePrimary, RoundedCornerShape(bottomStart = 2.dp, bottomEnd = 2.dp)),
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxHeight(),
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = if (isActive) OrangePrimary else Gray500,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.height(3.dp))
            Text(
                label,
                fontFamily = InterFontFamily,
                fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                fontSize = 10.sp,
                color = if (isActive) OrangePrimary else Gray500,
                textAlign = TextAlign.Center,
            )
        }
    }
}
