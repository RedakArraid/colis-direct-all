package ci.colisdirect.app.data.api

import ci.colisdirect.app.data.api.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ===================== AUTH =====================

    @POST("auth/signin")
    suspend fun signIn(@Body request: SignInRequest): Response<AuthResponse>

    @POST("auth/signup")
    suspend fun signUp(@Body request: SignUpRequest): Response<AuthResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<MeResponse>

    @PATCH("users/{id}")
    suspend fun updateUser(
        @Path("id") id: String,
        @Body request: UpdateUserRequest,
    ): Response<UserDto>

    @POST("auth/signout")
    suspend fun signOut(): Response<SuccessResponse>

    // ===================== SHIPMENTS =====================

    @GET("shipments")
    suspend fun getShipments(
        @Query("current_status") currentStatus: String? = null,
        @Query("payment_status") paymentStatus: String? = null,
        @Query("relay_id") relayId: String? = null,
    ): Response<List<ShipmentDto>>

    @GET("shipments/{id}")
    suspend fun getShipmentById(@Path("id") id: String): Response<ShipmentDto>

    @POST("shipments")
    suspend fun createShipment(@Body request: CreateShipmentRequest): Response<ShipmentDto>

    @POST("promo-codes/validate")
    suspend fun validatePromoCode(@Body request: PromoValidateRequest): Response<PromoValidateEnvelope>

    @GET("shipments/search/phone/{phone}")
    suspend fun searchByPhone(@Path("phone") phone: String): Response<List<ShipmentDto>>

    @GET("shipments/pickup/tracking/{trackingNumber}")
    suspend fun getShipmentForPickup(
        @Path("trackingNumber") trackingNumber: String
    ): Response<ShipmentDto>

    @GET("shipments/pickup/sender-phone/{phone}")
    suspend fun getShipmentsForHomePickup(
        @Path("phone") phone: String
    ): Response<List<ShipmentDto>>

    // ===================== SCAN =====================

    @POST("scan/relay-intake")
    suspend fun relayIntake(@Body request: RelayIntakeRequest): Response<ScanResponse>

    @POST("scan/carrier-pickup")
    suspend fun carrierPickup(@Body request: CarrierPickupRequest): Response<ScanResponse>

    @POST("scan/confirm-home-pickup")
    suspend fun confirmHomePickup(@Body request: HomePickupConfirmRequest): Response<ScanResponse>

    @POST("scan/relay-final-intake")
    suspend fun relayFinalIntake(@Body request: RelayIntakeRequest): Response<ScanResponse>

    @POST("scan/ops/make-available")
    suspend fun makeAvailable(@Body request: RelayIntakeRequest): Response<ScanResponse>

    @POST("scan/relay/complete-delivery")
    suspend fun completeDelivery(@Body request: CompleteDeliveryRequest): Response<ScanResponse>

    @POST("scan/ops/departure")
    suspend fun departure(@Body request: RelayIntakeRequest): Response<ScanResponse>

    // ===================== TRACKING =====================

    @GET("tracking/{trackingNumber}")
    suspend fun getPublicTracking(
        @Path("trackingNumber") trackingNumber: String
    ): Response<TrackingResponse>

    @GET("tracking/{trackingNumber}")
    suspend fun getTracking(
        @Path("trackingNumber") trackingNumber: String
    ): Response<TrackingResponse>

    // ===================== RELAY POINTS =====================

    @GET("relay-points")
    suspend fun getRelayPoints(): Response<List<RelayPointDto>>

    @GET("relay-points/{id}")
    suspend fun getRelayPoint(@Path("id") id: String): Response<RelayPointDto>

    @GET("relay-points/me")
    suspend fun getMyRelayPoint(): Response<RelayPointDto>

    @GET("relay-points/{id}/stats")
    suspend fun getRelayPointStats(@Path("id") id: String): Response<RelayStatsDto>

    @GET("relay-points/{id}/active-shipments")
    suspend fun getRelayActiveShipments(@Path("id") id: String): Response<List<ShipmentDto>>

    // ===================== RECIPIENT ADDRESSES =====================

    @GET("recipient-addresses")
    suspend fun getRecipientAddresses(): Response<List<RecipientAddressDto>>

    @POST("recipient-addresses")
    suspend fun createRecipientAddress(@Body request: CreateRecipientAddressRequest): Response<RecipientAddressDto>

    @DELETE("recipient-addresses/{id}")
    suspend fun deleteRecipientAddress(@Path("id") id: String): Response<SuccessResponse>

    @POST("transporter-applications")
    suspend fun submitTransporterApplication(
        @Body request: TransporterApplicationRequest,
    ): Response<PartnerApplicationResponse>

    @POST("relay-applications")
    suspend fun submitRelayApplication(
        @Body request: RelayApplicationRequest,
    ): Response<PartnerApplicationResponse>

    // ===================== PRICING =====================

    @GET("pricing-grids/calculate")
    suspend fun calculatePricing(
        @Query("sender_commune") senderCommune: String,
        @Query("recipient_commune") recipientCommune: String,
        @Query("package_size") packageSize: String,
        @Query("grid_type") gridType: String = "colis",
        @Query("weight") weight: Double,
    ): Response<PricingCalculateResponse>

    // ===================== HANDOFFS (Transporter) =====================

    @GET("handoffs/transporter/assignments")
    suspend fun getTransporterAssignments(): Response<List<ShipmentDto>>

    @GET("handoffs/transporter/delivered-shipments")
    suspend fun getDeliveredShipments(): Response<List<ShipmentDto>>

    @GET("handoffs/transporter/profile")
    suspend fun getTransporterProfile(): Response<TransporterProfileDto>

    @GET("transporter/wallet")
    suspend fun getTransporterWallet(): Response<TransporterWalletResponse>

    @GET("transporter/wallet/transactions")
    suspend fun getWalletTransactions(
        @Query("limit") limit: Int,
        @Query("offset") offset: Int,
    ): Response<WalletTransactionsResponse>

    @POST("transporter/wallet/withdraw")
    suspend fun requestWithdrawal(@Body request: WithdrawalRequest): Response<SimpleSuccessResponse>

    @GET("delivery-offers/my-offers")
    suspend fun getMyDeliveryOffers(): Response<List<DeliveryOfferDto>>

    @POST("delivery-offers/{offerId}/accept")
    suspend fun acceptDeliveryOffer(@Path("offerId") offerId: String): Response<SimpleSuccessResponse>

    @POST("delivery-offers/{offerId}/decline")
    suspend fun declineDeliveryOffer(@Path("offerId") offerId: String): Response<SimpleSuccessResponse>

    // ===================== PAYMENT =====================

    @POST("payments/paystack/init")
    suspend fun initPaystack(@Body request: PaystackInitRequest): Response<PaystackInitResponse>

    @POST("payments/paystack/verify")
    suspend fun verifyPaystack(@Body request: PaystackVerifyRequest): Response<PaystackVerifyResponse>

    @GET("payments/automated/{trackingNumber}")
    suspend fun getAutomatedPayment(
        @Path("trackingNumber") trackingNumber: String,
    ): Response<AutomatedPaymentDto>

    @GET("tracking/{trackingNumber}/dispatch-status")
    suspend fun getDispatchStatus(
        @Path("trackingNumber") trackingNumber: String,
    ): Response<DispatchStatusDto>

    @POST("payments/relay-cash/confirm")
    suspend fun confirmRelayCash(@Body request: RelayCashConfirmRequest): Response<SuccessResponse>

    @POST("shipments/{trackingNumber}/deliver")
    suspend fun deliverShipment(
        @Path("trackingNumber") trackingNumber: String,
        @Body request: DeliverShipmentRequest,
    ): Response<DeliverShipmentResponse>

    @POST("shipments/{trackingNumber}/cancel")
    suspend fun cancelShipment(@Path("trackingNumber") trackingNumber: String): Response<SuccessResponse>

    @POST("shipments/{trackingNumber}/switch-to-relay-payment")
    suspend fun switchToRelayPayment(@Path("trackingNumber") trackingNumber: String): Response<SuccessResponse>

    // ===================== ADMIN / SUPPORT =====================

    @GET("stats")
    suspend fun getAdminStats(): Response<AdminDashboardStatsDto>

    @GET("users")
    suspend fun getUsers(
        @Query("role") role: String? = null,
        @Query("search") search: String? = null,
    ): Response<List<UserDto>>

    @GET("relay-applications")
    suspend fun getRelayApplications(
        @Query("status") status: String? = null,
    ): Response<List<RelayApplicationDto>>

    @GET("transporter-applications")
    suspend fun getTransporterApplications(
        @Query("status") status: String? = null,
    ): Response<List<TransporterApplicationDto>>

    @GET("support/dashboard")
    suspend fun getSupportDashboard(): Response<SupportDashboardDto>

    @GET("payments/relay-cash/dashboard")
    suspend fun getRelayCashDashboard(): Response<RelayCashDashboardDto>

    @GET("support/tickets")
    suspend fun getSupportTickets(
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("limit") limit: Int? = 50,
    ): Response<List<SupportTicketDto>>

    @GET("support/tickets/{id}")
    suspend fun getSupportTicket(@Path("id") id: String): Response<SupportTicketDetailDto>

    @POST("support/tickets/{id}/reply")
    suspend fun replySupportTicket(
        @Path("id") id: String,
        @Body request: SupportReplyRequest,
    ): Response<SuccessResponse>

    @POST("support/tickets/{id}/status")
    suspend fun updateSupportTicketStatus(
        @Path("id") id: String,
        @Body request: SupportStatusRequest,
    ): Response<SuccessResponse>
}
