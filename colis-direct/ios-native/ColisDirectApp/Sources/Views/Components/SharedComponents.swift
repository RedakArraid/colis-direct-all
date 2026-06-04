import SwiftUI

// MARK: - CdTextField (matches Android CdTextField)
struct CdTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var leadingIcon: String? = nil
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default

    @State private var isSecureVisible = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(AppFont.medium(13))
                .foregroundColor(.gray900)

            HStack(spacing: 10) {
                if let icon = leadingIcon {
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(.gray500)
                }

                if isSecure && !isSecureVisible {
                    SecureField(placeholder, text: $text)
                        .font(AppFont.regular(14))
                        .foregroundColor(.gray900)
                        .keyboardType(keyboardType)
                        .focused($isFocused)
                } else {
                    TextField(placeholder, text: $text)
                        .font(AppFont.regular(14))
                        .foregroundColor(.gray900)
                        .keyboardType(keyboardType)
                        .focused($isFocused)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }

                if isSecure {
                    Button(action: { isSecureVisible.toggle() }) {
                        Image(systemName: isSecureVisible ? "eye.slash" : "eye")
                            .font(.system(size: 16))
                            .foregroundColor(.gray500)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isFocused ? Color.orangePrimary : Color.gray300, lineWidth: 1.5)
            )
            .cornerRadius(12)
        }
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: String?

    var body: some View {
        if let status = status {
            let config = badgeConfig(for: status)
            Text(config.label)
                .font(AppFont.semiBold(11))
                .foregroundColor(config.color)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(config.color.opacity(0.15))
                .cornerRadius(20)
        }
    }

    private func badgeConfig(for status: String) -> (label: String, color: Color) {
        switch status.lowercased() {
        case "pending_pickup": return ("En attente collecte", .blueInfo)
        case "picked_up": return ("Collecté", .blueInfo)
        case "at_pickup_relay": return ("Au relais départ", .purpleRelay)
        case "in_transit": return ("En transit", Color.orangePrimary)
        case "at_delivery_relay": return ("Au relais arrivée", .purpleRelay)
        case "out_for_delivery": return ("En livraison", Color.orangePrimary)
        case "delivered": return ("Livré ✓", .greenSuccess)
        case "cancelled": return ("Annulé", .redDanger)
        case "return_to_sender": return ("Retour expéditeur", .yellowWarning)
        default: return (status.replacingOccurrences(of: "_", with: " ").capitalized, .gray500)
        }
    }
}

// MARK: - Payment Badge
struct PaymentBadge: View {
    let status: String?

    var body: some View {
        if let status = status {
            let config = badgeConfig(for: status)
            Text(config.label)
                .font(AppFont.semiBold(11))
                .foregroundColor(config.color)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(config.color.opacity(0.15))
                .cornerRadius(20)
        }
    }

    private func badgeConfig(for status: String) -> (label: String, color: Color) {
        switch status.lowercased() {
        case "paid": return ("Payé ✓", .greenSuccess)
        case "pending": return ("En attente", .yellowWarning)
        case "failed", "rejected": return ("Rejeté", .redDanger)
        case "cancelled": return ("Annulé", .redDanger)
        default: return (status, .gray500)
        }
    }
}

// MARK: - Orange Button
struct OrangeButton: View {
    let title: String
    var icon: String? = nil
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.85)
                } else {
                    if let icon = icon {
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .semibold))
                    }
                    Text(title)
                        .font(AppFont.bold(15))
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(isDisabled ? Color.orangePrimary.opacity(0.5) : Color.orangePrimary)
            .cornerRadius(12)
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Shipment Row
struct ShipmentRow: View {
    let shipment: ShipmentDto
    var onTap: (() -> Void)? = nil

    var body: some View {
        Button(action: { onTap?() }) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(shipment.trackingNumber)
                        .font(.system(.footnote, design: .monospaced).weight(.bold))
                        .foregroundColor(.orangePrimary)
                    Spacer()
                    if let date = shipment.createdAt {
                        Text(formatDate(date))
                            .font(AppFont.regular(12))
                            .foregroundColor(.gray500)
                    }
                }

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Label(shipment.senderCommune ?? "—", systemImage: "arrow.up.circle.fill")
                            .font(AppFont.medium(12))
                            .foregroundColor(.gray700)
                        Label(shipment.recipientCommune ?? "—", systemImage: "arrow.down.circle.fill")
                            .font(AppFont.medium(12))
                            .foregroundColor(.gray700)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        StatusBadge(status: shipment.currentStatus)
                        PaymentBadge(status: shipment.paymentStatus)
                    }
                }

                HStack {
                    if let mode = shipment.deliveryMode {
                        Label(mode == "home" ? "Domicile" : "Point relais",
                              systemImage: mode == "home" ? "house.fill" : "mappin.circle.fill")
                            .font(AppFont.regular(12))
                            .foregroundColor(mode == "home" ? .blueInfo : .purpleRelay)
                    }
                    Spacer()
                    if let price = shipment.price {
                        Text("\(Int(price)) FCFA")
                            .font(AppFont.bold(13))
                            .foregroundColor(.orangePrimary)
                    }
                }
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }

    private func formatDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "fr_FR")
            df.dateFormat = "dd/MM/yyyy"
            return df.string(from: date)
        }
        return iso.prefix(10).description
    }
}

// MARK: - Error Toast
struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundColor(.redDanger)
            Text(message)
                .font(AppFont.medium(13))
                .foregroundColor(Color(hex: "#991B1B"))
        }
        .padding(12)
        .background(Color(hex: "#FEE2E2"))
        .cornerRadius(10)
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(AppFont.bold(16))
            .foregroundColor(.gray900)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(.orangePrimary)
                .scaleEffect(1.5)
            Text("Chargement…")
                .font(AppFont.medium(14))
                .foregroundColor(.gray500)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Empty State
struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 52))
                .foregroundColor(.gray300)
            Text(title)
                .font(AppFont.bold(18))
                .foregroundColor(.gray700)
            Text(subtitle)
                .font(AppFont.regular(14))
                .foregroundColor(.gray500)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
    }
}
