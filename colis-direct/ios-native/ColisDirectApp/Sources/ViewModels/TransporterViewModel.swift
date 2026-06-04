import Foundation

// MARK: - Transporter ViewModel
@MainActor
final class TransporterViewModel: ObservableObject {
    @Published var assignments: [ShipmentDto] = []
    @Published var deliveredShipments: [ShipmentDto] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var scanResult: ScanResponse? = nil
    @Published var lastScannedShipment: ShipmentDto? = nil

    private let api = APIService.shared

    func loadAssignments() async {
        isLoading = true
        error = nil
        do {
            assignments = try await api.getTransporterAssignments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadDelivered() async {
        isLoading = true
        do {
            deliveredShipments = try await api.getDeliveredShipments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func pickupScan(trackingNumber: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await api.carrierPickup(trackingNumber: trackingNumber)
            scanResult = resp
            lastScannedShipment = resp.shipment
            await loadAssignments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func confirmHomePickup(trackingNumber: String, senderPhone: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await api.confirmHomePickup(trackingNumber: trackingNumber, senderPhone: senderPhone)
            scanResult = resp
            lastScannedShipment = resp.shipment
            await loadAssignments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func clearError() { error = nil }
    func clearScanResult() { scanResult = nil; lastScannedShipment = nil }
}

// MARK: - Relay ViewModel
@MainActor
final class RelayViewModel: ObservableObject {
    @Published var pendingShipments: [ShipmentDto] = []
    @Published var isLoading = false
    @Published var error: String? = nil
    @Published var scanResult: ScanResponse? = nil
    @Published var lastScannedShipment: ShipmentDto? = nil

    private let api = APIService.shared

    func loadPendingShipments() async {
        isLoading = true
        error = nil
        do {
            pendingShipments = try await api.getShipments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func relayIntake(trackingNumber: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await api.relayIntake(trackingNumber: trackingNumber)
            scanResult = resp
            lastScannedShipment = resp.shipment
            await loadPendingShipments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func completeDelivery(trackingNumber: String, recipientPhone: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await api.completeDelivery(trackingNumber: trackingNumber, recipientPhone: recipientPhone)
            scanResult = resp
            lastScannedShipment = resp.shipment
            await loadPendingShipments()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func makeAvailable(trackingNumber: String) async {
        do {
            _ = try await api.makeAvailable(trackingNumber: trackingNumber)
            await loadPendingShipments()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func clearError() { error = nil }
    func clearScanResult() { scanResult = nil; lastScannedShipment = nil }
}
