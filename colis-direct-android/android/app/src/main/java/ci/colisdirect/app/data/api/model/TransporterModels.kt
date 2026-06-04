package ci.colisdirect.app.data.api.model

import com.google.gson.annotations.SerializedName

data class TransporterProfileDto(
    val id: String,
    @SerializedName("transporter_code") val transporterCode: String?,
    val status: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("license_plate") val licensePlate: String?,
    @SerializedName("user_id") val userId: String?,
    val email: String?,
    @SerializedName("first_name") val firstName: String?,
    @SerializedName("last_name") val lastName: String?,
    val phone: String?,
    val rating: Double? = null,
    @SerializedName("success_rate") val successRate: Int? = null,
    @SerializedName("total_deliveries") val totalDeliveries: Int? = null,
)

data class WalletStatsDto(
    val today: Double = 0.0,
    val week: Double = 0.0,
    val month: Double = 0.0,
)

data class TransporterWalletDto(
    @SerializedName("balance_fcfa") val balanceFcfa: Double? = 0.0,
)

data class TransporterWalletResponse(
    val wallet: TransporterWalletDto?,
    val stats: WalletStatsDto?,
)

data class WalletTransactionDto(
    val id: String?,
    val type: String?,
    val status: String?,
    @SerializedName("amount_fcfa") val amountFcfa: Double?,
    @SerializedName("tracking_number") val trackingNumber: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class WalletTransactionsResponse(
    val data: List<WalletTransactionDto>?,
    val total: Int?,
)

data class DeliveryOfferDto(
    val id: String,
    @SerializedName("shipment_id") val shipmentId: String?,
    @SerializedName("tracking_number") val trackingNumber: String?,
    @SerializedName("sender_first_name") val senderFirstName: String?,
    @SerializedName("sender_last_name") val senderLastName: String?,
    @SerializedName("sender_commune") val senderCommune: String?,
    @SerializedName("sender_address") val senderAddress: String?,
    @SerializedName("sender_phone") val senderPhone: String?,
    @SerializedName("recipient_first_name") val recipientFirstName: String?,
    @SerializedName("recipient_last_name") val recipientLastName: String?,
    @SerializedName("recipient_commune") val recipientCommune: String?,
    @SerializedName("recipient_address") val recipientAddress: String?,
    @SerializedName("recipient_phone") val recipientPhone: String?,
    @SerializedName("package_type") val packageType: String?,
    val weight: Double?,
    @SerializedName("home_delivery") val homeDelivery: Boolean?,
    @SerializedName("pickup_method") val pickupMethod: String?,
    val price: Double?,
    @SerializedName("net_earnings_fcfa") val netEarningsFcfa: Double?,
    @SerializedName("origin_relay_name") val originRelayName: String?,
    @SerializedName("origin_relay_commune") val originRelayCommune: String?,
    @SerializedName("destination_relay_name") val destinationRelayName: String?,
    @SerializedName("destination_relay_commune") val destinationRelayCommune: String?,
    @SerializedName("offered_at") val offeredAt: String?,
)

data class WithdrawalRequest(
    @SerializedName("amount_fcfa") val amountFcfa: Double,
    @SerializedName("orange_money_number") val orangeMoneyNumber: String,
    val notes: String? = null,
)

data class SimpleSuccessResponse(
    val success: Boolean? = true,
    val message: String? = null,
    val error: String? = null,
)
