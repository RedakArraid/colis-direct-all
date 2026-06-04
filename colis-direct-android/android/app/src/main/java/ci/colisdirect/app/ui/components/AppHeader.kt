package ci.colisdirect.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.R
import ci.colisdirect.app.ui.theme.Gray900
import ci.colisdirect.app.ui.theme.InterFontFamily
import ci.colisdirect.app.ui.theme.OrangePrimary

@Composable
fun AppHeader(
    modifier: Modifier = Modifier,
    unreadCount: Int = 0,
    onLogoClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
) {
    val showBadge = unreadCount > 0
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Image(
                painter = painterResource(id = R.drawable.logo),
                contentDescription = "ColisDirect",
                modifier = Modifier.size(28.dp),
            )
            Text(
                "COLISDIRECT",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 15.sp,
                letterSpacing = (-0.3).sp,
                color = Gray900,
            )
        }

        Box(contentAlignment = Alignment.TopEnd) {
            IconButton(
                onClick = onNotificationsClick,
                modifier = Modifier.size(40.dp),
            ) {
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = Gray900,
                    modifier = Modifier.size(20.dp),
                )
            }
            if (showBadge) {
                Box(
                    modifier = Modifier
                        .padding(top = 8.dp, end = 6.dp)
                        .defaultMinSize(minWidth = 16.dp, minHeight = 16.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFEF4444)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (unreadCount > 9) "9+" else unreadCount.toString(),
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 3.dp),
                    )
                }
            }
        }
    }
}
