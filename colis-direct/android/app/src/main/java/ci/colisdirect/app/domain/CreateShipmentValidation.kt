package ci.colisdirect.app.domain

object CreateShipmentValidation {

    fun validateStepInformations(
        isLoggedIn: Boolean,
        senderFirstName: String,
        senderLastName: String,
        senderPhone: String,
        senderCommune: String,
        senderQuartier: String,
        senderAddress: String,
        recipientFirstName: String,
        recipientLastName: String,
        recipientPhone: String,
        recipientCommune: String,
        recipientQuartier: String,
        recipientAddress: String,
        weight: String,
    ): String? {
        if (!isLoggedIn) {
            if (senderFirstName.isBlank() || senderLastName.isBlank()) return "Nom et prénom expéditeur requis"
            if (senderPhone.isBlank()) return "Téléphone expéditeur requis"
            if (senderCommune.isBlank()) return "Commune expéditeur requise"
            if (senderQuartier.isBlank()) return "Quartier expéditeur requis"
            if (senderAddress.isBlank()) return "Adresse expéditeur requise"
        } else {
            if (senderPhone.isBlank()) return "Téléphone expéditeur requis"
            if (senderCommune.isBlank()) return "Commune expéditeur requise"
        }
        if (recipientFirstName.isBlank() || recipientLastName.isBlank()) return "Nom et prénom destinataire requis"
        if (recipientPhone.isBlank()) return "Téléphone destinataire requis"
        if (recipientCommune.isBlank()) return "Commune destinataire requise"
        if (recipientQuartier.isBlank()) return "Quartier destinataire requis"
        if (recipientAddress.isBlank()) return "Adresse destinataire requise"
        val w = weight.toDoubleOrNull()
        if (w == null || w <= 0) return "Poids invalide"
        return null
    }

    fun validateStepRelays(
        pickupMethod: String,
        homeDelivery: Boolean,
        originRelayId: String?,
        destinationRelayId: String?,
    ): String? {
        if (pickupMethod == "relay_deposit" && originRelayId.isNullOrBlank()) {
            return "Sélectionnez un relais de dépôt"
        }
        if (!homeDelivery && destinationRelayId.isNullOrBlank()) {
            return "Sélectionnez un relais de livraison"
        }
        return null
    }
}
