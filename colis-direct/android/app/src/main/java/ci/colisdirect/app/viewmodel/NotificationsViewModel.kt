package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.data.local.NotificationsRepository
import ci.colisdirect.app.data.model.AppNotification
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repository: NotificationsRepository,
) : ViewModel() {

    val notifications: StateFlow<List<AppNotification>> = repository.notifications

    val unreadCount: Int get() = repository.unreadCount

    fun markRead(id: Long) = repository.markRead(id)

    fun markAllRead() = repository.markAllRead()

    fun syncFromShipments(shipments: List<ShipmentDto>) = repository.syncFromShipments(shipments)

    fun onLogout() = repository.clearForLogout()
}
