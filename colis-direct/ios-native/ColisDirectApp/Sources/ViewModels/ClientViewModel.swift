import Foundation

// MARK: - Client ViewModel
@MainActor
final class ClientViewModel: ObservableObject {
    @Published var shipments: [ShipmentDto] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var selectedShipment: ShipmentDto? = nil
    @Published var trackingResult: TrackingResponse? = nil
    @Published var paymentVerified: Bool? = nil
    @Published var lastPaystackReference: String? = nil

    private let api = APIService.shared

    func loadShipments(status: String? = nil) async {
        isLoading = true
        error = nil
        do {
            shipments = try await api.getShipments(status: status)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadShipmentDetail(_ id: String) async {
        isLoading = true
        do {
            selectedShipment = try await api.getShipmentById(id)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func createShipment(_ req: CreateShipmentRequest) async throws -> ShipmentDto {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let shipment = try await api.createShipment(req)
            await loadShipments()
            return shipment
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }

    func cancelShipment(trackingNumber: String) async {
        do {
            _ = try await api.cancelShipment(trackingNumber: trackingNumber)
            await loadShipments()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func switchToRelayPayment(trackingNumber: String) async {
        do {
            _ = try await api.switchToRelayPayment(trackingNumber: trackingNumber)
            await loadShipments()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func initiatePaystackPayment(shipment: ShipmentDto, user: UserDto?) async -> (String, String)? {
        isLoading = true
        error = nil
        do {
            let amount = shipment.price ?? 0.0
            let name = shipment.senderName ?? user?.fullName ?? "Client ColisDirect"
            let email = user?.email ?? "paiement@colisdirect.com"
            let phone = shipment.senderPhone ?? user?.phone ?? ""

            let response = try await api.initPaystack(
                trackingNumber: shipment.trackingNumber,
                amountFcfa: amount,
                customerName: name,
                customerEmail: email,
                customerPhone: phone
            )
            if let url = response.url, let ref = response.transactionId {
                self.lastPaystackReference = ref
                isLoading = false
                return (url, ref)
            } else {
                self.error = "URL de paiement non disponible."
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
        return nil
    }

    func verifyPayment(reference: String, trackingNumber: String) async {
        isLoading = true
        error = nil
        do {
            let response = try await api.verifyPaystack(reference: reference, trackingNumber: trackingNumber)
            self.paymentVerified = response.paid
            await loadShipments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func clearError() { error = nil }
}

// MARK: - Tracking ViewModel
@MainActor
final class TrackingViewModel: ObservableObject {
    @Published var trackingNumber = ""
    @Published var result: TrackingResponse? = nil
    @Published var isLoading = false
    @Published var error: String? = nil

    private let api = APIService.shared

    func search() async {
        guard !trackingNumber.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isLoading = true
        error = nil
        result = nil
        do {
            result = try await api.getPublicTracking(trackingNumber: trackingNumber.trimmingCharacters(in: .whitespaces))
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func reset() {
        trackingNumber = ""
        result = nil
        error = nil
    }
}

// MARK: - Relay Points ViewModel
@MainActor
final class RelayPointsViewModel: ObservableObject {
    @Published var relayPoints: [RelayPointDto] = []
    @Published var isLoading = false
    @Published var error: String? = nil

    private let api = APIService.shared

    func load() async {
        isLoading = true
        do {
            relayPoints = try await api.getRelayPoints()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Pricing ViewModel
@MainActor
final class PricingViewModel: ObservableObject {
    @Published var senderCommune = ""
    @Published var recipientCommune = ""
    @Published var packageSize = "medium"
    @Published var weight = 1.0
    @Published var result: PricingCalculateResponse? = nil
    @Published var isLoading = false
    @Published var error: String? = nil

    private let api = APIService.shared

    func calculate() async {
        guard !senderCommune.isEmpty, !recipientCommune.isEmpty else { return }
        isLoading = true
        error = nil
        do {
            result = try await api.calculatePricing(
                senderCommune: senderCommune,
                recipientCommune: recipientCommune,
                packageSize: packageSize,
                weight: weight
            )
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
