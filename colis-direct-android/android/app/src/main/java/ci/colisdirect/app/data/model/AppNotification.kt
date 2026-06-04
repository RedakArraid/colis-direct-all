package ci.colisdirect.app.data.model

data class AppNotification(
    val id: Long,
    val type: String,
    val title: String,
    val body: String,
    val time: String,
    val unread: Boolean,
    val iconKey: String = "package",
    val colorHex: String = "#FF6C00",
    val bgHex: String = "#FFF3E8",
    val trackingNumber: String? = null,
)
