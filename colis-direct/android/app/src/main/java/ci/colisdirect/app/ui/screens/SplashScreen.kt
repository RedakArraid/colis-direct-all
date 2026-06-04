package ci.colisdirect.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.ui.theme.InterFontFamily
import ci.colisdirect.app.ui.theme.NavyDark
import ci.colisdirect.app.ui.theme.OrangeDark
import ci.colisdirect.app.ui.theme.OrangePrimary
import ci.colisdirect.app.viewmodel.AuthViewModel
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    authViewModel: AuthViewModel,
    onNavigate: (String) -> Unit,
    onNotLoggedIn: () -> Unit,
) {
    val authState by authViewModel.uiState.collectAsState()

    // Pulse animation for icon
    val pulse = rememberInfiniteTransition(label = "pulse")
    val scaleValue by pulse.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scaleValue",
    )

    // Dot animation timing offsets
    val dot1Alpha by pulse.animateFloat(
        initialValue = 0.3f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutSine, delayMillis = 0),
            repeatMode = RepeatMode.Reverse,
        ), label = "dot1"
    )
    val dot2Alpha by pulse.animateFloat(
        initialValue = 0.3f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutSine, delayMillis = 200),
            repeatMode = RepeatMode.Reverse,
        ), label = "dot2"
    )
    val dot3Alpha by pulse.animateFloat(
        initialValue = 0.3f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutSine, delayMillis = 400),
            repeatMode = RepeatMode.Reverse,
        ), label = "dot3"
    )

    LaunchedEffect(authState.isLoading) {
        if (!authState.isLoading) {
            delay(1500)
            if (authState.isLoggedIn && authState.user != null) {
                onNavigate(authState.user!!.role)
            } else {
                onNotLoggedIn()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(OrangePrimary, OrangeDark, Color(0xFFC24F00))
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Animated icon
            Surface(
                shape = CircleShape,
                color = Color.White.copy(alpha = 0.2f),
                modifier = Modifier
                    .size(100.dp)
                    .scale(scaleValue),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.LocalShipping,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(52.dp),
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            // Brand name
            Text(
                "COLISDIRECT",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 30.sp,
                letterSpacing = (-0.5).sp,
                color = Color.White,
            )

            Spacer(Modifier.height(8.dp))

            // Tagline
            Text(
                "Livraison rapide & fiable en Côte d'Ivoire",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Normal,
                fontSize = 13.sp,
                color = Color.White.copy(alpha = 0.8f),
            )

            Spacer(Modifier.height(48.dp))

            // Animated loading dots
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                listOf(dot1Alpha, dot2Alpha, dot3Alpha).forEach { alpha ->
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = alpha))
                    )
                }
            }
        }

        // Copyright at bottom
        Text(
            "© 2026 COLISDIRECT",
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 11.sp,
            color = Color.White.copy(alpha = 0.5f),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp),
        )
    }
}
