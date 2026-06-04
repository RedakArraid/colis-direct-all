package ci.colisdirect.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary          = OrangePrimary,
    onPrimary        = androidx.compose.ui.graphics.Color.White,
    primaryContainer = OrangeLight,
    onPrimaryContainer = OrangeDark,
    secondary        = NavyMedium,
    onSecondary      = androidx.compose.ui.graphics.Color.White,
    secondaryContainer = Gray100,
    onSecondaryContainer = Gray900,
    tertiary         = InfoBlue,
    error            = ErrorRed,
    errorContainer   = ErrorLight,
    background       = Gray50,
    onBackground     = Gray900,
    surface          = androidx.compose.ui.graphics.Color.White,
    onSurface        = Gray900,
    surfaceVariant   = Gray100,
    onSurfaceVariant = Gray600,
    outline          = Gray300,
    outlineVariant   = Gray200,
    surfaceTint      = OrangePrimary,
)

private val DarkColorScheme = darkColorScheme(
    primary          = OrangePrimary,
    onPrimary        = NavyDark,
    primaryContainer = OrangeDark,
    onPrimaryContainer = OrangeLight,
    secondary        = Gray400,
    onSecondary      = NavyDark,
    secondaryContainer = NavyLight,
    onSecondaryContainer = Gray200,
    tertiary         = InfoBlue,
    error            = ErrorRed,
    errorContainer   = Color(0xFF7F1D1DUL),
    background       = NavyDark,
    onBackground     = Gray100,
    surface          = NavyMedium,
    onSurface        = Gray100,
    surfaceVariant   = NavyLight,
    onSurfaceVariant = Gray400,
    outline          = Gray700,
    outlineVariant   = Gray800,
    surfaceTint      = OrangePrimary,
)

// Re-export Color for use in DarkColorScheme above
private typealias Color = androidx.compose.ui.graphics.Color

@Composable
fun ColisDirectTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Keep brand colors consistent
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
