import SwiftUI

// MARK: - Shipment Detail View
struct ShipmentDetailView: View {
    let shipment: ShipmentDto
    @ObservedObject var vm: ClientViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showCancelConfirm = false
    @State private var trackingVM = TrackingViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Header
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(shipment.trackingNumber)
                            .font(.system(.title3, design: .monospaced).weight(.bold))
                            .foregroundColor(.orangePrimary)
                        Spacer()
                        if let date = shipment.createdAt {
                            Text(formatDate(date))
                                .font(AppFont.regular(12))
                                .foregroundColor(.gray500)
                        }
                    }
                    HStack(spacing: 8) {
                        StatusBadge(status: shipment.currentStatus)
                        PaymentBadge(status: shipment.paymentStatus)
                    }
                }
                .cardStyle()

                // Route
                routeCard

                // Package info
                packageCard

                // Actions
                actionsSection
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
        }
        .background(Color.gray50)
        .navigationTitle("Détail du colis")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Annuler ce colis ?", isPresented: $showCancelConfirm, titleVisibility: .visible) {
            Button("Confirmer l'annulation", role: .destructive) {
                Task {
                    await vm.cancelShipment(trackingNumber: shipment.trackingNumber)
                    dismiss()
                }
            }
            Button("Annuler", role: .cancel) {}
        }
    }

    private var routeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Itinéraire")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    Label("Expéditeur", systemImage: "arrow.up.circle.fill")
                        .font(AppFont.semiBold(12))
                        .foregroundColor(.blueInfo)
                    Text(shipment.senderName ?? "—")
                        .font(AppFont.bold(13))
                        .foregroundColor(.gray900)
                    Text(shipment.senderCommune ?? "—")
                        .font(AppFont.regular(12))
                        .foregroundColor(.gray500)
                    if let phone = shipment.senderPhone {
                        Text(phone).font(AppFont.regular(12)).foregroundColor(.gray700)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "arrow.right")
                    .foregroundColor(.gray300)
                    .padding(.horizontal, 8)

                VStack(alignment: .leading, spacing: 4) {
                    Label("Destinataire", systemImage: "arrow.down.circle.fill")
                        .font(AppFont.semiBold(12))
                        .foregroundColor(.orangePrimary)
                    Text(shipment.recipientName ?? "—")
                        .font(AppFont.bold(13))
                        .foregroundColor(.gray900)
                    Text(shipment.recipientCommune ?? "—")
                        .font(AppFont.regular(12))
                        .foregroundColor(.gray500)
                    if let phone = shipment.recipientPhone {
                        Text(phone).font(AppFont.regular(12)).foregroundColor(.gray700)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .cardStyle()
    }

    private var packageCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Détails du colis")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                infoCell(label: "Format", value: packageSizeLabel(shipment.packageSize))
                infoCell(label: "Poids", value: shipment.weight.map { "\(String(format: "%.1f", $0)) kg" } ?? "—")
                infoCell(label: "Mode", value: deliveryModeLabel(shipment.deliveryMode))
                infoCell(label: "Prix", value: "\(Int(shipment.totalAmount)) FCFA", accent: true)
            }
        }
        .cardStyle()
    }

    private var actionsSection: some View {
        VStack(spacing: 10) {
            // Cancel (only for certain statuses)
            let canCancel = ["READY_FOR_DROP_OFF", "PICKUP_PENDING", "PENDING"]
                .contains(shipment.currentStatus?.uppercased() ?? "")

            if canCancel {
                Button(action: { showCancelConfirm = true }) {
                    HStack(spacing: 8) {
                        Image(systemName: "xmark.circle")
                        Text("Annuler ce colis")
                            .font(AppFont.semiBold(14))
                    }
                    .foregroundColor(.redDanger)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.redDanger, lineWidth: 1.5))
                    .cornerRadius(12)
                }
            }
        }
    }

    private func infoCell(label: String, value: String, accent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(AppFont.regular(11))
                .foregroundColor(.gray500)
            Text(value)
                .font(AppFont.bold(14))
                .foregroundColor(accent ? .orangePrimary : .gray900)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.gray50)
        .cornerRadius(10)
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
        return String(iso.prefix(10))
    }

    private func packageSizeLabel(_ s: String?) -> String {
        switch s { case "small": return "Petit"; case "large": return "Grand"; default: return "Moyen" }
    }

    private func deliveryModeLabel(_ m: String?) -> String {
        switch m {
        case "relay_to_relay": return "Relais → Relais"
        case "home_to_relay": return "Dom. → Relais"
        case "relay_to_home": return "Relais → Dom."
        case "home_to_home": return "Dom. → Dom."
        default: return m ?? "—"
        }
    }
}
