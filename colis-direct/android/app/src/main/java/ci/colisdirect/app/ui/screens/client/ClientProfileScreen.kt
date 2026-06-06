package ci.colisdirect.app.ui.screens.client

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Settings
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.UserRoles
import ci.colisdirect.app.ui.components.ProfileIconBlue
import ci.colisdirect.app.ui.components.ProfileIconBlueBg
import ci.colisdirect.app.ui.components.ProfileIconGreen
import ci.colisdirect.app.ui.components.ProfileIconGreenBg
import ci.colisdirect.app.ui.components.ProfileIconIndigo
import ci.colisdirect.app.ui.components.ProfileIconIndigoBg
import ci.colisdirect.app.ui.components.ProfileIconOrange
import ci.colisdirect.app.ui.components.ProfileIconOrangeBg
import ci.colisdirect.app.ui.components.ProfileIconYellow
import ci.colisdirect.app.ui.components.ProfileIconYellowBg
import ci.colisdirect.app.ui.components.ProfileListIconBadge
import ci.colisdirect.app.ui.icons.ColisDirectIcons
import androidx.compose.material3.*
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel

@Composable
fun ClientProfileScreen(
    onLogoutClick: () -> Unit,
    onOpenPartner: () -> Unit = {},
    onOpenAddressBook: () -> Unit = {},
    onOpenPaymentHistory: () -> Unit = {},
    onOpenEditProfile: () -> Unit = {},
    onOpenPaymentMethods: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onIntakeScan: (() -> Unit)? = null,
    onDeliveryConfirm: (() -> Unit)? = null,
    onPickupScan: (() -> Unit)? = null,
    onHomePickup: (() -> Unit)? = null,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val state by authViewModel.uiState.collectAsState()
    val user = state.user

    fun openUrl(url: String) {
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    val fullName = "${user?.firstName ?: ""} ${user?.lastName ?: ""}".trim()
    val email = user?.email ?: ""
    val phone = user?.phone ?: ""
    val role = when (user?.role) {
        "client" -> "Client"
        "relay_partner" -> "Point Relais"
        "transporter" -> "Transporteur / Livreur"
        "admin" -> "Administrateur"
        "support" -> "Support"
        else -> user?.role ?: ""
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
            .verticalScroll(rememberScrollState())
    ) {
        val canClientSpace = ProfileVisibility.canAccessClientSpace(user?.role, user?.isPro)
        val isPureClient = UserRoles.isClient(user?.role)
        val headerColor = if (isPureClient || user?.role == UserRoles.PRO) OrangePrimary else NavyDark
        val clientMenu = ProfileVisibility.visibleClientProfileItems(user?.role, user?.isPro)

        // ── HEADER PROFIL ─────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(headerColor)
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 32.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Large Avatar
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(OrangePrimary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (fullName.isNotEmpty()) fullName.take(1).uppercase() else "U",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 24.sp,
                        color = Color.White
                    )
                }

                // Profile Name / Role
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        fullName,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = Color.White
                    )
                    Text(
                        role,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        color = OrangePrimary
                    )
                }
            }
        }

        // ── USER DETAIL CARD ──────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        "Informations du compte",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Gray900
                    )

                    HorizontalDivider(color = Gray300)

                    // Email Row
                    ProfileInfoRow(
                        icon = ColisDirectIcons.Mail,
                        label = "Adresse e-mail",
                        value = email,
                        iconBackground = ProfileIconBlueBg,
                        iconTint = ProfileIconBlue,
                    )

                    if (phone.isNotEmpty()) {
                        ProfileInfoRow(
                            icon = ColisDirectIcons.Phone,
                            label = "Numéro de téléphone",
                            value = phone,
                            iconBackground = ProfileIconBlueBg,
                            iconTint = ProfileIconBlue,
                        )
                    }

                    if (!user?.address.isNullOrBlank() || !user?.commune.isNullOrBlank()) {
                        ProfileInfoRow(
                            icon = ColisDirectIcons.MapPin,
                            label = "Adresse / Commune",
                            value = listOfNotNull(user?.address, user?.commune, user?.quartier).joinToString(", "),
                            iconBackground = ProfileIconGreenBg,
                            iconTint = ProfileIconGreen,
                        )
                    }
                }
            }

            // ── OUTILS MÉTIER (relais / transporteur) ─────────────────────────
            if (onIntakeScan != null || onDeliveryConfirm != null || onPickupScan != null || onHomePickup != null) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(
                            "Outils métier",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Gray900,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                        onIntakeScan?.let { action ->
                            ProfileMenuOption(
                                icon = Icons.Default.Edit,
                                label = "Saisir — réception relais",
                                iconBackground = ProfileIconBlueBg,
                                iconTint = ProfileIconBlue,
                                onClick = action,
                            )
                        }
                        onDeliveryConfirm?.let { action ->
                            ProfileMenuOption(
                                icon = Icons.Default.CheckCircle,
                                label = "Confirmer une livraison",
                                iconBackground = ProfileIconGreenBg,
                                iconTint = ProfileIconGreen,
                                onClick = action,
                            )
                        }
                        onPickupScan?.let { action ->
                            ProfileMenuOption(
                                icon = Icons.Default.Edit,
                                label = "Saisir — ramassage colis",
                                iconBackground = ProfileIconBlueBg,
                                iconTint = ProfileIconBlue,
                                onClick = action,
                            )
                        }
                        onHomePickup?.let { action ->
                            ProfileMenuOption(
                                icon = Icons.Default.Home,
                                label = "Ramassage à domicile",
                                iconBackground = ProfileIconOrangeBg,
                                iconTint = ProfileIconOrange,
                                onClick = action,
                            )
                        }
                    }
                }
            }

            // ── OPTIONS CLIENT (masquées pour staff — comme UserMenu web) ───────
            if (canClientSpace && clientMenu.isNotEmpty()) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        if (ProfileVisibility.ClientProfileItem.EDIT_PROFILE in clientMenu) {
                            ProfileMenuOption(
                                icon = Icons.Default.Edit,
                                label = "Informations personnelles",
                                iconBackground = ProfileIconBlueBg,
                                iconTint = ProfileIconBlue,
                                onClick = onOpenEditProfile,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.ADDRESS_BOOK in clientMenu) {
                            ProfileMenuOption(
                                icon = ColisDirectIcons.MapPin,
                                label = "Carnet d'adresses",
                                iconBackground = ProfileIconGreenBg,
                                iconTint = ProfileIconGreen,
                                onClick = onOpenAddressBook,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.PAYMENT_METHODS in clientMenu) {
                            ProfileMenuOption(
                                icon = Icons.Default.CreditCard,
                                label = "Moyens de paiement",
                                iconBackground = ProfileIconYellowBg,
                                iconTint = ProfileIconYellow,
                                onClick = onOpenPaymentMethods,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.PAYMENT_HISTORY in clientMenu) {
                            ProfileMenuOption(
                                icon = ColisDirectIcons.Receipt,
                                label = "Historique des paiements",
                                iconBackground = ProfileIconYellowBg,
                                iconTint = ProfileIconYellow,
                                onClick = onOpenPaymentHistory,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.SETTINGS in clientMenu) {
                            ProfileMenuOption(
                                icon = Icons.Default.Settings,
                                label = "Paramètres",
                                iconBackground = ProfileIconIndigoBg,
                                iconTint = ProfileIconIndigo,
                                onClick = onOpenSettings,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.PARTNER in clientMenu) {
                            ProfileMenuOption(
                                icon = ColisDirectIcons.Users,
                                label = "Devenir partenaire",
                                iconBackground = ProfileIconGreenBg,
                                iconTint = ProfileIconGreen,
                                onClick = onOpenPartner,
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.LEGAL in clientMenu) {
                            ProfileMenuOption(
                                icon = ColisDirectIcons.HelpCircle,
                                label = "CGU / Politique de confidentialité",
                                iconBackground = ProfileIconIndigoBg,
                                iconTint = ProfileIconIndigo,
                                onClick = { openUrl("https://colisdirect.com/cgu") },
                            )
                        }
                        if (ProfileVisibility.ClientProfileItem.SUPPORT in clientMenu) {
                            ProfileMenuOption(
                                icon = ColisDirectIcons.Message,
                                label = "Support client",
                                iconBackground = ProfileIconIndigoBg,
                                iconTint = ProfileIconIndigo,
                                onClick = { openUrl("mailto:support@colisdirect.ci") },
                            )
                        }
                    }
                }
            }

            // ── LOGOUT BUTTON ──────────────────────────────────────────────────
            Button(
                onClick = onLogoutClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFEE2E2),
                    contentColor = Color(0xFFEF4444)
                )
            ) {
                Icon(ColisDirectIcons.LogOut, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "Se déconnecter",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun ProfileInfoRow(
    icon: ImageVector,
    label: String,
    value: String,
    iconBackground: Color = ProfileIconBlueBg,
    iconTint: Color = ProfileIconBlue,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ProfileListIconBadge(icon, iconBackground, iconTint)
        Column {
            Text(label, fontFamily = InterFontFamily, fontSize = 11.sp, color = Gray500)
            Text(value, fontFamily = InterFontFamily, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Gray900)
        }
    }
}

@Composable
private fun ProfileMenuOption(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    iconBackground: Color,
    iconTint: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ProfileListIconBadge(icon, iconBackground, iconTint)
            Text(label, fontFamily = InterFontFamily, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Gray900)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Gray300, modifier = Modifier.size(18.dp))
    }
}
