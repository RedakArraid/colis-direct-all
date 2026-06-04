package ci.colisdirect.app.domain

object NameUtils {
    fun splitFullName(full: String): Pair<String, String> {
        val parts = full.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        return when {
            parts.size >= 2 -> parts.dropLast(1).joinToString(" ") to parts.last()
            parts.size == 1 -> parts[0] to parts[0]
            else -> "" to ""
        }
    }

    fun mapVehicleType(label: String): String = when (label.lowercase()) {
        "moto" -> "moto"
        "voiture" -> "voiture"
        "vélo", "velo" -> "velo"
        "à pied", "a pied", "pied" -> "pied"
        else -> "moto"
    }
}
