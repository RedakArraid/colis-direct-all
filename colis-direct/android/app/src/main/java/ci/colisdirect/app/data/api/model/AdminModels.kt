package ci.colisdirect.app.data.api.model

import com.google.gson.annotations.SerializedName

data class AdminDashboardStatsDto(
    @SerializedName("dailyShipments") val dailyShipments: Int = 0,
    @SerializedName("inTransit") val inTransit: Int = 0,
    @SerializedName("deliveredToday") val deliveredToday: Int = 0,
    @SerializedName("totalDelivered") val totalDelivered: Int = 0,
    @SerializedName("monthlyRevenue") val monthlyRevenue: Double = 0.0,
    @SerializedName("totalUsers") val totalUsers: Int = 0,
    @SerializedName("activeRelays") val activeRelays: Int = 0,
    @SerializedName("weekGrowth") val weekGrowth: Double = 0.0,
    @SerializedName("byCommune") val byCommune: List<CountByLabelDto> = emptyList(),
    @SerializedName("byStatus") val byStatus: List<StatusCountDto> = emptyList(),
    @SerializedName("dailyData") val dailyData: List<DailyStatDto> = emptyList(),
    @SerializedName("recentActivity") val recentActivity: List<AdminActivityDto> = emptyList(),
    @SerializedName("deliveryModes") val deliveryModes: DeliveryModesDto? = null,
    @SerializedName("topRelayPoints") val topRelayPoints: List<TopRelayPointDto> = emptyList(),
    val performance: AdminPerformanceDto? = null,
    @SerializedName("supportSummary") val supportSummary: Map<String, Int>? = null,
    @SerializedName("pendingRelayApplications") val pendingRelayApplications: List<RelayApplicationDto> = emptyList(),
    @SerializedName("pendingRelayApplicationsCount") val pendingRelayApplicationsCount: Int = 0,
    @SerializedName("stuckShipmentsDetails") val stuckShipmentsDetails: List<StuckShipmentDto> = emptyList(),
    @SerializedName("topZones") val topZones: List<TopZoneDto> = emptyList(),
    @SerializedName("zoneSummary") val zoneSummary: ZoneSummaryDto? = null,
)

data class CountByLabelDto(
    @SerializedName("sender_commune") val label: String?,
    val count: String?,
)

data class StatusCountDto(
    @SerializedName("current_status") val currentStatus: String?,
    val status: String?,
    val count: String?,
)

data class DailyStatDto(
    val date: String?,
    val shipments: String?,
    val revenue: String?,
)

data class AdminActivityDto(
    val id: String?,
    @SerializedName("tracking_number") val trackingNumber: String?,
    @SerializedName("current_status") val currentStatus: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("sender_name") val senderName: String?,
    @SerializedName("recipient_name") val recipientName: String?,
    val price: Double?,
    @SerializedName("updated_by_name") val updatedByName: String?,
)

data class DeliveryModesDto(
    val relay: Int = 0,
    val home: Int = 0,
)

data class AdminPerformanceDto(
    @SerializedName("avgDeliveryHours") val avgDeliveryHours: Double? = null,
    @SerializedName("successRate") val successRate: Double? = null,
    @SerializedName("incidentCount") val incidentCount: Int = 0,
    @SerializedName("stuckShipments") val stuckShipments: Int = 0,
)

data class TopRelayPointDto(
    val id: String?,
    val name: String?,
    val commune: String?,
    val count: String?,
)

data class StuckShipmentDto(
    val id: String?,
    @SerializedName("tracking_number") val trackingNumber: String?,
    @SerializedName("current_status") val currentStatus: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("age_hours") val ageHours: Double?,
)

data class TopZoneDto(
    val id: String?,
    val name: String?,
    val count: String?,
)

data class ZoneSummaryDto(
    val total: Int = 0,
    val active: Int = 0,
    val inactive: Int = 0,
)

data class SupportDashboardDto(
    val open: Int = 0,
    val pending: Int = 0,
    val resolved: Int = 0,
    val closed: Int = 0,
    val urgent: Int = 0,
    @SerializedName("avgResponseMinutes") val avgResponseMinutes: Double = 0.0,
    val escalated: Int = 0,
    @SerializedName("channelVolume") val channelVolume: List<ChannelVolumeDto> = emptyList(),
)

data class ChannelVolumeDto(
    val channel: String?,
    val count: Int = 0,
)

data class SupportTicketDto(
    val id: String,
    val subject: String?,
    val status: String?,
    val priority: String?,
    val channel: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("customer_email") val customerEmail: String?,
    @SerializedName("customer_phone") val customerPhone: String?,
    @SerializedName("assigned_agent_name") val assignedAgentName: String?,
)

data class SupportTicketDetailDto(
    val id: String,
    val subject: String?,
    val status: String?,
    val priority: String?,
    val channel: String?,
    val body: String?,
    @SerializedName("created_at") val createdAt: String?,
    val messages: List<SupportMessageDto> = emptyList(),
)

data class SupportMessageDto(
    val id: String?,
    val body: String?,
    @SerializedName("sender_type") val senderType: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class RelayApplicationDto(
    val id: String,
    @SerializedName("business_name") val businessName: String?,
    val commune: String?,
    val quartier: String?,
    val status: String?,
    @SerializedName("created_at") val createdAt: String?,
    val phone: String?,
    val email: String?,
)

data class TransporterApplicationDto(
    val id: String,
    @SerializedName("first_name") val firstName: String?,
    @SerializedName("last_name") val lastName: String?,
    val email: String?,
    val phone: String?,
    val status: String?,
    @SerializedName("vehicle_type") val vehicleType: String?,
    @SerializedName("created_at") val createdAt: String?,
)

data class SupportReplyRequest(
    val body: String,
)

data class SupportStatusRequest(
    val status: String,
)

data class RelayCashDashboardEntryDto(
    val id: String,
    @SerializedName("shipment_id") val shipmentId: String?,
    @SerializedName("tracking_number") val trackingNumber: String?,
    @SerializedName("relay_point_id") val relayPointId: String?,
    @SerializedName("relay_name") val relayName: String?,
    @SerializedName("amount_expected") val amountExpected: Double?,
    @SerializedName("amount_collected") val amountCollected: Double?,
    val status: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("collected_at") val collectedAt: String?,
)

data class RelayCashByRelayDto(
    @SerializedName("relay_point_id") val relayPointId: String?,
    @SerializedName("relay_name") val relayName: String?,
    @SerializedName("pending_count") val pendingCount: Int = 0,
    @SerializedName("collected_count") val collectedCount: Int = 0,
    @SerializedName("pending_amount") val pendingAmount: Double = 0.0,
    @SerializedName("collected_amount") val collectedAmount: Double = 0.0,
)

data class RelayCashSummaryDto(
    @SerializedName("byRelay") val byRelay: List<RelayCashByRelayDto> = emptyList(),
)

data class RelayCashDashboardDto(
    val pending: List<RelayCashDashboardEntryDto> = emptyList(),
    val collected: List<RelayCashDashboardEntryDto> = emptyList(),
    val summary: RelayCashSummaryDto? = null,
)
