package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.data.api.model.RelayStatsDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.local.TokenManager
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.repository.RelayRepository
import ci.colisdirect.app.data.repository.ShipmentRepository
import ci.colisdirect.app.domain.RelayShipmentBuckets
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RelayUiState(
    val isLoading: Boolean = false,
    val relayPoint: RelayPointDto? = null,
    val relayCode: String? = null,
    val stats: RelayStatsDto? = null,
    val allShipments: List<ShipmentDto> = emptyList(),
    val activeShipments: List<ShipmentDto> = emptyList(),
    val pendingIntake: List<ShipmentDto> = emptyList(),
    val inRelay: List<ShipmentDto> = emptyList(),
    val awaitingPickup: List<ShipmentDto> = emptyList(),
    val searchResults: List<ShipmentDto> = emptyList(),
    val colisEnCours: List<ShipmentDto> = emptyList(),
    val colisTermine: List<ShipmentDto> = emptyList(),
    val colisIncidents: List<ShipmentDto> = emptyList(),
    val assistedShipments: List<ShipmentDto> = emptyList(),
    val detailShipment: ShipmentDto? = null,
    val detailLoading: Boolean = false,
    val scannedShipment: ShipmentDto? = null,
    val missingRelayAssignment: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class RelayViewModel @Inject constructor(
    private val shipmentRepo: ShipmentRepository,
    private val relayRepo: RelayRepository,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RelayUiState())
    val uiState: StateFlow<RelayUiState> = _uiState.asStateFlow()

    fun loadDashboard(relayPointId: String? = tokenManager.getRelayPointId()) {
        if (relayPointId.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(
                missingRelayAssignment = true,
                error = "Votre compte n'est pas associé à un point relais.",
            )
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                missingRelayAssignment = false,
            )
            val profile = async { relayRepo.getMyRelayPoint() }
            val point = async { relayRepo.getRelayPoint(relayPointId) }
            val stats = async { relayRepo.getRelayPointStats(relayPointId) }
            val shipments = async { shipmentRepo.getShipments(relayId = relayPointId) }
            val active = async { relayRepo.getRelayActiveShipments(relayPointId) }

            var error: String? = null
            var relayPoint: RelayPointDto? = null
            var relayCode: String? = null
            var statsDto: RelayStatsDto? = null
            var all = emptyList<ShipmentDto>()
            var activeList = emptyList<ShipmentDto>()

            when (val r = profile.await()) {
                is ApiResult.Success -> {
                    relayPoint = r.data
                    relayCode = r.data.relayCode
                }
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = point.await()) {
                is ApiResult.Success -> relayPoint = r.data
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = stats.await()) {
                is ApiResult.Success -> statsDto = r.data
                is ApiResult.Error -> { /* non-bloquant */ }
            }
            when (val r = shipments.await()) {
                is ApiResult.Success -> all = r.data
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = active.await()) {
                is ApiResult.Success -> activeList = r.data
                is ApiResult.Error -> { /* non-bloquant */ }
            }

            val buckets = RelayShipmentBuckets.categorize(relayPointId, all, activeList)
            val assisted = all.filter { it.relayAssisted == true }

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                relayPoint = relayPoint,
                relayCode = relayCode ?: relayPoint?.relayCode,
                stats = statsDto,
                allShipments = all,
                activeShipments = activeList,
                pendingIntake = buckets.pendingIntake,
                inRelay = buckets.inRelay,
                awaitingPickup = buckets.awaitingPickup,
                colisEnCours = RelayShipmentBuckets.colisEnCours(all),
                colisTermine = RelayShipmentBuckets.colisTermine(all),
                colisIncidents = RelayShipmentBuckets.colisIncidents(all),
                assistedShipments = assisted,
                error = error,
            )
        }
    }

    fun loadShipmentDetail(shipmentId: String, fallback: ShipmentDto? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                detailLoading = true,
                detailShipment = fallback,
                error = null,
            )
            when (val result = shipmentRepo.getShipmentById(shipmentId)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    detailLoading = false,
                    detailShipment = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    detailLoading = false,
                    detailShipment = fallback,
                    error = result.message,
                )
            }
        }
    }

    fun clearDetailShipment() {
        _uiState.value = _uiState.value.copy(detailShipment = null, detailLoading = false)
    }

    fun loadRelayShipments() = loadDashboard()

    fun searchByPhone(phone: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.searchByPhone(phone)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    searchResults = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun relayIntake(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.relayIntake(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis réceptionné — ${result.data.newStatus}",
                    )
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun relayFinalIntake(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.relayFinalIntake(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis réceptionné au relais de destination",
                    )
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun makeAvailable(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.makeAvailable(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis disponible pour retrait client",
                    )
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun completeDelivery(
        trackingNumber: String,
        pickupCode: String,
        recipientIdentifier: String? = null,
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.completeDelivery(trackingNumber, pickupCode, recipientIdentifier)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Retrait confirmé — colis remis au client",
                    )
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun confirmCashPayment(trackingNumber: String, amount: Double? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.confirmRelayCash(trackingNumber, amount)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Paiement espèces enregistré",
                    )
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null, scannedShipment = null)
    }
}
