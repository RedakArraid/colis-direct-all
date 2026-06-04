import Foundation

// MARK: - Configuration
enum AppConfig {
    static let stagingBaseURL = "https://staging-api.colisdirect.com/api/"
    static let productionBaseURL = "https://api.colisdirect.com/api/"

    // Toggle: true = staging, false = production
    static let useStagingAPI = true

    static var baseURL: String {
        useStagingAPI ? stagingBaseURL : productionBaseURL
    }

    static var webURL: String {
        useStagingAPI ? "https://staging.colisdirect.com/" : "https://colisdirect.com/"
    }
}

// MARK: - Auth Models
struct SignInRequest: Codable {
    let email: String?
    let phone: String?
    let password: String
}

struct SignUpRequest: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let phone: String

    enum CodingKeys: String, CodingKey {
        case email, password, phone
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

struct AuthResponse: Codable {
    let accessToken: String
    let user: UserDto

    enum CodingKeys: String, CodingKey {
        // Server returns either "token" or "access_token" depending on route
        case accessToken = "token"
        case user
    }
}

struct UserDto: Codable {
    let id: String
    let email: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let role: String
    let relayPointId: String?

    enum CodingKeys: String, CodingKey {
        case id, email, phone, role
        case firstName = "first_name"
        case lastName = "last_name"
        case relayPointId = "relay_point_id"
    }

    var fullName: String {
        "\(firstName ?? "") \(lastName ?? "")".trimmingCharacters(in: .whitespaces)
    }
}

// MARK: - Shipment Models
struct ShipmentDto: Codable, Identifiable {
    let id: String
    let trackingNumber: String
    let currentStatus: String?
    let paymentStatus: String?
    let paymentMethod: String?
    let deliveryMode: String?
    let packageSize: String?
    let weight: Double?
    let price: Double?
    let createdAt: String?
    let senderName: String?
    let senderPhone: String?
    let senderCommune: String?
    let recipientName: String?
    let recipientPhone: String?
    let recipientCommune: String?
    let relayPickupId: String?
    let relayDeliveryId: String?
    let events: [ShipmentEvent]?
    let labelUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case trackingNumber = "tracking_number"
        case currentStatus = "current_status"
        case paymentStatus = "payment_status"
        case paymentMethod = "payment_method"
        case deliveryMode = "delivery_mode"
        case packageSize = "package_size"
        case weight, price
        case createdAt = "created_at"
        case senderName = "sender_name"
        case senderPhone = "sender_phone"
        case senderCommune = "sender_commune"
        case recipientName = "recipient_name"
        case recipientPhone = "recipient_phone"
        case recipientCommune = "recipient_commune"
        case relayPickupId = "relay_pickup_id"
        case relayDeliveryId = "relay_delivery_id"
        case events
        case labelUrl = "label_url"
    }
}

struct ShipmentEvent: Codable, Identifiable {
    let id: String
    let status: String?
    let note: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, status, note
        case createdAt = "created_at"
    }
}

// MARK: - Tracking
struct TrackingResponse: Codable {
    let shipment: ShipmentDto
    let events: [ShipmentEvent]?
    let pickupRelayPoint: RelayPointDto?
    let deliveryRelayPoint: RelayPointDto?

    enum CodingKeys: String, CodingKey {
        case shipment, events
        case pickupRelayPoint = "pickup_relay_point"
        case deliveryRelayPoint = "delivery_relay_point"
    }
}

// MARK: - Relay Points
struct RelayPointDto: Codable, Identifiable {
    let id: String
    let name: String?
    let address: String?
    let commune: String?
    let phone: String?
    let latitude: Double?
    let longitude: Double?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, address, commune, phone, latitude, longitude
        case isActive = "is_active"
    }
}

// MARK: - Pricing
struct PricingCalculateResponse: Codable {
    let price: Double
    let currency: String?
}

// MARK: - Scan
struct ScanResponse: Codable {
    let success: Bool?
    let message: String?
    let shipment: ShipmentDto?
}

struct RelayIntakeRequest: Codable {
    let trackingNumber: String
    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
    }
}

struct CarrierPickupRequest: Codable {
    let trackingNumber: String
    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
    }
}

struct HomePickupConfirmRequest: Codable {
    let trackingNumber: String
    let senderPhone: String
    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
        case senderPhone = "sender_phone"
    }
}

struct CompleteDeliveryRequest: Codable {
    let trackingNumber: String
    let recipientPhone: String
    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
        case recipientPhone = "recipient_phone"
    }
}

// MARK: - Shipment Creation
struct CreateShipmentRequest: Codable {
    let senderName: String
    let senderPhone: String
    let senderCommune: String
    let recipientName: String
    let recipientPhone: String
    let recipientCommune: String
    let packageSize: String
    let weight: Double
    let deliveryMode: String
    let paymentMethod: String
    let relayPickupId: String?
    let relayDeliveryId: String?

    enum CodingKeys: String, CodingKey {
        case weight
        case senderName = "sender_name"
        case senderPhone = "sender_phone"
        case senderCommune = "sender_commune"
        case recipientName = "recipient_name"
        case recipientPhone = "recipient_phone"
        case recipientCommune = "recipient_commune"
        case packageSize = "package_size"
        case deliveryMode = "delivery_mode"
        case paymentMethod = "payment_method"
        case relayPickupId = "relay_pickup_id"
        case relayDeliveryId = "relay_delivery_id"
    }
}

// MARK: - Payment
struct PaystackInitRequest: Codable {
    let trackingNumber: String
    let amountFcfa: Double
    let customerName: String
    let customerEmail: String
    let customerPhone: String

    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
        case amountFcfa = "amount_fcfa"
        case customerName = "customer_name"
        case customerEmail = "customer_email"
        case customerPhone = "customer_phone"
    }
}

struct PaystackInitResponse: Codable {
    let paymentUrl: String?
    let authorizationUrl: String?
    let transactionId: String?

    enum CodingKeys: String, CodingKey {
        case paymentUrl = "payment_url"
        case authorizationUrl = "authorization_url"
        case transactionId = "transaction_id"
    }

    var url: String? {
        paymentUrl ?? authorizationUrl
    }
}

struct PaystackVerifyRequest: Codable {
    let reference: String
    let trackingNumber: String

    enum CodingKeys: String, CodingKey {
        case reference
        case trackingNumber = "tracking_number"
    }
}

struct PaystackVerifyResponse: Codable {
    let paid: Bool
    let status: String?
    let reference: String?
}

struct SuccessResponse: Codable {
    let success: Bool?
    let message: String?
}

// MARK: - Shipping Addresses (expéditeur)
struct ShippingAddressDto: Codable, Identifiable {
    let id: String
    let address: String?
    let commune: String?
    let quartier: String?
    let ville: String?
    let isDefault: Bool?

    enum CodingKeys: String, CodingKey {
        case id, address, commune, quartier, ville
        case isDefault = "is_default"
    }

    var displayName: String {
        [address, quartier, commune]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }
}

// MARK: - Recipient Addresses (carnet d'adresses)
struct RecipientAddressDto: Codable, Identifiable {
    let id: String
    let label: String?
    let firstName: String?
    let lastName: String?
    let phone: String?
    let email: String?
    let commune: String?
    let quartier: String?
    let address: String?
    let isDefault: Bool?

    enum CodingKeys: String, CodingKey {
        case id, label, phone, email, commune, quartier, address
        case firstName = "first_name"
        case lastName = "last_name"
        case isDefault = "is_default"
    }

    var fullName: String {
        [firstName, lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    var displaySubtitle: String {
        [phone, commune].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
    }
}
