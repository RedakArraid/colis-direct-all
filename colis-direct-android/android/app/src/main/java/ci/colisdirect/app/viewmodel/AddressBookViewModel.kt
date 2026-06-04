package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.RecipientAddressDto
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.repository.RecipientAddressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AddressBookUiState(
    val isLoading: Boolean = false,
    val addresses: List<RecipientAddressDto> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class AddressBookViewModel @Inject constructor(
    private val repository: RecipientAddressRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddressBookUiState())
    val uiState: StateFlow<AddressBookUiState> = _uiState.asStateFlow()

    fun loadAddresses() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = repository.getAddresses()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    addresses = result.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = result.message,
                )
            }
        }
    }

    fun deleteAddress(id: String) {
        viewModelScope.launch {
            when (val result = repository.deleteAddress(id)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        addresses = _uiState.value.addresses.filter { it.id != id },
                        successMessage = "Adresse supprimée",
                    )
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = result.message)
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}
