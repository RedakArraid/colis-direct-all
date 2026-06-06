import Foundation

fileprivate func decodeDouble<K: CodingKey>(from container: KeyedDecodingContainer<K>, key: K) -> Double? {
    if let val = try? container.decode(Double.self, forKey: key) {
        return val
    }
    if let val = try? container.decode(Int.self, forKey: key) {
        return Double(val)
    }
    if let strVal = try? container.decode(String.self, forKey: key), let val = Double(strVal.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespacesAndNewlines)) {
        return val
    }
    return nil
}

fileprivate func decodeDoubleRequired<K: CodingKey>(from container: KeyedDecodingContainer<K>, key: K, defaultValue: Double = 0.0) -> Double {
    return decodeDouble(from: container, key: key) ?? defaultValue
}

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
    let senderFirstName: String?
    let senderLastName: String?
    let senderPhone: String?
    let senderCommune: String?
    let recipientName: String?
    let recipientFirstName: String?
    let recipientLastName: String?
    let recipientPhone: String?
    let recipientCommune: String?
    let relayPickupId: String?
    let relayDeliveryId: String?
    let events: [ShipmentEvent]?
    let labelUrl: String?
    let shipmentCode: String?
    let pickupCode: String?
    let printingFee: Double?
    let assistanceFee: Double?
    let boxPrice: Double?

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
        case senderFirstName = "sender_first_name"
        case senderLastName = "sender_last_name"
        case senderPhone = "sender_phone"
        case senderCommune = "sender_commune"
        case recipientName = "recipient_name"
        case recipientFirstName = "recipient_first_name"
        case recipientLastName = "recipient_last_name"
        case recipientPhone = "recipient_phone"
        case recipientCommune = "recipient_commune"
        case relayPickupId = "relay_pickup_id"
        case relayDeliveryId = "relay_delivery_id"
        case events
        case labelUrl = "label_url"
        case shipmentCode = "shipment_code"
        case pickupCode = "pickup_code"
        case printingFee = "printing_fee"
        case assistanceFee = "assistance_fee"
        case boxPrice = "box_price"
    }

    var totalAmount: Double {
        let base = price ?? 0.0
        let printing = printingFee ?? 0.0
        let assistance = assistanceFee ?? 0.0
        let box = boxPrice ?? 0.0
        return base + printing + assistance + box
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        trackingNumber = try container.decode(String.self, forKey: .trackingNumber)
        currentStatus = try container.decodeIfPresent(String.self, forKey: .currentStatus)
        paymentStatus = try container.decodeIfPresent(String.self, forKey: .paymentStatus)
        paymentMethod = try container.decodeIfPresent(String.self, forKey: .paymentMethod)
        deliveryMode = try container.decodeIfPresent(String.self, forKey: .deliveryMode)
        packageSize = try container.decodeIfPresent(String.self, forKey: .packageSize)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        senderFirstName = try container.decodeIfPresent(String.self, forKey: .senderFirstName)
        senderLastName = try container.decodeIfPresent(String.self, forKey: .senderLastName)
        
        if let first = senderFirstName, let last = senderLastName {
            senderName = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        } else {
            senderName = try container.decodeIfPresent(String.self, forKey: .senderName)
        }
        
        senderPhone = try container.decodeIfPresent(String.self, forKey: .senderPhone)
        senderCommune = try container.decodeIfPresent(String.self, forKey: .senderCommune)
        recipientFirstName = try container.decodeIfPresent(String.self, forKey: .recipientFirstName)
        recipientLastName = try container.decodeIfPresent(String.self, forKey: .recipientLastName)
        
        if let first = recipientFirstName, let last = recipientLastName {
            recipientName = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        } else {
            recipientName = try container.decodeIfPresent(String.self, forKey: .recipientName)
        }
        
        recipientPhone = try container.decodeIfPresent(String.self, forKey: .recipientPhone)
        recipientCommune = try container.decodeIfPresent(String.self, forKey: .recipientCommune)
        relayPickupId = try container.decodeIfPresent(String.self, forKey: .relayPickupId)
        relayDeliveryId = try container.decodeIfPresent(String.self, forKey: .relayDeliveryId)
        events = try container.decodeIfPresent([ShipmentEvent].self, forKey: .events)
        labelUrl = try container.decodeIfPresent(String.self, forKey: .labelUrl)
        shipmentCode = try container.decodeIfPresent(String.self, forKey: .shipmentCode)
        pickupCode = try container.decodeIfPresent(String.self, forKey: .pickupCode)
        
        weight = decodeDouble(from: container, key: .weight)
        price = decodeDouble(from: container, key: .price)
        printingFee = decodeDouble(from: container, key: .printingFee)
        assistanceFee = decodeDouble(from: container, key: .assistanceFee)
        boxPrice = decodeDouble(from: container, key: .boxPrice)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(trackingNumber, forKey: .trackingNumber)
        try container.encodeIfPresent(currentStatus, forKey: .currentStatus)
        try container.encodeIfPresent(paymentStatus, forKey: .paymentStatus)
        try container.encodeIfPresent(paymentMethod, forKey: .paymentMethod)
        try container.encodeIfPresent(deliveryMode, forKey: .deliveryMode)
        try container.encodeIfPresent(packageSize, forKey: .packageSize)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(senderName, forKey: .senderName)
        try container.encodeIfPresent(senderFirstName, forKey: .senderFirstName)
        try container.encodeIfPresent(senderLastName, forKey: .senderLastName)
        try container.encodeIfPresent(senderPhone, forKey: .senderPhone)
        try container.encodeIfPresent(senderCommune, forKey: .senderCommune)
        try container.encodeIfPresent(recipientName, forKey: .recipientName)
        try container.encodeIfPresent(recipientFirstName, forKey: .recipientFirstName)
        try container.encodeIfPresent(recipientLastName, forKey: .recipientLastName)
        try container.encodeIfPresent(recipientPhone, forKey: .recipientPhone)
        try container.encodeIfPresent(recipientCommune, forKey: .recipientCommune)
        try container.encodeIfPresent(relayPickupId, forKey: .relayPickupId)
        try container.encodeIfPresent(relayDeliveryId, forKey: .relayDeliveryId)
        try container.encodeIfPresent(events, forKey: .events)
        try container.encodeIfPresent(labelUrl, forKey: .labelUrl)
        try container.encodeIfPresent(shipmentCode, forKey: .shipmentCode)
        try container.encodeIfPresent(pickupCode, forKey: .pickupCode)
        try container.encodeIfPresent(weight, forKey: .weight)
        try container.encodeIfPresent(price, forKey: .price)
        try container.encodeIfPresent(printingFee, forKey: .printingFee)
        try container.encodeIfPresent(assistanceFee, forKey: .assistanceFee)
        try container.encodeIfPresent(boxPrice, forKey: .boxPrice)
    }
}

struct ShipmentEvent: Codable, Identifiable {
    let id: String
    let status: String?
    let note: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, status, note, notes
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(String.self, forKey: .id)) ?? UUID().uuidString
        self.status = try container.decodeIfPresent(String.self, forKey: .status)
        self.note = (try? container.decodeIfPresent(String.self, forKey: .note)) ?? (try? container.decodeIfPresent(String.self, forKey: .notes))
        self.createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(note, forKey: .note)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
    }
}

// MARK: - Tracking
struct TrackingResponse: Codable {
    let shipment: ShipmentDto
    let events: [ShipmentEvent]?
    let pickupRelayPoint: RelayPointDto?
    let deliveryRelayPoint: RelayPointDto?

    enum CodingKeys: String, CodingKey {
        case events
        case pickupRelayPoint = "origin_relay"
        case deliveryRelayPoint = "destination_relay"
    }

    init(from decoder: Decoder) throws {
        self.shipment = try ShipmentDto(from: decoder)
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.events = try container.decodeIfPresent([ShipmentEvent].self, forKey: .events)
        self.pickupRelayPoint = try container.decodeIfPresent(RelayPointDto.self, forKey: .pickupRelayPoint)
        self.deliveryRelayPoint = try container.decodeIfPresent(RelayPointDto.self, forKey: .deliveryRelayPoint)
    }

    func encode(to encoder: Encoder) throws {
        try shipment.encode(to: encoder)
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(events, forKey: .events)
        try container.encodeIfPresent(pickupRelayPoint, forKey: .pickupRelayPoint)
        try container.encodeIfPresent(deliveryRelayPoint, forKey: .deliveryRelayPoint)
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

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? container.decode(String.self, forKey: .id)) ?? UUID().uuidString
        name = try container.decodeIfPresent(String.self, forKey: .name)
        address = try container.decodeIfPresent(String.self, forKey: .address)
        commune = try container.decodeIfPresent(String.self, forKey: .commune)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        
        latitude = decodeDouble(from: container, key: .latitude)
        longitude = decodeDouble(from: container, key: .longitude)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(address, forKey: .address)
        try container.encodeIfPresent(commune, forKey: .commune)
        try container.encodeIfPresent(phone, forKey: .phone)
        try container.encodeIfPresent(isActive, forKey: .isActive)
        try container.encodeIfPresent(latitude, forKey: .latitude)
        try container.encodeIfPresent(longitude, forKey: .longitude)
    }
}

// MARK: - Pricing
struct PricingMode: Codable, Identifiable {
    var id: String { key }
    let key: String
    let label: String
    let emoji: String
    let pickupMethod: String
    let homeDelivery: Bool
    let discountPercent: Double
    let delay: String
    let available: Bool
    let standardPriceFcfa: Double
    let discountAmountFcfa: Double
    let finalPriceFcfa: Double
    let isCheapest: Bool

    enum CodingKeys: String, CodingKey {
        case key, label, emoji, delay, available
        case pickupMethod = "pickup_method"
        case homeDelivery = "home_delivery"
        case discountPercent = "discount_percent"
        case standardPriceFcfa = "standard_price_fcfa"
        case discountAmountFcfa = "discount_amount_fcfa"
        case finalPriceFcfa = "final_price_fcfa"
        case isCheapest = "is_cheapest"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        key = try container.decode(String.self, forKey: .key)
        label = try container.decode(String.self, forKey: .label)
        emoji = try container.decode(String.self, forKey: .emoji)
        pickupMethod = try container.decode(String.self, forKey: .pickupMethod)
        homeDelivery = try container.decode(Bool.self, forKey: .homeDelivery)
        delay = try container.decode(String.self, forKey: .delay)
        available = try container.decode(Bool.self, forKey: .available)
        isCheapest = try container.decode(Bool.self, forKey: .isCheapest)
        
        discountPercent = decodeDoubleRequired(from: container, key: .discountPercent)
        standardPriceFcfa = decodeDoubleRequired(from: container, key: .standardPriceFcfa)
        discountAmountFcfa = decodeDoubleRequired(from: container, key: .discountAmountFcfa)
        finalPriceFcfa = decodeDoubleRequired(from: container, key: .finalPriceFcfa)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(key, forKey: .key)
        try container.encode(label, forKey: .label)
        try container.encode(emoji, forKey: .emoji)
        try container.encode(pickupMethod, forKey: .pickupMethod)
        try container.encode(homeDelivery, forKey: .homeDelivery)
        try container.encode(delay, forKey: .delay)
        try container.encode(available, forKey: .available)
        try container.encode(isCheapest, forKey: .isCheapest)
        try container.encode(discountPercent, forKey: .discountPercent)
        try container.encode(standardPriceFcfa, forKey: .standardPriceFcfa)
        try container.encode(discountAmountFcfa, forKey: .discountAmountFcfa)
        try container.encode(finalPriceFcfa, forKey: .finalPriceFcfa)
    }
}

struct PricingCalculateResponse: Codable {
    let packageSize: String
    let distanceKm: Double?
    let isSameZone: Bool
    let zoneResolved: Bool
    let zoneFrom: String?
    let zoneTo: String?
    let tierName: String
    let basePriceFcfa: Double
    let includedWeightKg: Double
    let weightSurchargeFcfa: Double
    let standardPriceFcfa: Double
    let modes: [PricingMode]

    enum CodingKeys: String, CodingKey {
        case packageSize = "package_size"
        case distanceKm = "distance_km"
        case isSameZone = "is_same_zone"
        case zoneResolved = "zone_resolved"
        case zoneFrom = "zone_from"
        case zoneTo = "zone_to"
        case tierName = "tier_name"
        case basePriceFcfa = "base_price_fcfa"
        case includedWeightKg = "included_weight_kg"
        case weightSurchargeFcfa = "weight_surcharge_fcfa"
        case standardPriceFcfa = "standard_price_fcfa"
        case modes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        packageSize = try container.decode(String.self, forKey: .packageSize)
        isSameZone = try container.decode(Bool.self, forKey: .isSameZone)
        zoneResolved = try container.decode(Bool.self, forKey: .zoneResolved)
        zoneFrom = try container.decodeIfPresent(String.self, forKey: .zoneFrom)
        zoneTo = try container.decodeIfPresent(String.self, forKey: .zoneTo)
        tierName = try container.decode(String.self, forKey: .tierName)
        modes = try container.decode([PricingMode].self, forKey: .modes)
        
        distanceKm = decodeDouble(from: container, key: .distanceKm)
        basePriceFcfa = decodeDoubleRequired(from: container, key: .basePriceFcfa)
        includedWeightKg = decodeDoubleRequired(from: container, key: .includedWeightKg)
        weightSurchargeFcfa = decodeDoubleRequired(from: container, key: .weightSurchargeFcfa)
        standardPriceFcfa = decodeDoubleRequired(from: container, key: .standardPriceFcfa)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(packageSize, forKey: .packageSize)
        try container.encode(isSameZone, forKey: .isSameZone)
        try container.encode(zoneResolved, forKey: .zoneResolved)
        try container.encodeIfPresent(zoneFrom, forKey: .zoneFrom)
        try container.encodeIfPresent(zoneTo, forKey: .zoneTo)
        try container.encode(tierName, forKey: .tierName)
        try container.encode(modes, forKey: .modes)
        try container.encodeIfPresent(distanceKm, forKey: .distanceKm)
        try container.encode(basePriceFcfa, forKey: .basePriceFcfa)
        try container.encode(includedWeightKg, forKey: .includedWeightKg)
        try container.encode(weightSurchargeFcfa, forKey: .weightSurchargeFcfa)
        try container.encode(standardPriceFcfa, forKey: .standardPriceFcfa)
    }
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
    let pickupCode: String
    let recipientIdentifier: String?
    enum CodingKeys: String, CodingKey {
        case trackingNumber = "tracking_number"
        case pickupCode = "pickup_code"
        case recipientIdentifier = "recipient_identifier"
    }
}

// MARK: - Shipment Creation
struct CreateShipmentRequest: Codable {
    let senderFirstName: String
    let senderLastName: String
    let senderEmail: String?
    let senderPhone: String
    let senderCommune: String
    let senderQuartier: String
    let senderAddress: String
    let recipientFirstName: String
    let recipientLastName: String
    let recipientEmail: String?
    let recipientPhone: String
    let recipientCommune: String
    let recipientQuartier: String
    let recipientAddress: String
    let packageType: String
    let gridType: String
    let weight: Double
    let homeDelivery: Bool
    let pickupMethod: String
    let originRelayId: String?
    let destinationRelayId: String?
    let paymentMethod: String
    let paymentStatus: String

    enum CodingKeys: String, CodingKey {
        case weight
        case senderFirstName = "sender_first_name"
        case senderLastName = "sender_last_name"
        case senderEmail = "sender_email"
        case senderPhone = "sender_phone"
        case senderCommune = "sender_commune"
        case senderQuartier = "sender_quartier"
        case senderAddress = "sender_address"
        case recipientFirstName = "recipient_first_name"
        case recipientLastName = "recipient_last_name"
        case recipientEmail = "recipient_email"
        case recipientPhone = "recipient_phone"
        case recipientCommune = "recipient_commune"
        case recipientQuartier = "recipient_quartier"
        case recipientAddress = "recipient_address"
        case packageType = "package_type"
        case gridType = "grid_type"
        case homeDelivery = "home_delivery"
        case pickupMethod = "pickup_method"
        case originRelayId = "origin_relay_id"
        case destinationRelayId = "destination_relay_id"
        case paymentMethod = "payment_method"
        case paymentStatus = "payment_status"
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

struct CreateRecipientAddressRequest: Codable {
    let label: String
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String
    let commune: String
    let quartier: String
    let address: String
    let isDefault: Bool

    enum CodingKeys: String, CodingKey {
        case label, email, phone, commune, quartier, address
        case firstName = "first_name"
        case lastName = "last_name"
        case isDefault = "is_default"
    }
}

