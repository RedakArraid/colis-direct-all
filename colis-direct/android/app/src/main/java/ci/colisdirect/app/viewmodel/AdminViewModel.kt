package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.*
import ci.colisdirect.app.data.repository.AdminRepository
import ci.colisdirect.app.data.repository.ApiResult
import ci.colisdirect.app.data.repository.ShipmentRepository
import ci.colisdirect.app.domain.RelayShipmentBuckets
import ci.colisdirect.app.domain.ProfileVisibility
import ci.colisdirect.app.domain.UserRoles
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminUiState(
    val isLoading: Boolean = false,
    val isAdmin: Boolean = true,
    val adminStats: AdminDashboardStatsDto? = null,
    val supportDashboard: SupportDashboardDto? = null,
    val shipments: List<ShipmentDto> = emptyList(),
    val users: List<UserDto> = emptyList(),
    val relayPoints: List<RelayPointDto> = emptyList(),
    val relayApplications: List<RelayApplicationDto> = emptyList(),
    val transporterApplications: List<TransporterApplicationDto> = emptyList(),
    val supportTickets: List<SupportTicketDto> = emptyList(),
    val ticketDetail: SupportTicketDetailDto? = null,
    val relayCashDashboard: RelayCashDashboardDto? = null,
    val relayCashLoading: Boolean = false,
    val detailShipment: ShipmentDto? = null,
    val detailLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val adminRepo: AdminRepository,
    private val shipmentRepo: ShipmentRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUiState())
    val uiState: StateFlow<AdminUiState> = _uiState.asStateFlow()

    fun setRole(role: String?) {
        _uiState.value = _uiState.value.copy(isAdmin = UserRoles.isAdmin(role))
    }

    fun loadRelayCashDashboard() {
        if (_uiState.value.isAdmin) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(relayCashLoading = true)
            when (val r = adminRepo.getRelayCashDashboard()) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    relayCashLoading = false,
                    relayCashDashboard = r.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    relayCashLoading = false,
                    error = r.message,
                )
            }
        }
    }

    fun loadDashboard() {
        val isAdmin = _uiState.value.isAdmin
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            if (isAdmin) {
                val stats = async { adminRepo.getAdminStats() }
                val shipments = async { shipmentRepo.getShipments() }
                val users = async { adminRepo.getUsers() }
                val relays = async { adminRepo.getRelayPoints() }
                val relayApps = async { adminRepo.getRelayApplications("pending") }
                val transApps = async { adminRepo.getTransporterApplications("pending") }
                val tickets = async { adminRepo.getSupportTickets(status = "escalated") }

                var error: String? = null
                when (val r = stats.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(adminStats = r.data)
                    is ApiResult.Error -> error = r.message
                }
                when (val r = shipments.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(shipments = r.data)
                    is ApiResult.Error -> if (error == null) error = r.message
                }
                when (val r = users.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(users = r.data)
                    is ApiResult.Error -> { /* non-bloquant */ }
                }
                when (val r = relays.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(relayPoints = r.data)
                    is ApiResult.Error -> { /* non-bloquant */ }
                }
                when (val r = relayApps.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(relayApplications = r.data)
                    is ApiResult.Error -> { /* non-bloquant */ }
                }
                when (val r = transApps.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(transporterApplications = r.data)
                    is ApiResult.Error -> { /* non-bloquant */ }
                }
                when (val r = tickets.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(supportTickets = r.data)
                    is ApiResult.Error -> { /* non-bloquant */ }
                }
                _uiState.value = _uiState.value.copy(isLoading = false, error = error)
            } else {
                val dash = async { adminRepo.getSupportDashboard() }
                val tickets = async { adminRepo.getSupportTickets() }
                var error: String? = null
                when (val r = dash.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(supportDashboard = r.data)
                    is ApiResult.Error -> error = r.message
                }
                when (val r = tickets.await()) {
                    is ApiResult.Success -> _uiState.value = _uiState.value.copy(supportTickets = r.data)
                    is ApiResult.Error -> if (error == null) error = r.message
                }
                _uiState.value = _uiState.value.copy(isLoading = false, error = error)
            }
        }
    }

    fun loadSupportTickets(status: String? = null) {
        viewModelScope.launch {
            when (val r = adminRepo.getSupportTickets(status)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(supportTickets = r.data)
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = r.message)
            }
        }
    }

    fun loadTicketDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            when (val r = adminRepo.getSupportTicket(id)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    ticketDetail = r.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(isLoading = false, error = r.message)
            }
        }
    }

    fun clearTicketDetail() {
        _uiState.value = _uiState.value.copy(ticketDetail = null)
    }

    fun replyTicket(id: String, body: String) {
        viewModelScope.launch {
            when (val r = adminRepo.replySupportTicket(id, body)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(successMessage = "Réponse envoyée")
                    loadTicketDetail(id)
                    loadSupportTickets(if (_uiState.value.isAdmin) "escalated" else null)
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = r.message)
            }
        }
    }

    fun updateTicketStatus(id: String, status: String) {
        viewModelScope.launch {
            when (val r = adminRepo.updateSupportTicketStatus(id, status)) {
                is ApiResult.Success -> {
                    _uiState.value = _uiState.value.copy(successMessage = "Statut mis à jour")
                    loadTicketDetail(id)
                    loadDashboard()
                }
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(error = r.message)
            }
        }
    }

    fun loadShipmentDetail(id: String, fallback: ShipmentDto? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(detailLoading = true, detailShipment = fallback)
            when (val r = shipmentRepo.getShipmentById(id)) {
                is ApiResult.Success -> _uiState.value = _uiState.value.copy(
                    detailLoading = false,
                    detailShipment = r.data,
                )
                is ApiResult.Error -> _uiState.value = _uiState.value.copy(
                    detailLoading = false,
                    detailShipment = fallback,
                    error = r.message,
                )
            }
        }
    }

    fun clearDetailShipment() {
        _uiState.value = _uiState.value.copy(detailShipment = null, detailLoading = false)
    }

    fun searchShipments(query: String): List<ShipmentDto> =
        RelayShipmentBuckets.filterSearch(_uiState.value.shipments, query)

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null)
    }
}
