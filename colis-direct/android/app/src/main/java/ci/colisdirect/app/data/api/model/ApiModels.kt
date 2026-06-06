package ci.colisdirect.app.data.api.model

import com.google.gson.annotations.SerializedName

// ===================== AUTH =====================

data class SignInRequest(
    val email: String? = null,
    val phone: String? = null,
    val password: String
)

data class SignUpRequest(
    val email: String,
    val password: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val phone: String
)

data class AuthResponse(
    val user: UserDto,
    val token: String
)

data class UserDto(
    val id: String,
    val email: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val phone: String?,
    val role: String,
    @SerializedName("relay_point_id") val relayPointId: String?,
    @SerializedName("is_pro") val isPro: Boolean?,
    val address: String?,
    val commune: String?,
    val quartier: String?,
    val ville: String?,
)

data class MeResponse(
    val user: UserDto
)

data class UpdateUserRequest(
    @SerializedName("first_name") val firstName: String? = null,
    @SerializedName("last_name") val lastName: String? = null,
    val phone: String? = null,
    val commune: String? = null,
    val quartier: String? = null,
    val ville: String? = null,
    val address: String? = null,
)

// ===================== SHIPMENTS =====================

data class ShipmentDto(
    val id: String,
    @SerializedName("tracking_number") val trackingNumber: String,
    @SerializedName("shipment_code") val shipmentCode: String?,

    // Sender
    @SerializedName("sender_first_name") val senderFirstName: String?,
    @SerializedName("sender_last_name") val senderLastName: String?,
    @SerializedName("sender_email") val senderEmail: String?,
    @SerializedName("sender_phone") val senderPhone: String?,
    @SerializedName("sender_commune") val senderCommune: String?,
    @SerializedName("sender_address") val senderAddress: String?,

    // Recipient
    @SerializedName("recipient_first_name") val recipientFirstName: String?,
    @SerializedName("recipient_last_name") val recipientLastName: String?,
    @SerializedName("recipient_email") val recipientEmail: String?,
    @SerializedName("recipient_phone") val recipientPhone: String?,
    @SerializedName("recipient_commune") val recipientCommune: String?,
    @SerializedName("recipient_address") val recipientAddress: String?,

    // Package
    @SerializedName("package_type") val packageType: String?,
    val weight: Double?,
    val price: Double?,

    // Status
    @SerializedName("current_status") val currentStatus: String?,
    @SerializedName("effective_status") val effectiveStatus: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("payment_method") val paymentMethod: String?,
    @SerializedName("pickup_method") val pickupMethod: String?,
    @SerializedName("home_delivery") val homeDelivery: Boolean?,
    @SerializedName("pickup_code") val pickupCode: String?,

    // Relays
    @SerializedName("origin_relay_id") val originRelayId: String?,
    @SerializedName("destination_relay_id") val destinationRelayId: String?,
    @SerializedName("relay_name") val relayName: String?,
    @SerializedName("relay_commune") val relayCommune: String?,
    @SerializedName("origin_relay_name") val originRelayName: String?,
    @SerializedName("origin_relay_commune") val originRelayCommune: String?,
    @SerializedName("destination_relay_name") val destinationRelayName: String?,
    @SerializedName("destination_relay_commune") val destinationRelayCommune: String?,
    @SerializedName("assignment_status") val assignmentStatus: String?,

    // Nested relay info
    @SerializedName("origin_relay") val originRelay: RelayInfoDto?,
    @SerializedName("destination_relay") val destinationRelay: RelayInfoDto?,

    // Timestamps
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,

    // Payment details
    @SerializedName("mobile_money_payment") val mobileMoneyPayment: MobileMoneyPaymentDto?,
    @SerializedName("relay_cash_payment") val relayCashPayment: RelayCashPaymentDto?,

    // Fees
    @SerializedName("printing_fee") val printingFee: Double?,
    @SerializedName("assistance_fee") val assistanceFee: Double?,
    @SerializedName("box_price") val boxPrice: Double?,
    @SerializedName("relay_assisted") val relayAssisted: Boolean? = false,
    @SerializedName("delivery_zone_name") val deliveryZoneName: String? = null,
)

data class RelayInfoDto(
    val name: String?,
    val commune: String?,
    val quartier: String?,
    val address: String?,
    val phone: String?,
)

data class MobileMoneyPaymentDto(
    val id: String?,
    val status: String?,
    @SerializedName("transaction_id") val transactionId: String?,
)

data class RelayCashPaymentDto(
    val id: String?,
    val status: String?,
    @SerializedName("amount_expected") val amountExpected: Double?,
    @SerializedName("amount_collected") val amountCollected: Double?,
)

data class CreateShipmentRequest(
    @SerializedName("sender_first_name") val senderFirstName: String,
    @SerializedName("sender_last_name") val senderLastName: String,
    @SerializedName("sender_phone") val senderPhone: String,
    @SerializedName("sender_email") val senderEmail: String?,
    @SerializedName("sender_commune") val senderCommune: String,
    @SerializedName("sender_quartier") val senderQuartier: String?,
    @SerializedName("sender_address") val senderAddress: String?,
    @SerializedName("sender_repere") val senderRepere: String? = null,
    @SerializedName("recipient_first_name") val recipientFirstName: String,
    @SerializedName("recipient_last_name") val recipientLastName: String,
    @SerializedName("recipient_phone") val recipientPhone: String,
    @SerializedName("recipient_email") val recipientEmail: String?,
    @SerializedName("recipient_commune") val recipientCommune: String,
    @SerializedName("recipient_quartier") val recipientQuartier: String?,
    @SerializedName("recipient_address") val recipientAddress: String?,
    @SerializedName("recipient_repere") val recipientRepere: String? = null,
    @SerializedName("package_type") val packageType: String,
    @SerializedName("grid_type") val gridType: String? = "colis",
    val weight: Double,
    @SerializedName("payment_method") val paymentMethod: String,
    @SerializedName("pickup_method") val pickupMethod: String,
    @SerializedName("home_delivery") val homeDelivery: Boolean,
    @SerializedName("origin_relay_id") val originRelayId: String?,
    @SerializedName("destination_relay_id") val destinationRelayId: String?,
    @SerializedName("print_at_relay") val printAtRelay: Boolean = false,
    @SerializedName("relay_assisted") val relayAssisted: Boolean = false,
    @SerializedName("promo_code") val promoCode: String? = null,
)

data class PromoValidateRequest(val code: String)

data class PromoValidateResponse(
    val code: String,
    @SerializedName("discount_type") val discountType: String,
    @SerializedName("discount_value") val discountValue: Double,
)

data class PromoValidateEnvelope(
    val data: PromoValidateResponse?,
)

// ===================== RELAY POINTS =====================

data class RelayPointDto(
    val id: String,
    val name: String,
    val commune: String?,
    val quartier: String?,
    val address: String?,
    val phone: String?,
    @SerializedName("relay_code") val relayCode: String?,
    @SerializedName("zone_id") val zoneId: String?,
    @SerializedName("is_active") val isActive: Boolean?,
    val latitude: Double?,
    val longitude: Double?,
    val hours: String?,
)

data class RelayStatsDto(
    @SerializedName("pending_pickups") val pendingPickups: Int = 0,
    @SerializedName("pending_deliveries") val pendingDeliveries: Int = 0,
    @SerializedName("completed_today") val completedToday: Int = 0,
    @SerializedName("monthly_revenue") val monthlyRevenue: Double = 0.0,
    @SerializedName("updated_at") val updatedAt: String? = null,
    val financials: RelayFinancialsDto? = null,
)

data class RelayFinancialsDto(
    val today: RelayFinancialPeriodDto? = null,
    val week: RelayFinancialPeriodDto? = null,
    val month: RelayFinancialPeriodDto? = null,
)

data class PaymentBreakdownItemDto(
    val count: Int = 0,
    val amount: Double = 0.0,
)

data class RelayFinancialPeriodDto(
    val revenue: Double = 0.0,
    val shipments: Int = 0,
    @SerializedName("shipments_paid") val shipmentsPaid: Int = 0,
    val commissions: Double = 0.0,
    @SerializedName("assisted_count") val assistedCount: Int = 0,
    @SerializedName("assistance_revenue") val assistanceRevenue: Double = 0.0,
    @SerializedName("printing_revenue") val printingRevenue: Double = 0.0,
    @SerializedName("home_delivery_count") val homeDeliveryCount: Int = 0,
    @SerializedName("relay_delivery_count") val relayDeliveryCount: Int = 0,
    @SerializedName("payment_breakdown") val paymentBreakdown: Map<String, PaymentBreakdownItemDto>? = null,
)

data class RelayCashConfirmRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    val amount: Double? = null,
    val notes: String? = null,
)

// ===================== SCAN =====================

data class ScanRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    val timestamp: String? = null,
)

data class RelayIntakeRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    val timestamp: String? = null,
)

data class CarrierPickupRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    @SerializedName("relay_id") val relayId: String?,
    val timestamp: String? = null,
)

data class HomePickupConfirmRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    val timestamp: String? = null,
)

data class CompleteDeliveryRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
    @SerializedName("pickup_code") val pickupCode: String,
    @SerializedName("recipient_identifier") val recipientIdentifier: String? = null,
    val timestamp: String? = null,
)

/** Livraison transporteur (domicile ou relais) — POST shipments/{trackingNumber}/deliver */
data class DeliverShipmentRequest(
    @SerializedName("pickup_code") val pickupCode: String,
    @SerializedName("recipient_identifier") val recipientIdentifier: String? = null,
)

data class DeliverShipmentResponse(
    val success: Boolean,
    val message: String?,
    @SerializedName("new_status") val newStatus: String?,
    val shipment: ShipmentDto?,
)

data class ScanResponse(
    val success: Boolean,
    @SerializedName("new_status") val newStatus: String?,
    val message: String?,
    val error: String?,
)

// ===================== TRACKING =====================

data class TrackingResponse(
    @SerializedName("tracking_number") val trackingNumber: String,
    @SerializedName("current_status") val currentStatus: String?,
    val shipment: ShipmentDto?,
    val events: List<TrackingEventDto>?,
)

data class TrackingEventDto(
    val status: String,
    val location: String?,
    @SerializedName("scanner_type") val scannerType: String?,
    val notes: String?,
    val timestamp: String?,
)

// ===================== PAYMENT =====================

data class PaystackInitRequest(
    @SerializedName("tracking_number") val trackingNumber: String,
)

data class PaystackInitResponse(
    val success: Boolean,
    @SerializedName("authorization_url") val authorizationUrl: String?,
    val reference: String?,
    val error: String?,
)

data class PaystackVerifyRequest(
    val reference: String,
    @SerializedName("tracking_number") val trackingNumber: String,
)

data class PaystackVerifyResponse(
    val paid: Boolean = false,
    val status: String? = null,
    val reference: String? = null,
)

data class AutomatedPaymentDto(
    val provider: String? = null,
    @SerializedName("transaction_id") val transactionId: String? = null,
    val status: String? = null,
    val amount: Double? = null,
    @SerializedName("created_at") val createdAt: String? = null,
)

data class DispatchPickupDto(
    val latitude: Double? = null,
    val longitude: Double? = null,
)

data class DispatchDriverDto(
    @SerializedName("first_name") val firstName: String?,
    @SerializedName("last_name") val lastName: String?,
    val phone: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("license_plate") val licensePlate: String?,
    @SerializedName("transporter_code") val transporterCode: String?,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerializedName("location_updated_at") val locationUpdatedAt: String? = null,
)

data class DispatchStatusDto(
    val state: String,
    val pickup: DispatchPickupDto? = null,
    @SerializedName("offers_sent") val offersSent: Int? = null,
    val round: Int? = null,
    val driver: DispatchDriverDto? = null,
)

// ===================== COMMON =====================

data class ErrorResponse(
    val error: String,
)

data class SuccessResponse(
    val success: Boolean,
    val message: String?,
)

// ===================== RECIPIENT ADDRESSES =====================

data class RecipientAddressDto(
    val id: String,
    val label: String?,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val email: String?,
    val phone: String,
    val commune: String,
    val quartier: String?,
    val address: String,
    @SerializedName("is_default") val isDefault: Boolean? = false,
    @SerializedName("created_at") val createdAt: String? = null,
)

data class CreateRecipientAddressRequest(
    val label: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val email: String? = null,
    val phone: String,
    val commune: String,
    val quartier: String,
    val address: String,
    @SerializedName("is_default") val isDefault: Boolean = false,
)

data class TransporterApplicationRequest(
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val phone: String,
    val email: String,
    @SerializedName("vehicle_type") val vehicleType: String,
    val commune: String,
    val quartier: String? = null,
    val address: String? = null,
)

data class RelayApplicationRequest(
    @SerializedName("applicant_first_name") val applicantFirstName: String,
    @SerializedName("applicant_last_name") val applicantLastName: String,
    @SerializedName("business_name") val businessName: String,
    @SerializedName("business_type") val businessType: String,
    val phone: String,
    val email: String,
    val commune: String,
    val quartier: String,
    val address: String,
)

data class PartnerApplicationResponse(
    val message: String? = null,
)

// ===================== PRICING =====================

data class PricingCalculateResponse(
    @SerializedName("sender_commune") val senderCommune: String?,
    @SerializedName("recipient_commune") val recipientCommune: String?,
    @SerializedName("package_size") val packageSize: String?,
    @SerializedName("distance_km") val distanceKm: Double?,
    @SerializedName("is_same_zone") val isSameZone: Boolean?,
    @SerializedName("zone_resolved") val zoneResolved: Boolean?,
    @SerializedName("standard_price_fcfa") val standardPriceFcfa: Int?,
    val modes: List<PricingModeDto>?,
)

data class PricingModeDto(
    val key: String,
    val label: String?,
    val emoji: String?,
    @SerializedName("pickup_method") val pickupMethod: String,
    @SerializedName("home_delivery") val homeDelivery: Boolean,
    @SerializedName("final_price_fcfa") val finalPriceFcfa: Int,
    @SerializedName("is_cheapest") val isCheapest: Boolean? = false,
    val delay: String?,
    val available: Boolean? = true,
)
