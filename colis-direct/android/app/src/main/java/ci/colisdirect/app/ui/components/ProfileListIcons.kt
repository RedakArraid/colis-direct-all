package ci.colisdirect.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

// Pastilles profil — style maquette
val ProfileIconBlueBg = Color(0xFFEEF4FF)
val ProfileIconBlue = Color(0xFF2F6BE0)
val ProfileIconGreenBg = Color(0xFFE6F6EC)
val ProfileIconGreen = Color(0xFF16A34A)
val ProfileIconYellowBg = Color(0xFFFEF8E7)
val ProfileIconYellow = Color(0xFFF5B400)
val ProfileIconOrangeBg = Color(0xFFFFF3E8)
val ProfileIconOrange = Color(0xFFFF6C00)
val ProfileIconIndigoBg = Color(0xFFF0F4FF)
val ProfileIconIndigo = Color(0xFF6366F1)

@Composable
fun ProfileListIconBadge(
    icon: ImageVector,
    backgroundColor: Color,
    tint: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(42.dp)
            .clip(RoundedCornerShape(13.dp))
            .background(backgroundColor),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(20.dp),
        )
    }
}
