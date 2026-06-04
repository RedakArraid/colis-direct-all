package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TransporterRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getProfile(): ApiResult<TransporterProfileDto> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getTransporterProfile()
            if (response.isSuccessful && response.body() != null) {
                ApiResult.Success(response.body()!!)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun getWallet(): ApiResult<TransporterWalletResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getTransporterWallet()
            if (response.isSuccessful && response.body() != null) {
                ApiResult.Success(response.body()!!)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun getMyOffers(): ApiResult<List<DeliveryOfferDto>> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.getMyDeliveryOffers()
            if (response.isSuccessful) {
                val list: List<DeliveryOfferDto> = response.body() ?: emptyList()
                ApiResult.Success(list)
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun acceptOffer(offerId: String): ApiResult<SimpleSuccessResponse> =
        postSimple { api.acceptDeliveryOffer(offerId) }

    suspend fun declineOffer(offerId: String): ApiResult<SimpleSuccessResponse> =
        postSimple { api.declineDeliveryOffer(offerId) }

    suspend fun getWalletTransactions(limit: Int = 20, offset: Int = 0): ApiResult<WalletTransactionsResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getWalletTransactions(limit, offset)
                if (response.isSuccessful && response.body() != null) {
                    ApiResult.Success(response.body()!!)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun requestWithdrawal(request: WithdrawalRequest): ApiResult<SimpleSuccessResponse> =
        postSimple { api.requestWithdrawal(request) }

    private suspend fun postSimple(
        call: suspend () -> retrofit2.Response<SimpleSuccessResponse>,
    ): ApiResult<SimpleSuccessResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = call()
            if (response.isSuccessful) {
                ApiResult.Success(response.body() ?: SimpleSuccessResponse(success = true))
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }
}

private fun <T> retrofit2.Response<T>.parseError(): String {
    val body = errorBody()?.string()
    if (!body.isNullOrBlank()) {
        return try {
            val json = org.json.JSONObject(body)
            json.optString("error").ifBlank { json.optString("message") }.ifBlank { body }
        } catch (_: Exception) {
            body
        }
    }
    return message().ifBlank { "Erreur serveur (${code()})" }
}
