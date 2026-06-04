import SwiftUI

// MARK: - Tracking Step Definition
struct TrackingStepDef {
    let id: String
    let label: String
    let sublabel: String
    let statuses: [String]
    let icon: String
}

let RELAY_STEPS: [TrackingStepDef] = [
    TrackingStepDef(id: "created", label: "Commande créée", sublabel: "En attente de dépôt",
                    statuses: ["READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY"],
                    icon: "shippingbox.fill"),
    TrackingStepDef(id: "origin_relay", label: "Déposé au relais", sublabel: "Pris en charge au départ",
                    statuses: ["RELAY_ORIGIN_RECEIVED", "PAYMENT_RECEIVED_AT_RELAY"],
                    icon: "storefront.fill"),
    TrackingStepDef(id: "transit", label: "En transit", sublabel: "Acheminement en cours",
                    statuses: ["CARRIER_COLLECTED", "IN_TRANSIT"],
                    icon: "truck.box.fill"),
    TrackingStepDef(id: "dest_relay", label: "Au relais de livraison", sublabel: "Disponible au retrait",
                    statuses: ["RELAY_FINAL_RECEIVED", "AVAILABLE_FOR_PICKUP"],
                    icon: "storefront"),
    TrackingStepDef(id: "done", label: "Retiré", sublabel: "Livraison terminée",
                    statuses: ["PICKED_UP_BY_CUSTOMER"],
                    icon: "checkmark.circle.fill"),
]

let HOME_STEPS_DIRECT: [TrackingStepDef] = [
    TrackingStepDef(id: "created", label: "Commande créée", sublabel: "En attente de ramassage",
                    statuses: ["PICKUP_PENDING", "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION"],
                    icon: "shippingbox.fill"),
    TrackingStepDef(id: "pickup", label: "Ramassage", sublabel: "Collecté chez l'expéditeur",
                    statuses: ["CARRIER_COLLECTED"],
                    icon: "house.fill"),
    TrackingStepDef(id: "transit", label: "En transit", sublabel: "Acheminement en cours",
                    statuses: ["IN_TRANSIT"],
                    icon: "truck.box.fill"),
    TrackingStepDef(id: "done", label: "Livré à domicile", sublabel: "Livraison terminée",
                    statuses: ["DELIVERED", "DELIVERED_TO_CUSTOMER"],
                    icon: "checkmark.circle.fill"),
]

let STEP_DONE_STATUSES: Set<String> = [
    "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP",
    "PAYMENT_PENDING_AT_RELAY", "PICKUP_PENDING", "RELAY_ORIGIN_RECEIVED",
    "PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER"
]

func getActiveStepIndex(steps: [TrackingStepDef], currentStatus: String) -> Int {
    let upper = currentStatus.uppercased()
    let idx = steps.firstIndex(where: { $0.statuses.contains(upper) }) ?? 1
    return STEP_DONE_STATUSES.contains(upper) ? min(idx + 1, steps.count) : idx
}

// MARK: - Tracking View
struct TrackingView: View {
    @ObservedObject var vm: TrackingViewModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    searchHeader
                    if vm.isLoading {
                        LoadingView().frame(height: 300)
                    } else if let error = vm.error {
                        VStack(spacing: 16) {
                            ErrorBanner(message: error)
                                .padding(.horizontal, 20)
                            notFoundCard
                        }
                        .padding(.top, 20)
                    } else if let result = vm.result {
                        trackingResult(result)
                    } else {
                        emptyState
                    }
                }
            }
            .background(Color.gray50)
            .navigationBarHidden(true)
        }
        .animation(.easeInOut(duration: 0.3), value: vm.result != nil)
    }

    // MARK: Search Header
    private var searchHeader: some View {
        VStack(spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray500)
                TextField("Numéro de suivi (ex: CD12345678)", text: $vm.trackingNumber)
                    .font(AppFont.regular(14))
                    .foregroundColor(.gray900)
                    .autocapitalization(.allCharacters)
                    .disableAutocorrection(true)
                    .submitLabel(.search)
                    .onSubmit { Task { await vm.search() } }

                if !vm.trackingNumber.isEmpty {
                    Button(action: { vm.reset() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray400)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray300, lineWidth: 1.5))

            Button(action: { Task { await vm.search() } }) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 16, weight: .bold))
                    Text("Suivre mon colis")
                        .font(AppFont.bold(15))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.navyDark)
                .cornerRadius(12)
            }
            .disabled(vm.trackingNumber.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 24)
        .background(LinearGradient(colors: [Color.orangePrimary, Color.orangeLight], startPoint: .leading, endPoint: .trailing))
    }

    // MARK: Empty State
    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer().frame(height: 40)
            Image(systemName: "magnifyingglass.circle")
                .font(.system(size: 56))
                .foregroundColor(.gray300)
            Text("Entrez un numéro de suivi")
                .font(AppFont.bold(18))
                .foregroundColor(.gray700)
            Text("Saisissez votre numéro de suivi pour\nconsulter l'état de votre colis.")
                .font(AppFont.regular(14))
                .foregroundColor(.gray500)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(.horizontal, 20)
    }

    // MARK: Not Found Card
    private var notFoundCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 36))
                .foregroundColor(.yellowWarning)
            Text("Colis introuvable")
                .font(AppFont.bold(18))
                .foregroundColor(.gray900)
            Text("Le numéro de suivi \"\(vm.trackingNumber)\" n'existe pas ou est invalide.")
                .font(AppFont.regular(14))
                .foregroundColor(.gray500)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.06), radius: 8)
        .padding(.horizontal, 20)
    }

    // MARK: Tracking Result
    @ViewBuilder
    private func trackingResult(_ res: TrackingResponse) -> some View {
        let shipment = res.shipment
        let status = shipment.currentStatus?.uppercased() ?? ""
        let isCancelled = status == "CANCELLED"
        let isReturnToSender = status == "RETURN_TO_SENDER"
        let isRelay = shipment.deliveryMode == "relay_to_relay" || shipment.deliveryMode == "home_to_relay"
        let steps = isRelay ? RELAY_STEPS : HOME_STEPS_DIRECT
        let activeStep = getActiveStepIndex(steps: steps, currentStatus: shipment.currentStatus ?? "")

        VStack(spacing: 16) {
            // Tracking header card
            trackingHeaderCard(shipment: shipment)

            // Incident banners
            if isCancelled {
                incidentBanner(icon: "xmark.circle.fill", color: .redDanger,
                               title: "Colis annulé",
                               subtitle: "Ce colis a été annulé.")
            } else if isReturnToSender {
                incidentBanner(icon: "arrow.uturn.left.circle.fill", color: .yellowWarning,
                               title: "Retour expéditeur",
                               subtitle: "Ce colis est en cours de retour vers l'expéditeur.")
            }

            // Progress timeline
            if !isCancelled && !isReturnToSender {
                timelineCard(steps: steps, activeStep: activeStep)
            }

            // Events history
            if let events = res.events ?? shipment.events, !events.isEmpty {
                eventsCard(events: events)
            }

            // Sender / Recipient info
            contactsCard(shipment: shipment)

            // Relay points
            if let pickup = res.pickupRelayPoint {
                relayCard(relay: pickup, title: "Point relais de départ")
            }
            if let delivery = res.deliveryRelayPoint {
                relayCard(relay: delivery, title: "Point relais de livraison")
            }

            // Package details
            packageDetailsCard(shipment: shipment)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
    }

    // MARK: Tracking Header Card
    private func trackingHeaderCard(shipment: ShipmentDto) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(shipment.trackingNumber)
                .font(.system(.title3, design: .monospaced).weight(.bold))
                .foregroundColor(.gray900)

            if let date = shipment.createdAt {
                Text("Créé le \(formatDate(date))")
                    .font(AppFont.regular(12))
                    .foregroundColor(.gray500)
            }

            HStack(spacing: 8) {
                // Delivery mode badge
                if let mode = shipment.deliveryMode {
                    let isHome = mode.contains("home")
                    Label(isHome ? "Domicile" : "Point relais",
                          systemImage: isHome ? "house.fill" : "mappin.circle.fill")
                        .font(AppFont.semiBold(12))
                        .foregroundColor(isHome ? .blueInfo : .purpleRelay)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background((isHome ? Color.blueInfo : Color.purpleRelay).opacity(0.12))
                        .cornerRadius(20)
                }
                StatusBadge(status: shipment.currentStatus)
                PaymentBadge(status: shipment.paymentStatus)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: Incident Banner
    private func incidentBanner(icon: String, color: Color, title: String, subtitle: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(AppFont.bold(14)).foregroundColor(color)
                Text(subtitle).font(AppFont.regular(12)).foregroundColor(.gray700)
            }
            Spacer()
        }
        .padding(14)
        .background(color.opacity(0.1))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color.opacity(0.3), lineWidth: 1))
    }

    // MARK: Timeline Card
    private func timelineCard(steps: [TrackingStepDef], activeStep: Int) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Progression")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            VStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: 14) {
                        // Step circle + line
                        VStack(spacing: 0) {
                            let isDone = index < activeStep
                            let isActive = index == activeStep

                            ZStack {
                                Circle()
                                    .fill(isDone ? Color.orangePrimary : isActive ? Color.orangePrimary : Color.gray200)
                                    .frame(width: 32, height: 32)

                                if isDone {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                } else {
                                    Text("\(index + 1)")
                                        .font(AppFont.bold(13))
                                        .foregroundColor(isActive ? .white : .gray400)
                                }
                            }
                            .scaleEffect(isActive ? 1.1 : 1.0)
                            .animation(.easeInOut, value: activeStep)

                            if index < steps.count - 1 {
                                Rectangle()
                                    .fill(isDone ? Color.orangePrimary : Color.gray200)
                                    .frame(width: 2, height: 40)
                            }
                        }

                        // Step content
                        VStack(alignment: .leading, spacing: 2) {
                            let isDone = index < activeStep
                            let isActive = index == activeStep
                            Text(step.label)
                                .font(AppFont.bold(14))
                                .foregroundColor(isDone || isActive ? .gray900 : .gray400)
                            Text(step.sublabel)
                                .font(AppFont.regular(12))
                                .foregroundColor(isDone || isActive ? .gray500 : .gray300)
                        }
                        .padding(.top, 6)
                        Spacer()
                    }
                }
            }
        }
        .cardStyle()
    }

    // MARK: Events Card
    private func eventsCard(events: [ShipmentEvent]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Historique des événements")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            ForEach(Array(events.prefix(8).enumerated()), id: \.offset) { index, event in
                HStack(alignment: .top, spacing: 10) {
                    Circle()
                        .fill(index == 0 ? Color.orangePrimary : Color.gray300)
                        .frame(width: 8, height: 8)
                        .padding(.top, 6)

                    VStack(alignment: .leading, spacing: 2) {
                        if let status = event.status {
                            Text(statusLabel(status))
                                .font(AppFont.semiBold(13))
                                .foregroundColor(index == 0 ? .orangePrimary : .gray700)
                        }
                        if let note = event.note, !note.isEmpty {
                            Text(note)
                                .font(AppFont.regular(12))
                                .foregroundColor(.gray500)
                        }
                        if let date = event.createdAt {
                            Text(formatDateTime(date))
                                .font(AppFont.regular(11))
                                .foregroundColor(.gray400)
                        }
                    }
                    Spacer()
                }
                .padding(10)
                .background(index == 0 ? Color.orangePrimary.opacity(0.06) : Color.gray50)
                .cornerRadius(10)
            }
        }
        .cardStyle()
    }

    // MARK: Contacts Card
    private func contactsCard(shipment: ShipmentDto) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Expéditeur & Destinataire")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            HStack(alignment: .top, spacing: 12) {
                contactBlock(
                    icon: "arrow.up.circle.fill",
                    color: .blueInfo,
                    title: "Expéditeur",
                    name: shipment.senderName ?? "—",
                    commune: shipment.senderCommune ?? "—",
                    phone: shipment.senderPhone
                )

                Divider()

                contactBlock(
                    icon: "arrow.down.circle.fill",
                    color: .orangePrimary,
                    title: "Destinataire",
                    name: shipment.recipientName ?? "—",
                    commune: shipment.recipientCommune ?? "—",
                    phone: shipment.recipientPhone
                )
            }
        }
        .cardStyle()
    }

    private func contactBlock(icon: String, color: Color, title: String, name: String, commune: String, phone: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(AppFont.semiBold(12))
                .foregroundColor(color)
            Text(name)
                .font(AppFont.bold(13))
                .foregroundColor(.gray900)
            Text(commune)
                .font(AppFont.regular(12))
                .foregroundColor(.gray500)
            if let phone = phone {
                Text(phone)
                    .font(AppFont.regular(12))
                    .foregroundColor(.gray700)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: Relay Card
    private func relayCard(relay: RelayPointDto, title: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(AppFont.bold(14))
                .foregroundColor(.gray900)
            Label(relay.name ?? "—", systemImage: "storefront.fill")
                .font(AppFont.medium(13))
                .foregroundColor(.purpleRelay)
            if let address = relay.address {
                Label(address, systemImage: "location.fill")
                    .font(AppFont.regular(12))
                    .foregroundColor(.gray500)
            }
            if let phone = relay.phone {
                Label(phone, systemImage: "phone.fill")
                    .font(AppFont.regular(12))
                    .foregroundColor(.gray700)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    // MARK: Package Details Card
    private func packageDetailsCard(shipment: ShipmentDto) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Détails du colis")
                .font(AppFont.bold(15))
                .foregroundColor(.gray900)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                detailCell(label: "Format", value: packageSizeLabel(shipment.packageSize))
                detailCell(label: "Poids", value: shipment.weight.map { "\(String(format: "%.1f", $0)) kg" } ?? "—")
                detailCell(label: "Prix", value: shipment.price.map { "\(Int($0)) FCFA" } ?? "—", valueColor: .orangePrimary)
                detailCell(label: "Paiement", value: paymentLabel(shipment.paymentMethod))
            }
        }
        .cardStyle()
        .padding(.bottom, 8)
    }

    private func detailCell(label: String, value: String, valueColor: Color = .gray900) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(AppFont.regular(12))
                .foregroundColor(.gray500)
            Text(value)
                .font(AppFont.bold(14))
                .foregroundColor(valueColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.gray50)
        .cornerRadius(10)
    }

    // MARK: Helpers
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

    private func formatDateTime(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = f.date(from: iso) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "fr_FR")
            df.dateFormat = "dd/MM/yyyy HH:mm"
            return df.string(from: date)
        }
        return String(iso.prefix(16))
    }

    private func packageSizeLabel(_ size: String?) -> String {
        switch size {
        case "small": return "Petit"
        case "large": return "Grand"
        default: return "Moyen"
        }
    }

    private func paymentLabel(_ method: String?) -> String {
        switch method {
        case "relay_cash": return "Espèces au relais"
        case "online", "paystack": return "Paiement en ligne"
        default: return method ?? "—"
        }
    }
}

func statusLabel(_ status: String) -> String {
    switch status.uppercased() {
    case "READY_FOR_DROP_OFF": return "Prêt pour dépôt"
    case "RELAY_ORIGIN_RECEIVED": return "Reçu au relais départ"
    case "CARRIER_COLLECTED": return "Collecté par transporteur"
    case "IN_TRANSIT": return "En transit"
    case "RELAY_FINAL_RECEIVED": return "Reçu au relais arrivée"
    case "AVAILABLE_FOR_PICKUP": return "Disponible au retrait"
    case "PICKED_UP_BY_CUSTOMER": return "Retiré par le client"
    case "DELIVERED": return "Livré"
    case "CANCELLED": return "Annulé"
    case "RETURN_TO_SENDER": return "Retour expéditeur"
    default: return status.replacingOccurrences(of: "_", with: " ").capitalized
    }
}
