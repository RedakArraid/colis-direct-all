package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.DeliveryOfferDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.api.model.TransporterProfileDto
import ci.colisdirect.app.data.api.model.TransporterWalletDto
import ci.colisdirect.app.data.api.model.WalletStatsDto
import ci.colisdirect.app.data.api.model.WalletTransactionDto
import ci.colisdirect.app.data.api.model.WithdrawalRequest
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.repository.ShipmentRepository
import ci.colisdirect.app.data.repository.TransporterRepository
import ci.colisdirect.app.domain.TransporterRideFormat
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TransporterUiState(
    val isLoading: Boolean = false,
    val profile: TransporterProfileDto? = null,
    val wallet: TransporterWalletDto? = null,
    val walletStats: WalletStatsDto = WalletStatsDto(),
    val walletTransactions: List<WalletTransactionDto> = emptyList(),
    val offers: List<DeliveryOfferDto> = emptyList(),
    val assignments: List<ShipmentDto> = emptyList(),
    val deliveredShipments: List<ShipmentDto> = emptyList(),
    val homePickupShipments: List<ShipmentDto> = emptyList(),
    val scannedShipment: ShipmentDto? = null,
    val isOnline: Boolean = true,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class TransporterViewModel @Inject constructor(
    private val shipmentRepo: ShipmentRepository,
    private val transporterRepo: TransporterRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TransporterUiState())
    val uiState: StateFlow<TransporterUiState> = _uiState.asStateFlow()

    val activeAssignments: List<ShipmentDto>
        get() = _uiState.value.assignments.filter {
            !TransporterRideFormat.isTerminalStatus(it.currentStatus)
        }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val profile = async { transporterRepo.getProfile() }
            val wallet = async { transporterRepo.getWallet() }
            val offers = async { transporterRepo.getMyOffers() }
            val assignments = async { shipmentRepo.getTransporterAssignments() }
            val delivered = async { shipmentRepo.getDeliveredShipments() }

            var error: String? = null

            when (val r = profile.await()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(profile = r.data)
                is ApiResult.Error -> error = r.message
            }
            when (val r = wallet.await()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    wallet = r.data.wallet,
                    walletStats = r.data.stats ?: WalletStatsDto(),
                )
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = offers.await()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(offers = r.data)
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = assignments.await()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(assignments = r.data)
                is ApiResult.Error -> if (error == null) error = r.message
            }
            when (val r = delivered.await()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(deliveredShipments = r.data)
                is ApiResult.Error -> { /* non-bloquant */ }
            }

            _uiState.value = _uiState.value.copy(isLoading = false, error = error)
        }
    }

    fun loadAssignments() = loadDashboard()

    fun loadDeliveredShipments() {
        viewModelScope.launch {
            when (val result = shipmentRepo.getDeliveredShipments()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    deliveredShipments = result.data,
                )
                is ApiResult.Error -> { /* non-bloquant */ }
            }
        }
    }

    fun loadWalletTransactions() {
        viewModelScope.launch {
            when (val result = transporterRepo.getWalletTransactions()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    walletTransactions = result.data.data ?: emptyList(),
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = result.message)
            }
        }
    }

    fun setOnline(online: Boolean) {
        _uiState.value = _uiState.value.copy(isOnline = online)
    }

    fun acceptOffer(offerId: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = transporterRepo.acceptOffer(offerId)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Course acceptée",
                    )
                    loadDashboard()
                    onSuccess()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun declineOffer(offerId: String) {
        viewModelScope.launch {
            when (val result = transporterRepo.declineOffer(offerId)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        offers = _uiState.value.offers.filter { it.id != offerId },
                        successMessage = "Offre refusée",
                    )
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = result.message)
            }
        }
    }

    fun requestWithdrawal(phone: String, onSuccess: () -> Unit) {
        val balance = _uiState.value.wallet?.balanceFcfa ?: 0.0
        if (balance < 5000) {
            _uiState.value = _uiState.value.copy(
                error = "Solde insuffisant (minimum 5 000 FCFA)",
            )
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (
                val result = transporterRepo.requestWithdrawal(
                    WithdrawalRequest(amountFcfa = balance, orangeMoneyNumber = phone),
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Demande de retrait envoyée",
                    )
                    loadDashboard()
                    onSuccess()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun lookupShipmentForPickup(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, scannedShipment = null)
            when (val result = shipmentRepo.getShipmentForPickup(trackingNumber)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    scannedShipment = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun searchHomePickupByPhone(phone: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.getShipmentsForHomePickup(phone)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    homePickupShipments = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun carrierPickup(trackingNumber: String, relayId: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.carrierPickup(trackingNumber, relayId)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis collecté — ${result.data.newStatus ?: ""}",
                        scannedShipment = null,
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

    fun confirmHomePickup(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.confirmHomePickup(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Ramassage confirmé",
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

    fun deliverToCustomer(
        trackingNumber: String,
        pickupCode: String,
        recipientIdentifier: String? = null,
        onSuccess: () -> Unit = {},
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (
                val result = shipmentRepo.deliverShipment(
                    trackingNumber = trackingNumber,
                    pickupCode = pickupCode.trim(),
                    recipientIdentifier = recipientIdentifier?.trim()?.ifBlank { null },
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = result.data.message ?: "Colis livré",
                    )
                    loadDashboard()
                    onSuccess()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(
            error = null,
            successMessage = null,
            scannedShipment = null,
        )
    }
}
