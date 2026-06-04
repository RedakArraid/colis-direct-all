package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.PartnerApplicationResponse
import ci.colisdirect.app.data.api.model.RelayApplicationRequest
import ci.colisdirect.app.data.api.model.TransporterApplicationRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PartnerRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun submitTransporter(request: TransporterApplicationRequest): ApiResult<PartnerApplicationResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.submitTransporterApplication(request)
                if (response.isSuccessful && response.body() != null) {
                    ApiResult.Success(response.body()!!)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun submitRelay(request: RelayApplicationRequest): ApiResult<PartnerApplicationResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.submitRelayApplication(request)
                if (response.isSuccessful && response.body() != null) {
                    ApiResult.Success(response.body()!!)
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
