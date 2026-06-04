package ci.colisdirect.app.data.local

import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/** Conserve la référence Paystack par colis entre les écrans de navigation. */
@Singleton
class PaystackSessionStore @Inject constructor() {

    private val references = ConcurrentHashMap<String, String>()

    fun saveReference(trackingNumber: String, reference: String) {
        val key = trackingNumber.trim().uppercase()
        if (key.isNotEmpty() && reference.isNotBlank()) {
            references[key] = reference.trim()
        }
    }

    fun getReference(trackingNumber: String): String? =
        references[trackingNumber.trim().uppercase()]

    fun clearReference(trackingNumber: String) {
        references.remove(trackingNumber.trim().uppercase())
    }
}
