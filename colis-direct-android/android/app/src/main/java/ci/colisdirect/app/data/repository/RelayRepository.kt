package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.data.api.model.RelayStatsDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RelayRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getMyRelayPoint(): ApiResult<RelayPointDto> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getMyRelayPoint()
            if (response.isSuccessful && response.body() != null) {
                ApiResult.Success(response.body()!!)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun getRelayPoint(id: String): ApiResult<RelayPointDto> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getRelayPoint(id)
            if (response.isSuccessful && response.body() != null) {
                ApiResult.Success(response.body()!!)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun getRelayPointStats(relayId: String): ApiResult<RelayStatsDto> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getRelayPointStats(relayId)
            if (response.isSuccessful && response.body() != null) {
                ApiResult.Success(response.body()!!)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun getRelayActiveShipments(relayId: String): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getRelayActiveShipments(relayId)
                if (response.isSuccessful) {
                    val list: List<ShipmentDto> = response.body() ?: emptyList()
                    ApiResult.Success(list)
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
