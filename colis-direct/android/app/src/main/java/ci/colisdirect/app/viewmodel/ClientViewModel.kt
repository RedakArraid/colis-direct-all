package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.CreateShipmentRequest
import ci.colisdirect.app.data.api.model.DispatchStatusDto
import ci.colisdirect.app.data.api.model.PricingCalculateResponse
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.api.model.TrackingResponse
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import ci.colisdirect.app.data.local.PaystackSessionStore
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.api.model.CreateRecipientAddressRequest
import ci.colisdirect.app.data.repository.RecipientAddressRepository
import ci.colisdirect.app.data.repository.ShipmentRepository
import ci.colisdirect.app.domain.PricingHelper
import ci.colisdirect.app.domain.PromoDiscount
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClientUiState(
    val isLoading: Boolean = false,
    val shipments: List<ShipmentDto> = emptyList(),
    val selectedShipment: ShipmentDto? = null,
    val tracking: TrackingResponse? = null,
    val relayPoints: List<ci.colisdirect.app.data.api.model.RelayPointDto> = emptyList(),
    val pricing: PricingCalculateResponse? = null,
    val pricingLoading: Boolean = false,
    val checkoutShipment: ShipmentDto? = null,
    val checkoutLoading: Boolean = false,
    val dispatchStatus: DispatchStatusDto? = null,
    val lastPaystackReference: String? = null,
    val paymentVerified: Boolean? = null,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class ClientViewModel @Inject constructor(
    private val shipmentRepo: ShipmentRepository,
    private val addressRepo: RecipientAddressRepository,
    private val paystackSession: PaystackSessionStore,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ClientUiState())
    val uiState: StateFlow<ClientUiState> = _uiState.asStateFlow()
    private var dispatchPollJob: Job? = null

    fun loadPricing(
        senderCommune: String,
        recipientCommune: String,
        packageType: String,
        gridType: String,
        weight: Double,
    ) {
        if (senderCommune.isBlank() || recipientCommune.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(pricingLoading = true)
            val pkg = PricingHelper.resolvePackageSize(packageType, gridType)
            when (
                val result = shipmentRepo.calculatePricing(
                    senderCommune = senderCommune.trim(),
                    recipientCommune = recipientCommune.trim(),
                    packageSize = pkg,
                    gridType = gridType,
                    weight = weight.coerceAtLeast(0.1),
                )
            ) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    pricingLoading = false,
                    pricing = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    pricingLoading = false,
                    pricing = null,
                )
            }
        }
    }

    fun resolveDisplayPrice(
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
        val apiPrice = PricingHelper.priceFromApi(_uiState.value.pricing, pickupMethod, homeDelivery)
        val base = apiPrice ?: PricingHelper.estimateLocalPrice(
            senderCommune, recipientCommune, gridType, packageType, weight,
            pickupMethod, homeDelivery, isFragile, isInsured,
        )
        val extras = if (apiPrice != null) {
            (if (isFragile) 500 else 0) + (if (isInsured) 500 else 0)
        } else 0
        return base + extras
    }

    fun loadRelayPoints() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.getRelayPoints()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    relayPoints = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun loadShipments() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.getShipments()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    shipments = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun loadShipmentDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.getShipmentById(id)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    selectedShipment = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun trackPublic(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, tracking = null)
            when (val result = shipmentRepo.getPublicTracking(trackingNumber)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    tracking = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    /** Charge l'historique sans bloquer l'écran détail colis */
    fun loadTrackingEvents(trackingNumber: String) {
        viewModelScope.launch {
            when (val result = shipmentRepo.getPublicTracking(trackingNumber)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(tracking = result.data)
                is ApiResult.Error -> Unit
            }
        }
    }

    fun saveRecipientToAddressBook(
        firstName: String,
        lastName: String,
        phone: String,
        commune: String,
        quartier: String,
        address: String,
        email: String? = null,
    ) {
        viewModelScope.launch {
            val label = "$firstName $lastName".trim().ifBlank { commune }
            val request = CreateRecipientAddressRequest(
                label = label,
                firstName = firstName.trim(),
                lastName = lastName.trim(),
                email = email,
                phone = phone.trim(),
                commune = commune.trim(),
                quartier = quartier.trim(),
                address = address.trim(),
            )
            when (addressRepo.createAddress(request)) {
                is ApiResult.Success -> Unit
                is ApiResult.Error -> Unit
            }
        }
    }

    suspend fun validatePromoCode(code: String): ApiResult<PromoDiscount.Validated> =
        shipmentRepo.validatePromoCode(code)

    fun createShipment(
        request: CreateShipmentRequest,
        saveRecipientToBook: Boolean = false,
        onSuccess: (ShipmentDto) -> Unit,
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.createShipment(request)) {
                is ApiResult.Success -> {
                    if (saveRecipientToBook) {
                        saveRecipientToAddressBook(
                            firstName = request.recipientFirstName,
                            lastName = request.recipientLastName,
                            phone = request.recipientPhone,
                            commune = request.recipientCommune,
                            quartier = request.recipientQuartier.orEmpty(),
                            address = request.recipientAddress.orEmpty(),
                            email = request.recipientEmail,
                        )
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis créé avec succès !",
                    )
                    onSuccess(result.data)
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun initiatePaystackPayment(
        trackingNumber: String,
        onPaystackUrl: (String) -> Unit,
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.initPaystack(trackingNumber)) {
                is ApiResult.Success -> {
                    val reference = result.data.reference
                    if (!reference.isNullOrBlank()) {
                        paystackSession.saveReference(trackingNumber, reference)
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        lastPaystackReference = reference,
                    )
                    val url = result.data.authorizationUrl
                    if (!url.isNullOrBlank()) {
                        onPaystackUrl(url)
                    } else {
                        _uiState.value = _uiState.value.copy(error = "URL de paiement invalide")
                    }
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun loadCheckout(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(checkoutLoading = true, error = null)
            if (_uiState.value.relayPoints.isEmpty()) {
                when (val relays = shipmentRepo.getRelayPoints()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(relayPoints = relays.data)
                    is ApiResult.Error -> Unit
                }
            }
            when (val result = shipmentRepo.loadShipmentByTracking(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        checkoutLoading = false,
                        checkoutShipment = result.data,
                    )
                    if (result.data.pickupMethod == "home_pickup") {
                        refreshDispatchStatus(trackingNumber)
                        startDispatchPolling(trackingNumber)
                    }
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    checkoutLoading = false,
                    error = result.message,
                )
            }
        }
    }

    /** Vérifie Paystack puis rafraîchit colis + liste (après « J'ai terminé le paiement »). */
    fun confirmPaymentAfterCheckout(trackingNumber: String) {
        val tracking = trackingNumber.trim()
        if (tracking.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(checkoutLoading = true, error = null)
            val reference = resolvePaystackReference(tracking)
            if (!reference.isNullOrBlank()) {
                when (val result = shipmentRepo.verifyPaystack(reference, tracking)) {
                    is ApiResult.Success -> {
                        _uiState.value = _uiState.value.copy(paymentVerified = result.data.paid)
                        if (result.data.paid) {
                            paystackSession.clearReference(tracking)
                        }
                    }
                    is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = result.message)
                }
            }
            refreshShipmentDataAfterPayment(tracking)
            _uiState.value = _uiState.value.copy(checkoutLoading = false)
        }
    }

    private suspend fun resolvePaystackReference(trackingNumber: String): String? {
        _uiState.value.lastPaystackReference?.takeIf { it.isNotBlank() }?.let { return it }
        paystackSession.getReference(trackingNumber)?.takeIf { it.isNotBlank() }?.let { return it }
        when (val automated = shipmentRepo.getAutomatedPaymentStatus(trackingNumber)) {
            is ApiResult.Success -> {
                val ref = automated.data?.transactionId?.trim().orEmpty()
                if (ref.isNotEmpty()) {
                    paystackSession.saveReference(trackingNumber, ref)
                    return ref
                }
            }
            is ApiResult.Error -> Unit
        }
        return null
    }

    private suspend fun refreshShipmentDataAfterPayment(trackingNumber: String) {
        when (val listResult = shipmentRepo.getShipments()) {
            is ApiResult.Success -> {
                _uiState.value = _uiState.value.copy(shipments = listResult.data)
                val updated = listResult.data.find {
                    it.trackingNumber.equals(trackingNumber, ignoreCase = true)
                }
                if (updated != null) {
                    _uiState.value = _uiState.value.copy(
                        selectedShipment = updated,
                        checkoutShipment = updated,
                    )
                }
            }
            is ApiResult.Error -> Unit
        }
        when (val detail = shipmentRepo.loadShipmentByTracking(trackingNumber)) {
            is ApiResult.Success -> {
                _uiState.value = _uiState.value.copy(checkoutShipment = detail.data)
                val selected = _uiState.value.selectedShipment
                if (selected?.trackingNumber.equals(trackingNumber, ignoreCase = true)) {
                    _uiState.value = _uiState.value.copy(selectedShipment = detail.data)
                }
                if (detail.data.pickupMethod == "home_pickup") {
                    refreshDispatchStatus(trackingNumber)
                    startDispatchPolling(trackingNumber)
                }
            }
            is ApiResult.Error -> Unit
        }
    }

    fun refreshDispatchStatus(trackingNumber: String) {
        viewModelScope.launch {
            when (val result = shipmentRepo.getDispatchStatus(trackingNumber)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(dispatchStatus = result.data)
                is ApiResult.Error -> Unit
            }
        }
    }

    fun startDispatchPolling(trackingNumber: String) {
        dispatchPollJob?.cancel()
        dispatchPollJob = viewModelScope.launch {
            while (isActive) {
                refreshDispatchStatus(trackingNumber)
                val state = _uiState.value.dispatchStatus?.state
                if (state == "assigned" || state == "no_driver" || state == "not_applicable") break
                delay(5_000)
            }
        }
    }

    fun stopDispatchPolling() {
        dispatchPollJob?.cancel()
        dispatchPollJob = null
    }

    override fun onCleared() {
        stopDispatchPolling()
        super.onCleared()
    }

    fun cancelShipment(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.cancelShipment(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Colis annulé avec succès"
                    )
                    loadShipments()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun switchToRelayPayment(trackingNumber: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = shipmentRepo.switchToRelayPayment(trackingNumber)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        successMessage = "Mode de paiement mis à jour. Vous réglerez lors de la prise en charge."
                    )
                    loadShipments()
                }
                is ApiResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}

