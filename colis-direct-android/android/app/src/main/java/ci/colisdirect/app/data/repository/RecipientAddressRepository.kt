package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.CreateRecipientAddressRequest
import ci.colisdirect.app.data.api.model.RecipientAddressDto
import ci.colisdirect.app.data.api.model.SuccessResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RecipientAddressRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getAddresses(): ApiResult<List<RecipientAddressDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getRecipientAddresses()
                if (response.isSuccessful) {
                    ApiResult.Success(response.body() ?: emptyList<RecipientAddressDto>())
                }
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun createAddress(request: CreateRecipientAddressRequest): ApiResult<RecipientAddressDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.createRecipientAddress(request)
                if (response.isSuccessful && response.body() != null) {
                    ApiResult.Success(response.body()!!)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun deleteAddress(id: String): ApiResult<SuccessResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.deleteRecipientAddress(id)
                if (response.isSuccessful) ApiResult.Success(response.body() ?: SuccessResponse(true, null))
                else ApiResult.Error(response.parseError())
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
