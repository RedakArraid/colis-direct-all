package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getAdminStats(): ApiResult<AdminDashboardStatsDto> = get { api.getAdminStats() }

    suspend fun getSupportDashboard(): ApiResult<SupportDashboardDto> = get { api.getSupportDashboard() }

    suspend fun getRelayCashDashboard(): ApiResult<RelayCashDashboardDto> = get { api.getRelayCashDashboard() }

    suspend fun getUsers(role: String? = null, search: String? = null): ApiResult<List<UserDto>> =
        getList { api.getUsers(role, search) }

    suspend fun getRelayApplications(status: String? = null): ApiResult<List<RelayApplicationDto>> =
        getList { api.getRelayApplications(status) }

    suspend fun getTransporterApplications(status: String? = null): ApiResult<List<TransporterApplicationDto>> =
        getList { api.getTransporterApplications(status) }

    suspend fun getRelayPoints(): ApiResult<List<RelayPointDto>> = getList { api.getRelayPoints() }

    suspend fun getSupportTickets(status: String? = null, search: String? = null): ApiResult<List<SupportTicketDto>> =
        getList { api.getSupportTickets(status, search, 50) }

    suspend fun getSupportTicket(id: String): ApiResult<SupportTicketDetailDto> = get { api.getSupportTicket(id) }

    suspend fun replySupportTicket(id: String, body: String): ApiResult<SuccessResponse> =
        post { api.replySupportTicket(id, SupportReplyRequest(body)) }

    suspend fun updateSupportTicketStatus(id: String, status: String): ApiResult<SuccessResponse> =
        post { api.updateSupportTicketStatus(id, SupportStatusRequest(status)) }

    private suspend fun <T> get(call: suspend () -> retrofit2.Response<T>): ApiResult<T> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = call()
                if (response.isSuccessful && response.body() != null) {
                    ApiResult.Success(response.body()!!)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    private suspend fun <T> getList(call: suspend () -> retrofit2.Response<List<T>>): ApiResult<List<T>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = call()
                if (response.isSuccessful) {
                    val list: List<T> = response.body() ?: emptyList()
                    ApiResult.Success(list)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    private suspend fun post(call: suspend () -> retrofit2.Response<SuccessResponse>): ApiResult<SuccessResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = call()
                if (response.isSuccessful) {
                    ApiResult.Success(response.body() ?: SuccessResponse(success = true, message = null))
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }
}

private fun <T> retrofit2.Response<T>.parseError(): String {
    return try {
        val body = errorBody()?.string() ?: return "Erreur inconnue"
        val json = org.json.JSONObject(body)
        json.optString("error", body)
    } catch (e: Exception) {
        "Erreur serveur (${code()})"
    }
}
