package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.RelayApplicationRequest
import ci.colisdirect.app.data.api.model.TransporterApplicationRequest
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.repository.PartnerRepository
import ci.colisdirect.app.domain.NameUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PartnerUiState(
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class PartnerViewModel @Inject constructor(
    private val partnerRepository: PartnerRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PartnerUiState())
    val uiState: StateFlow<PartnerUiState> = _uiState.asStateFlow()

    fun submitTransporter(
        fullName: String,
        phone: String,
        email: String,
        commune: String,
        vehicleLabel: String,
    ) {
        val (first, last) = NameUtils.splitFullName(fullName)
        if (first.isBlank() || phone.isBlank() || email.isBlank() || commune.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Remplissez les champs obligatoires")
            return
        }
        if (!email.contains("@")) {
            _uiState.value = _uiState.value.copy(error = "Email invalide")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, error = null)
            val request = TransporterApplicationRequest(
                firstName = first,
                lastName = last,
                phone = phone.trim(),
                email = email.trim().lowercase(),
                vehicleType = NameUtils.mapVehicleType(vehicleLabel),
                commune = commune.trim(),
            )
            when (val result = partnerRepository.submitTransporter(request)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    successMessage = result.data.message
                        ?: "Candidature envoyée ! Nous vous contactons sous 48h.",
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    error = result.message,
                )
            }
        }
    }

    fun submitRelay(
        fullName: String,
        phone: String,
        email: String,
        commune: String,
        quartier: String,
        address: String,
        businessName: String,
        businessType: String,
    ) {
        val (first, last) = NameUtils.splitFullName(fullName)
        if (first.isBlank() || phone.isBlank() || email.isBlank() || commune.isBlank()
            || quartier.isBlank() || address.isBlank() || businessName.isBlank()
        ) {
            _uiState.value = _uiState.value.copy(error = "Remplissez les champs obligatoires")
            return
        }
        if (!email.contains("@")) {
            _uiState.value = _uiState.value.copy(error = "Email invalide")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, error = null)
            val request = RelayApplicationRequest(
                applicantFirstName = first,
                applicantLastName = last,
                businessName = businessName.trim(),
                businessType = businessType.ifBlank { "boutique" },
                phone = phone.trim(),
                email = email.trim().lowercase(),
                commune = commune.trim(),
                quartier = quartier.trim(),
                address = address.trim(),
            )
            when (val result = partnerRepository.submitRelay(request)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    successMessage = result.data.message
                        ?: "Candidature envoyée ! Nous vous contactons sous 48h.",
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    error = result.message,
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}
