package ci.colisdirect.app.ui.theme

import androidx.compose.ui.graphics.Color

// === Brand Colors ===
val OrangePrimary = Color(0xFFFF6C00)       // --cd-orange (#FF6C00)
val OrangeDark    = Color(0xFFE66100)       // --cd-orange-hover (#E66100)
val OrangeLight   = Color(0xFFFFF3E8)       // --cd-orange-soft (#FFF3E8)
val OrangeContainer = Color(0xFFFFF3E8)     // Conteneur très clair (#FFF3E8)

// === Dark Navy ===
val NavyDark    = Color(0xFF0F0F0F)         // --cd-dark (#0F0F0F)
val NavyMedium  = Color(0xFF1E293B)         // Surface dark
val NavyLight   = Color(0xFF334155)         // Surface variant dark

// === Semantic Colors ===
val SuccessGreen   = Color(0xFF16A34A)       // --cd-green (#16A34A)
val SuccessLight   = Color(0xFFE6F6EC)       // --cd-green-soft (#E6F6EC)
val WarningAmber   = Color(0xFFF59E0B)
val WarningLight   = Color(0xFFFEF3C7)
val ErrorRed       = Color(0xFFEF4444)
val ErrorLight     = Color(0xFFFEE2E2)
val InfoBlue       = Color(0xFF3B82F6)
val InfoLight      = Color(0xFFEFF6FF)

// === Neutrals ===
val Gray50  = Color(0xFFF6F7F9)            // --cd-bg-soft (#F6F7F9)
val Gray100 = Color(0xFFF1F5F9)
val Gray200 = Color(0xFFE2E8F0)
val Gray300 = Color(0xFFE6E6E6)            // --cd-line (#E6E6E6)
val Gray400 = Color(0xFF94A3B8)
val Gray500 = Color(0xFF64748B)
val Gray600 = Color(0xFF475569)
val Gray700 = Color(0xFF334155)
val Gray800 = Color(0xFF1E293B)
val Gray900 = Color(0xFF1A1A1A)            // --cd-ink (#1A1A1A)

// Status colors for shipment badges
val StatusColors = mapOf(
    "READY_FOR_DROP_OFF"           to Color(0xFF6366F1),
    "PICKUP_PENDING"               to Color(0xFFF59E0B),
    "RELAY_ORIGIN_RECEIVED"        to Color(0xFF8B5CF6),
    "CARRIER_COLLECTED"            to Color(0xFF3B82F6),
    "IN_TRANSIT"                   to Color(0xFF0EA5E9),
    "RELAY_FINAL_RECEIVED"         to Color(0xFF10B981),
    "AVAILABLE_FOR_PICKUP"         to Color(0xFF22C55E),
    "PICKED_UP_BY_CUSTOMER"        to Color(0xFF16A34A),
    "DELIVERED"                    to Color(0xFF15803D),
    "DELIVERED_TO_CUSTOMER"        to Color(0xFF15803D),
    "RETURN_TO_SENDER"             to Color(0xFFF97316),
    "CANCELLED"                    to Color(0xFFEF4444),
    "PAYMENT_AWAITING_VALIDATION"  to Color(0xFFF59E0B),
    "PAYMENT_VALIDATED"            to Color(0xFF22C55E),
    "PAYMENT_REJECTED"             to Color(0xFFEF4444),
    "PAYMENT_CONFIRMED_AWAITING_DROP" to Color(0xFF8B5CF6),
    "PAYMENT_PENDING_AT_RELAY"     to Color(0xFFF59E0B),
    "PAYMENT_RECEIVED_AT_RELAY"    to Color(0xFF22C55E),
)
