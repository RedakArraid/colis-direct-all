package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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
import ci.colisdirect.app.data.model.AppNotification
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.NotificationsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    onLoginClick: () -> Unit,
    onTrackingClick: (String) -> Unit,
    notificationsViewModel: NotificationsViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val notifications by notificationsViewModel.notifications.collectAsState()
    val isLoggedIn = authState.isLoggedIn && authState.user != null
    val unread = notifications.count { it.unread }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
                actions = {
                    if (isLoggedIn && unread > 0) {
                        TextButton(onClick = { notificationsViewModel.markAllRead() }) {
                            Text("Tout lu", color = OrangePrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
        containerColor = Color.White,
    ) { padding ->
        if (!isLoggedIn) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(Icons.Default.Notifications, null, tint = OrangePrimary, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(16.dp))
                Text("Connectez-vous", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(
                    "Connectez-vous pour voir vos alertes de livraison.",
                    color = Gray500,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = onLoginClick,
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Se connecter")
                }
            }
            return@Scaffold
        }

        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (unread > 0) {
                Surface(color = Color(0xFFFFF3E8), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "$unread nouvelle${if (unread > 1) "s" else ""}",
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        color = OrangePrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                    )
                }
            }

            if (notifications.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.NotificationsNone, null, tint = OrangePrimary, modifier = Modifier.size(40.dp))
                        Text("Aucune notification", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp))
                        Text("Les mises à jour de vos colis apparaîtront ici.", color = Gray500, fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
                    items(notifications, key = { it.id }) { n ->
                        NotificationRow(
                            notification = n,
                            onClick = {
                                notificationsViewModel.markRead(n.id)
                                n.trackingNumber?.let { onTrackingClick(it) }
                            },
                        )
                        HorizontalDivider(color = Gray100)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: AppNotification, onClick: () -> Unit) {
    val bg = parseHexColor(notification.bgHex, Color(0xFFFFF3E8))
    val tint = parseHexColor(notification.colorHex, OrangePrimary)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(if (notification.unread) Color(0xFFFFFAF5) else Color.White)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(bg),
            contentAlignment = Alignment.Center,
        ) {
            Icon(notificationIcon(notification.iconKey), null, tint = tint, modifier = Modifier.size(22.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(notification.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
            Text(notification.body, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(top = 2.dp))
            Text(notification.time, fontSize = 11.sp, color = Gray400, modifier = Modifier.padding(top = 4.dp))
        }
        if (notification.unread) {
            Box(
                modifier = Modifier
                    .padding(top = 6.dp)
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(OrangePrimary),
            )
        }
    }
}

private fun notificationIcon(key: String): ImageVector = when (key) {
    "truck" -> Icons.Default.LocalShipping
    "payment" -> Icons.Default.CreditCard
    "star" -> Icons.Default.Star
    else -> Icons.Default.Inventory2
}

private fun parseHexColor(hex: String, fallback: Color): Color = runCatching {
    Color(android.graphics.Color.parseColor(hex))
}.getOrDefault(fallback)
