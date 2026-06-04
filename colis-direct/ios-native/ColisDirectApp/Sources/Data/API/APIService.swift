import Foundation

// MARK: - API Error
enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case serverError(Int, String?)
    case decodingError(Error)
    case unauthorized
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "URL invalide"
        case .networkError(let e): return "Erreur réseau: \(e.localizedDescription)"
        case .serverError(_, let msg): return msg ?? "Erreur serveur"
        case .decodingError: return "Erreur de décodage"
        case .unauthorized: return "Session expirée. Veuillez vous reconnecter."
        case .unknown: return "Erreur inconnue"
        }
    }
}

// MARK: - API Service
final class APIService: @unchecked Sendable {
    nonisolated(unsafe) static let shared = APIService()
    private init() {}

    private let tokenManager = TokenManager.shared
    private let baseURL = AppConfig.baseURL

    private var session: URLSession {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config)
    }

    // MARK: - Generic Request
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authenticated, let token = tokenManager.getToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            req.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        if http.statusCode == 401 {
            if req.url?.path.contains("auth/signin") == true {
                let msg = try? JSONDecoder().decode(ErrorResponse.self, from: data)
                let errorText = msg?.error ?? msg?.message ?? "Identifiants incorrects"
                throw APIError.serverError(http.statusCode, errorText)
            }
            tokenManager.clearAll()
            throw APIError.unauthorized
        }

        if !(200..<300).contains(http.statusCode) {
            let msg = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            let errorText = msg?.error ?? msg?.message
            throw APIError.serverError(http.statusCode, errorText)
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Auth
    func signIn(email: String? = nil, phone: String? = nil, password: String) async throws -> AuthResponse {
        let body = SignInRequest(email: email, phone: phone, password: password)
        let response: AuthResponse = try await request(endpoint: "auth/signin", method: "POST", body: body, authenticated: false)
        tokenManager.saveToken(response.accessToken)
        tokenManager.saveRole(response.user.role)
        return response
    }

    func signUp(email: String, password: String, firstName: String, lastName: String, phone: String) async throws -> AuthResponse {
        let body = SignUpRequest(email: email, password: password, firstName: firstName, lastName: lastName, phone: phone)
        let response: AuthResponse = try await request(endpoint: "auth/signup", method: "POST", body: body, authenticated: false)
        tokenManager.saveToken(response.accessToken)
        tokenManager.saveRole(response.user.role)
        return response
    }

    func getMe() async throws -> UserDto {
        try await request(endpoint: "auth/me")
    }

    func signOut() async throws {
        let _: SuccessResponse = try await request(endpoint: "auth/signout", method: "POST")
        tokenManager.clearAll()
    }

    // MARK: - Shipments
    func getShipments(status: String? = nil, paymentStatus: String? = nil) async throws -> [ShipmentDto] {
        var endpoint = "shipments"
        var params: [String] = []
        if let s = status { params.append("current_status=\(s)") }
        if let p = paymentStatus { params.append("payment_status=\(p)") }
        if !params.isEmpty { endpoint += "?" + params.joined(separator: "&") }
        return try await request(endpoint: endpoint)
    }

    func getShipmentById(_ id: String) async throws -> ShipmentDto {
        try await request(endpoint: "shipments/\(id)")
    }

    func createShipment(_ req: CreateShipmentRequest) async throws -> ShipmentDto {
        try await request(endpoint: "shipments", method: "POST", body: req)
    }

    func cancelShipment(trackingNumber: String) async throws -> SuccessResponse {
        try await request(endpoint: "shipments/\(trackingNumber)/cancel", method: "POST")
    }

    func switchToRelayPayment(trackingNumber: String) async throws -> SuccessResponse {
        try await request(endpoint: "shipments/\(trackingNumber)/switch-to-relay-payment", method: "POST")
    }

    func initPaystack(
        trackingNumber: String,
        amountFcfa: Double,
        customerName: String,
        customerEmail: String,
        customerPhone: String
    ) async throws -> PaystackInitResponse {
        let body = PaystackInitRequest(
            trackingNumber: trackingNumber,
            amountFcfa: amountFcfa,
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone
        )
        return try await request(endpoint: "payments/paystack/init", method: "POST", body: body)
    }

    func verifyPaystack(reference: String, trackingNumber: String) async throws -> PaystackVerifyResponse {
        let body = PaystackVerifyRequest(reference: reference, trackingNumber: trackingNumber)
        return try await request(endpoint: "payments/paystack/verify", method: "POST", body: body)
    }

    // MARK: - Tracking
    func getPublicTracking(trackingNumber: String) async throws -> TrackingResponse {
        try await request(endpoint: "tracking/\(trackingNumber)", authenticated: false)
    }

    func getTracking(trackingNumber: String) async throws -> TrackingResponse {
        try await request(endpoint: "tracking/\(trackingNumber)")
    }

    // MARK: - Relay Points
    func getRelayPoints() async throws -> [RelayPointDto] {
        try await request(endpoint: "relay-points", authenticated: false)
    }

    func getRelayPoint(_ id: String) async throws -> RelayPointDto {
        try await request(endpoint: "relay-points/\(id)")
    }

    // MARK: - Pricing
    func calculatePricing(senderCommune: String, recipientCommune: String, packageSize: String, weight: Double) async throws -> PricingCalculateResponse {
        let endpoint = "pricing-grids/calculate?sender_commune=\(senderCommune.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? senderCommune)&recipient_commune=\(recipientCommune.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? recipientCommune)&package_size=\(packageSize)&grid_type=colis&weight=\(weight)"
        return try await request(endpoint: endpoint, authenticated: false)
    }

    // MARK: - Scan (Relay)
    func relayIntake(trackingNumber: String) async throws -> ScanResponse {
        let body = RelayIntakeRequest(trackingNumber: trackingNumber)
        return try await request(endpoint: "scan/relay-intake", method: "POST", body: body)
    }

    func relayFinalIntake(trackingNumber: String) async throws -> ScanResponse {
        let body = RelayIntakeRequest(trackingNumber: trackingNumber)
        return try await request(endpoint: "scan/relay-final-intake", method: "POST", body: body)
    }

    func makeAvailable(trackingNumber: String) async throws -> ScanResponse {
        let body = RelayIntakeRequest(trackingNumber: trackingNumber)
        return try await request(endpoint: "scan/ops/make-available", method: "POST", body: body)
    }

    func completeDelivery(trackingNumber: String, recipientPhone: String) async throws -> ScanResponse {
        let body = CompleteDeliveryRequest(trackingNumber: trackingNumber, recipientPhone: recipientPhone)
        return try await request(endpoint: "scan/relay/complete-delivery", method: "POST", body: body)
    }

    // MARK: - Scan (Transporter)
    func carrierPickup(trackingNumber: String) async throws -> ScanResponse {
        let body = CarrierPickupRequest(trackingNumber: trackingNumber)
        return try await request(endpoint: "scan/carrier-pickup", method: "POST", body: body)
    }

    func confirmHomePickup(trackingNumber: String, senderPhone: String) async throws -> ScanResponse {
        let body = HomePickupConfirmRequest(trackingNumber: trackingNumber, senderPhone: senderPhone)
        return try await request(endpoint: "scan/confirm-home-pickup", method: "POST", body: body)
    }

    // MARK: - Transporter Handoffs
    func getTransporterAssignments() async throws -> [ShipmentDto] {
        try await request(endpoint: "handoffs/transporter/assignments")
    }

    func getDeliveredShipments() async throws -> [ShipmentDto] {
        try await request(endpoint: "handoffs/transporter/delivered-shipments")
    }

    // MARK: - Search
    func searchByPhone(_ phone: String) async throws -> [ShipmentDto] {
        try await request(endpoint: "shipments/search/phone/\(phone)")
    }

    // MARK: - Shipping Addresses (expéditeur)
    func getShippingAddresses() async throws -> [ShippingAddressDto] {
        try await request(endpoint: "shipping-addresses")
    }

    // MARK: - Recipient Addresses (carnet d'adresses)
    func getRecipientAddresses() async throws -> [RecipientAddressDto] {
        try await request(endpoint: "recipient-addresses")
    }
}

// MARK: - Error Response
private struct ErrorResponse: Codable {
    let error: String?
    let message: String?
}
