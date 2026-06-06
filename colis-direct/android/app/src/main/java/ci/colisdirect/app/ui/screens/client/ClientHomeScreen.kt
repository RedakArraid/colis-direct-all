package ci.colisdirect.app.ui.screens.client

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.ShipmentCard
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@Composable
fun ClientHomeScreen(
    onNavigateToTab: (Int) -> Unit, // Navigation index callback
    onCreateShipmentClick: () -> Unit,
    onShipmentClick: (String) -> Unit,
    clientViewModel: ClientViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val clientState by clientViewModel.uiState.collectAsState()

    val firstName = authState.user?.firstName ?: ""

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
            .verticalScroll(rememberScrollState())
    ) {
        // ── ORANGE HEADER ────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(colors = listOf(OrangePrimary, OrangeDark))
                )
                .statusBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 32.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Bonjour $firstName 👋",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 24.sp,
                        letterSpacing = (-0.4).sp,
                        color = Color.White
                    )
                    Text(
                        "Ravi de vous revoir !",
                        fontFamily = InterFontFamily,
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }

                // Avatar
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }

        // ── QUICK ACTIONS (Floating Grid) ────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = (-16).dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Action 1: Envoyer
                HomeActionCard(
                    title = "Envoyer un colis",
                    desc = "Estimer et expédier",
                    icon = Icons.Default.AddBox,
                    modifier = Modifier.weight(1f),
                    onClick = onCreateShipmentClick
                )

                // Action 2: Suivre
                HomeActionCard(
                    title = "Suivre un colis",
                    desc = "Historique d'envoi",
                    icon = Icons.Default.QrCodeScanner,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigateToTab(2) } // Tracking tab is index 2
                )
            }
        }

        // ── RECENT SHIPMENTS ─────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Envois récents",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Gray900
                )
                Text(
                    "Voir tout",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = OrangePrimary,
                    modifier = Modifier.clickable { onNavigateToTab(1) } // Mes colis tab is index 1
                )
            }

            if (clientState.isLoading && clientState.shipments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = OrangePrimary)
                }
            } else if (clientState.shipments.isEmpty()) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Inventory2, null, tint = Gray500, modifier = Modifier.size(36.dp))
                        Text(
                            "Aucun envoi récent",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Gray900
                        )
                        Text(
                            "Créez votre première livraison en cliquant sur Envoyer.",
                            fontFamily = InterFontFamily,
                            fontSize = 12.sp,
                            color = Gray500
                        )
                    }
                }
            } else {
                clientState.shipments.take(3).forEach { shipment ->
                    ShipmentCard(
                        shipment = shipment,
                        onClick = { onShipmentClick(shipment.id) }
                    )
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun HomeActionCard(
    title: String,
    desc: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(OrangeLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(20.dp))
            }

            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    title,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Gray900,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    desc,
                    fontFamily = InterFontFamily,
                    fontSize = 11.sp,
                    color = Gray500,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
