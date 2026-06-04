package ci.colisdirect.app.data.local

import android.content.Context
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.model.AppNotification
import ci.colisdirect.app.ui.components.isTerminalShipmentStatus
import ci.colisdirect.app.ui.components.statusLabel
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationsRepository @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val gson = Gson()
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _notifications = MutableStateFlow(load())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    val unreadCount: Int
        get() = _notifications.value.count { it.unread }

    private fun load(): List<AppNotification> {
        val json = prefs.getString(KEY_ITEMS, null) ?: return defaultNotifications()
        return runCatching {
            val type = object : TypeToken<List<AppNotification>>() {}.type
            gson.fromJson<List<AppNotification>>(json, type)
        }.getOrElse { defaultNotifications() }.ifEmpty { defaultNotifications() }
    }

    private fun persist(list: List<AppNotification>) {
        prefs.edit().putString(KEY_ITEMS, gson.toJson(list)).apply()
        _notifications.value = list
    }

    fun markRead(id: Long) {
        persist(_notifications.value.map { if (it.id == id) it.copy(unread = false) else it })
    }

    fun markAllRead() {
        persist(_notifications.value.map { it.copy(unread = false) })
    }

    fun clearForLogout() {
        persist(defaultNotifications().map { it.copy(unread = false) })
    }

    fun syncFromShipments(shipments: List<ShipmentDto>) {
        if (shipments.isEmpty()) return
        var list = _notifications.value.toMutableList()
        var nextId = (list.maxOfOrNull { it.id } ?: 0L) + 1L

        shipments.forEach { s ->
            val status = (s.effectiveStatus ?: s.currentStatus ?: "").uppercase()
            if (status.isBlank() || isTerminalShipmentStatus(status)) return@forEach
            val tn = s.trackingNumber
            if (list.any { it.trackingNumber == tn && it.type == "shipment_status" }) return@forEach

            val style = notificationForStatus(status, tn, s.shipmentCode)
            list.add(
                0,
                AppNotification(
                    id = nextId++,
                    type = "shipment_status",
                    title = style.title,
                    body = style.body,
                    time = "À l'instant",
                    unread = true,
                    iconKey = style.iconKey,
                    colorHex = style.colorHex,
                    bgHex = style.bgHex,
                    trackingNumber = tn,
                ),
            )
        }
        persist(list.take(50))
    }

    private data class NotificationStyle(
        val title: String,
        val body: String,
        val iconKey: String,
        val colorHex: String,
        val bgHex: String,
    )

    private fun notificationForStatus(status: String, tracking: String, code: String?): NotificationStyle {
        val label = statusLabel(status)
        val ref = code ?: tracking.takeLast(8)
        return when {
            status.contains("AVAILABLE") || status.contains("PICKUP") -> NotificationStyle(
                "Colis disponible",
                "Votre colis $ref est disponible au relais.",
                "package", "#FF6C00", "#FFF3E8",
            )
            status.contains("TRANSIT") || status.contains("CARRIER") -> NotificationStyle(
                "Colis en transit",
                "Votre colis $ref est en cours d'acheminement ($label).",
                "truck", "#2F6BE0", "#EEF4FF",
            )
            status.contains("PAYMENT") -> NotificationStyle(
                "Paiement",
                "Mise à jour paiement pour $ref : $label.",
                "payment", "#16A34A", "#E6F6EC",
            )
            else -> NotificationStyle(
                "Mise à jour colis",
                "Colis $ref : $label.",
                "package", "#FF6C00", "#FFF3E8",
            )
        }
    }

    companion object {
        private const val PREFS_NAME = "cd_notifications"
        private const val KEY_ITEMS = "items"

        fun defaultNotifications(): List<AppNotification> = listOf(
            AppNotification(1, "delivery", "Colis disponible", "Votre colis CD202605280002CI est disponible au relais Korhogo Marché.", "Il y a 5 min", true, "package", "#FF6C00", "#FFF3E8"),
            AppNotification(2, "transit", "Colis en transit", "Votre colis CD202605290001CI est en route vers Bouaké.", "Il y a 2h", true, "truck", "#2F6BE0", "#EEF4FF"),
            AppNotification(3, "payment", "Paiement confirmé", "Votre paiement de 2 500 FCFA a été validé.", "Hier 14:30", false, "payment", "#16A34A", "#E6F6EC"),
            AppNotification(4, "promo", "Offre spéciale 🎁", "Profitez de -20% sur votre prochain envoi avec le code COLIS20.", "Il y a 2 jours", false, "star", "#F5B400", "#FEF8E7"),
        )
    }
}
