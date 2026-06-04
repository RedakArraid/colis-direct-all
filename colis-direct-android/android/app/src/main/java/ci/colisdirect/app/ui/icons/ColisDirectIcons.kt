package ci.colisdirect.app.ui.icons

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Search
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Icônes stroke alignées sur [colis-direct/www/app.js] (Lucide / bottom-nav + profil).
 */
object ColisDirectIcons {
    val Home: ImageVector = Icons.Outlined.Home
    val Package: ImageVector = Icons.Outlined.Inventory2
    val Search: ImageVector = Icons.Outlined.Search
    val MapPin: ImageVector = Icons.Outlined.Place
    val User: ImageVector = Icons.Outlined.Person

    val Mail: ImageVector = Icons.Outlined.Email
    val Phone: ImageVector = Icons.Outlined.Phone
    val Receipt: ImageVector = Icons.AutoMirrored.Outlined.ReceiptLong
    val Users: ImageVector = Icons.Outlined.People
    val HelpCircle: ImageVector = Icons.AutoMirrored.Outlined.HelpOutline
    val Message: ImageVector = Icons.Outlined.ChatBubbleOutline
    val LogOut: ImageVector = Icons.AutoMirrored.Outlined.Logout
}
