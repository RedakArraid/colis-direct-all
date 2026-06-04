package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.CountByLabelDto
import ci.colisdirect.app.data.api.model.StatusCountDto
import kotlin.math.roundToInt

object AdminDisplayFormat {

    fun formatFcfa(amount: Double?): String {
        if (amount == null || !amount.isFinite()) return "—"
        val v = amount.roundToInt()
        val grouped = v.toString().reversed().chunked(3).joinToString(" ").reversed()
        return "$grouped FCFA"
    }

    fun parseCount(raw: String?): Int = raw?.toIntOrNull() ?: raw?.toDoubleOrNull()?.roundToInt() ?: 0

    fun statusLabel(status: String?): String = RelayDisplayFormat.statusLabel(status.orEmpty())

    fun ticketStatusLabel(status: String?): String = when (status?.lowercase()) {
        "open" -> "Ouvert"
        "pending" -> "En cours"
        "escalated" -> "Escaladé"
        "resolved" -> "Résolu"
        "closed" -> "Fermé"
        else -> status ?: "—"
    }

    fun priorityLabel(priority: String?): String = when (priority?.lowercase()) {
        "urgent" -> "Urgent"
        "high" -> "Haute"
        "normal" -> "Normale"
        "low" -> "Basse"
        else -> priority ?: "—"
    }

    fun roleLabel(role: String?): String = when (role) {
        "admin" -> "Administrateur"
        "support", "support_supervisor" -> "Support"
        "relay_partner" -> "Point relais"
        "transporter" -> "Transporteur"
        "client" -> "Client"
        else -> role ?: "—"
    }

    fun formatDateTime(iso: String?): String = RelayDisplayFormat.formatDateTime(iso)

    fun communeRow(item: CountByLabelDto): Pair<String, Int> =
        (item.label ?: "Autre") to parseCount(item.count)

    fun statusRow(item: StatusCountDto): Pair<String, Int> {
        val status = item.currentStatus ?: item.status
        return statusLabel(status) to parseCount(item.count)
    }

    fun formatHours(hours: Double?): String {
        if (hours == null || hours <= 0) return "N/A"
        return if (hours >= 24) {
            val days = (hours / 24).toInt()
            val h = (hours % 24).roundToInt()
            "$days j $h h"
        } else {
            "${hours.roundToInt()} h"
        }
    }

    fun formatPercent(value: Double?): String =
        if (value != null && value.isFinite()) "${(value * 10).roundToInt() / 10.0}%" else "N/A"
}
