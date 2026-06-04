package ci.colisdirect.app.domain

import ci.colisdirect.app.data.api.model.PricingCalculateResponse
import ci.colisdirect.app.data.api.model.PricingModeDto

object PricingHelper {

    fun deriveModeKey(pickupMethod: String, homeDelivery: Boolean): String = when {
        pickupMethod == "home_pickup" && homeDelivery -> "home_to_home"
        pickupMethod == "home_pickup" -> "home_to_relay"
        homeDelivery -> "relay_to_home"
        else -> "relay_to_relay"
    }

    fun resolvePackageSize(packageType: String, gridType: String): String = when {
        gridType == "courier" -> "courrier"
        packageType in listOf("courrier", "petit", "moyen", "grand") -> packageType
        else -> "petit"
    }

    fun priceFromApi(
        pricing: PricingCalculateResponse?,
        pickupMethod: String,
        homeDelivery: Boolean,
    ): Int? {
        val key = deriveModeKey(pickupMethod, homeDelivery)
        return pricing?.modes?.find { it.key == key && it.available != false }?.finalPriceFcfa
    }

    /** Fallback local — aligné www/app.js calculatePrice() */
    fun estimateLocalPrice(
        senderCommune: String,
        recipientCommune: String,
        gridType: String,
        packageType: String,
        weight: Double,
        pickupMethod: String,
        homeDelivery: Boolean,
        isFragile: Boolean,
        isInsured: Boolean,
    ): Int {
        val isIntra = senderCommune.trim().equals(recipientCommune.trim(), ignoreCase = true)
        val base = when {
            gridType == "courier" -> if (isIntra) 600 else 1000
            else -> when (packageType) {
                "moyen" -> if (isIntra) 1500 else 2000
                "grand" -> if (isIntra) 2000 else 2500
                else -> if (isIntra) 1000 else 1500
            }
        }
        val fragile = if (isFragile) 500 else 0
        val insured = if (isInsured) 500 else 0
        val pickup = if (pickupMethod == "home_pickup") 500 else 0
        val delivery = if (homeDelivery) 1000 else 0
        return base + fragile + insured + pickup + delivery
    }

    val deliveryModeCards: List<DeliveryModeCard> = listOf(
        DeliveryModeCard("relay_to_relay", "Relais → Relais", "📦", "relay_deposit", false, true),
        DeliveryModeCard("relay_to_home", "Relais → Domicile", "🏘️", "relay_deposit", true, false),
        DeliveryModeCard("home_to_relay", "Domicile → Relais", "📦", "home_pickup", false, false),
        DeliveryModeCard("home_to_home", "Domicile → Domicile", "🏠", "home_pickup", true, false),
    )
}

data class DeliveryModeCard(
    val key: String,
    val label: String,
    val emoji: String,
    val pickupMethod: String,
    val homeDelivery: Boolean,
    val isCheapestDefault: Boolean,
)

fun formatFcfa(amount: Int): String {
    val s = amount.toString()
    val grouped = s.reversed().chunked(3).joinToString(" ").reversed()
    return "$grouped FCFA"
}
