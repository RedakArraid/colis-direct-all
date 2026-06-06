package ci.colisdirect.app.domain

/** Calcul remise aligné sur `PaymentSummaryStep.tsx` (web). */
object PromoDiscount {

    data class Validated(
        val code: String,
        val discountType: String,
        val discountValue: Double,
    ) {
        val isFree: Boolean get() = discountType == "free"
    }

    fun discountFcfa(totalFcfa: Int, promo: Validated?): Int {
        if (promo == null || totalFcfa <= 0) return 0
        if (promo.isFree) return totalFcfa
        return when (promo.discountType) {
            "percentage" -> (totalFcfa * promo.discountValue / 100.0).toInt()
            else -> minOf(promo.discountValue.toInt(), totalFcfa)
        }
    }

    fun effectiveTotalFcfa(totalFcfa: Int, promo: Validated?): Int =
        (totalFcfa - discountFcfa(totalFcfa, promo)).coerceAtLeast(0)
}
