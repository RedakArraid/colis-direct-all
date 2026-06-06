package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.*
import ci.colisdirect.app.domain.PromoDiscount
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String) : ApiResult<Nothing>()
}

@Singleton
class ShipmentRepository @Inject constructor(
    private val api: ApiService,
) {
    suspend fun getShipments(
        currentStatus: String? = null,
        relayId: String? = null,
    ): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getShipments(currentStatus = currentStatus, relayId = relayId)
                if (response.isSuccessful) {
                    val list: List<ShipmentDto> = response.body() ?: emptyList()
                    ApiResult.Success(list)
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getShipmentById(id: String): ApiResult<ShipmentDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getShipmentById(id)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun createShipment(request: CreateShipmentRequest): ApiResult<ShipmentDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.createShipment(request)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun validatePromoCode(code: String): ApiResult<PromoDiscount.Validated> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.validatePromoCode(PromoValidateRequest(code.trim()))
                if (response.isSuccessful) {
                    val body = response.body()?.data
                        ?: return@runCatching ApiResult.Error("Réponse promo invalide")
                    ApiResult.Success(
                        PromoDiscount.Validated(
                            code = body.code,
                            discountType = body.discountType,
                            discountValue = body.discountValue,
                        ),
                    )
                } else {
                    ApiResult.Error(response.parseError())
                }
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun searchByPhone(phone: String): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.searchByPhone(phone)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getShipmentForPickup(trackingNumber: String): ApiResult<ShipmentDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getShipmentForPickup(trackingNumber)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getShipmentsForHomePickup(phone: String): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getShipmentsForHomePickup(phone)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getTransporterAssignments(): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getTransporterAssignments()
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getDeliveredShipments(): ApiResult<List<ShipmentDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getDeliveredShipments()
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getPublicTracking(trackingNumber: String): ApiResult<TrackingResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getPublicTracking(trackingNumber)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getRelayPoints(): ApiResult<List<RelayPointDto>> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getRelayPoints()
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun calculatePricing(
        senderCommune: String,
        recipientCommune: String,
        packageSize: String,
        gridType: String,
        weight: Double,
    ): ApiResult<PricingCalculateResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.calculatePricing(
                    senderCommune = senderCommune,
                    recipientCommune = recipientCommune,
                    packageSize = packageSize,
                    gridType = gridType,
                    weight = weight,
                )
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    // ======= SCAN OPERATIONS =======

    suspend fun relayIntake(trackingNumber: String): ApiResult<ScanResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.relayIntake(RelayIntakeRequest(trackingNumber))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun carrierPickup(trackingNumber: String, relayId: String?): ApiResult<ScanResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.carrierPickup(CarrierPickupRequest(trackingNumber, relayId))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun confirmHomePickup(trackingNumber: String): ApiResult<ScanResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.confirmHomePickup(HomePickupConfirmRequest(trackingNumber))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun relayFinalIntake(trackingNumber: String): ApiResult<ScanResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.relayFinalIntake(RelayIntakeRequest(trackingNumber))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun makeAvailable(trackingNumber: String): ApiResult<ScanResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.makeAvailable(RelayIntakeRequest(trackingNumber))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun completeDelivery(
        trackingNumber: String,
        pickupCode: String,
        recipientIdentifier: String? = null,
    ): ApiResult<ScanResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.completeDelivery(
                CompleteDeliveryRequest(trackingNumber, pickupCode, recipientIdentifier)
            )
            if (response.isSuccessful) ApiResult.Success(response.body()!!)
            else ApiResult.Error(response.parseError())
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    suspend fun deliverShipment(
        trackingNumber: String,
        pickupCode: String,
        recipientIdentifier: String? = null,
    ): ApiResult<DeliverShipmentResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.deliverShipment(
                trackingNumber,
                DeliverShipmentRequest(pickupCode, recipientIdentifier),
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true) ApiResult.Success(body)
                else ApiResult.Error(body?.message ?: response.parseError())
            } else {
                ApiResult.Error(response.parseError())
            }
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }

    // ======= PAYMENT =======

    suspend fun initPaystack(trackingNumber: String): ApiResult<PaystackInitResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.initPaystack(PaystackInitRequest(trackingNumber))
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun verifyPaystack(reference: String, trackingNumber: String): ApiResult<PaystackVerifyResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.verifyPaystack(
                    PaystackVerifyRequest(reference = reference, trackingNumber = trackingNumber),
                )
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getAutomatedPaymentStatus(trackingNumber: String): ApiResult<AutomatedPaymentDto?> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getAutomatedPayment(trackingNumber.trim())
                if (response.isSuccessful) ApiResult.Success(response.body())
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun getDispatchStatus(trackingNumber: String): ApiResult<DispatchStatusDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.getDispatchStatus(trackingNumber.trim())
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun loadShipmentByTracking(trackingNumber: String): ApiResult<ShipmentDto> =
        withContext(Dispatchers.IO) {
            runCatching {
                val tracking = api.getPublicTracking(trackingNumber.trim())
                if (tracking.isSuccessful) {
                    val shipment = tracking.body()?.shipment
                    if (shipment != null) return@runCatching ApiResult.Success(shipment)
                }
                val list = api.getShipments()
                if (list.isSuccessful) {
                    val found = list.body()?.find {
                        it.trackingNumber.equals(trackingNumber.trim(), ignoreCase = true)
                    }
                    if (found != null) return@runCatching ApiResult.Success(found)
                }
                ApiResult.Error("Colis introuvable")
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun cancelShipment(trackingNumber: String): ApiResult<SuccessResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.cancelShipment(trackingNumber)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun switchToRelayPayment(trackingNumber: String): ApiResult<SuccessResponse> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = api.switchToRelayPayment(trackingNumber)
                if (response.isSuccessful) ApiResult.Success(response.body()!!)
                else ApiResult.Error(response.parseError())
            }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
        }

    suspend fun confirmRelayCash(
        trackingNumber: String,
        amount: Double? = null,
        notes: String? = null,
    ): ApiResult<SuccessResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = api.confirmRelayCash(
                RelayCashConfirmRequest(trackingNumber, amount, notes),
            )
            if (response.isSuccessful) {
                ApiResult.Success(response.body() ?: SuccessResponse(success = true, message = null))
            }
            else ApiResult.Error(response.parseError())
        }.getOrElse { ApiResult.Error(it.localizedMessage ?: "Erreur réseau") }
    }
}

// Extension to parse error body
private fun <T> retrofit2.Response<T>.parseError(): String {
    return try {
        val body = errorBody()?.string() ?: return "Erreur inconnue"
        val json = org.json.JSONObject(body)
        json.optString("error", body)
    } catch (e: Exception) {
        "Erreur serveur (${code()})"
    }
}
