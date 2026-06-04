import SwiftUI

// MARK: - Create Shipment View (Multi-step)
struct CreateShipmentView: View {
    @ObservedObject var vm: ClientViewModel
    var user: UserDto? = nil
    @Environment(\.dismiss) private var dismiss
    @StateObject private var relayVM = RelayPointsViewModel()
    @StateObject private var pricingVM = PricingViewModel()

    // Steps:
    // If logged in: 0=Destinataire, 1=Colis, 2=Confirmation
    // If guest: 0=Expéditeur, 1=Destinataire, 2=Colis, 3=Confirmation
    @State private var step = 0

    // Sender fields
    @State private var senderName = ""
    @State private var senderPhone = ""
    @State private var senderCommune = ""
    @State private var senderEditing = false

    // Recipient fields
    @State private var recipientName = ""
    @State private var recipientPhone = ""
    @State private var recipientCommune = ""
    @State private var showAddressBook = false

    // Package fields
    @State private var packageSize = "medium"
    @State private var weight = 1.0
    @State private var deliveryMode = "relay_to_relay"
    @State private var paymentMethod = "relay_cash"
    @State private var selectedPickupRelayId: String? = nil
    @State private var selectedDeliveryRelayId: String? = nil

    // Address data loaded from API
    @State private var shippingAddresses: [ShippingAddressDto] = []
    @State private var recipientAddresses: [RecipientAddressDto] = []
    @State private var loadingAddresses = false

    let communes = ["Abidjan", "Cocody", "Plateau", "Marcory", "Treichville", "Adjamé",
                    "Yopougon", "Abobo", "Bouaké", "San-Pédro", "Daloa", "Yamoussoukro",
                    "Dabou", "Grand-Bassam", "Bingerville", "Divo", "Gagnoa"]

    private var defaultShippingAddress: ShippingAddressDto? {
        shippingAddresses.first { $0.isDefault == true } ?? shippingAddresses.first
    }

    enum FormStep {
        case sender
        case recipient
        case package
        case confirmation
    }

    private var currentFormStep: FormStep {
        if user != nil {
            switch step {
            case 0: return .recipient
            case 1: return .package
            case 2: return .confirmation
            default: return .recipient
            }
        } else {
            switch step {
            case 0: return .sender
            case 1: return .recipient
            case 2: return .package
            case 3: return .confirmation
            default: return .sender
            }
        }
    }

    private var totalStepCount: Int {
        user != nil ? 3 : 4
    }

    var canProceed: Bool {
        switch currentFormStep {
        case .sender:
            return !senderName.isEmpty && !senderPhone.isEmpty && !senderCommune.isEmpty
        case .recipient:
            return !recipientName.isEmpty && !recipientPhone.isEmpty && !recipientCommune.isEmpty
        case .package:
            return true
        case .confirmation:
            return true
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                progressBar

                ScrollView {
                    VStack(spacing: 20) {
                        switch currentFormStep {
                        case .sender: senderForm
                        case .recipient: recipientForm
                        case .package: packageForm
                        case .confirmation: confirmationStep
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 24)
                }

                // Navigation buttons
                HStack(spacing: 12) {
                    if step > 0 {
                        Button(action: { step -= 1 }) {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                Text("Retour")
                            }
                            .font(AppFont.semiBold(15))
                            .foregroundColor(.gray700)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray300, lineWidth: 1.5))
                        }
                    }

                    if step < totalStepCount - 1 {
                        OrangeButton(title: "Suivant", icon: "chevron.right", isDisabled: !canProceed) {
                            if currentFormStep == .package {
                                pricingVM.senderCommune = senderCommune
                                pricingVM.recipientCommune = recipientCommune
                                pricingVM.packageSize = packageSize
                                pricingVM.weight = weight
                                Task {
                                    await pricingVM.calculate()
                                }
                            }
                            step += 1
                        }
                    } else {
                        OrangeButton(title: "Créer l'envoi", icon: "checkmark", isLoading: vm.isLoading) {
                            submitShipment()
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 8, y: -2)
            }
            .background(Color.gray50)
            .navigationTitle("Nouvel envoi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                        .font(AppFont.medium(15))
                        .foregroundColor(.gray700)
                }
            }
            .task {
                await relayVM.load()
                await loadAddresses()
            }
        }
        .sheet(isPresented: $showAddressBook) {
            addressBookSheet
        }
    }

    // MARK: - Load addresses from API
    private func loadAddresses() async {
        loadingAddresses = true
        do {
            async let sa = APIService.shared.getShippingAddresses()
            async let ra = APIService.shared.getRecipientAddresses()
            let (addresses, recipients) = try await (sa, ra)
            shippingAddresses = addresses
            recipientAddresses = recipients
        } catch {
            // Silently handle
        }
        prefillSender()
        loadingAddresses = false
    }

    private func prefillSender() {
        guard let u = user else { return }
        if senderName.isEmpty { senderName = u.fullName }
        if senderPhone.isEmpty { senderPhone = u.phone ?? "" }
        // Auto-fill commune from default shipping address
        if senderCommune.isEmpty {
            if let addr = defaultShippingAddress, let c = addr.commune, !c.isEmpty {
                senderCommune = c
            } else if let firstAddr = shippingAddresses.first, let c = firstAddr.commune, !c.isEmpty {
                senderCommune = c
            } else {
                senderCommune = "Abidjan" // Default fallback commune de départ
            }
        }
    }

    // MARK: Progress Bar
    private var progressBar: some View {
        let labels = user != nil ? ["Destinataire", "Colis", "Confirmation"] : ["Expéditeur", "Destinataire", "Colis", "Confirmation"]
        return VStack(spacing: 8) {
            HStack(spacing: 4) {
                ForEach(0..<totalStepCount, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(i <= step ? Color.orangePrimary : Color.gray200)
                        .frame(height: 4)
                }
            }
            .padding(.horizontal, 20)

            HStack {
                ForEach(Array(labels.enumerated()), id: \.offset) { i, label in
                    Text(label)
                        .font(AppFont.medium(10))
                        .foregroundColor(i == step ? .orangePrimary : .gray400)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.vertical, 12)
        .background(Color.white)
    }

    // MARK: Step 0 - Sender (skipped for logged-in users unless editing)
    private var senderForm: some View {
        VStack(alignment: .leading, spacing: 16) {
            stepHeader(title: "Expéditeur", subtitle: "Informations sur l'envoyeur",
                       icon: "arrow.up.circle.fill", color: .blueInfo)

            if user != nil && !senderEditing {
                // ── Pre-filled card ──
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(Color.orangePrimary.opacity(0.15)).frame(width: 48, height: 48)
                            Text(String((user?.firstName ?? "?").prefix(1)).uppercased())
                                .font(AppFont.bold(20)).foregroundColor(.orangePrimary)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(senderName).font(AppFont.semiBold(15)).foregroundColor(.gray900)
                            Text(senderPhone).font(AppFont.regular(13)).foregroundColor(.gray500)
                            if !senderCommune.isEmpty {
                                Label(senderCommune, systemImage: "location.fill")
                                    .font(AppFont.regular(12))
                                    .foregroundColor(.gray400)
                            }
                        }
                        Spacer()
                        Text("Moi").font(AppFont.bold(11)).foregroundColor(.orangePrimary)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Color.orangePrimary.opacity(0.1)).cornerRadius(20)
                    }
                    .padding(14)
                    .background(Color.white)
                    .cornerRadius(14)
                    .overlay(RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.orangePrimary.opacity(0.3), lineWidth: 1.5))

                    // Adresse d'expédition
                    if !shippingAddresses.isEmpty {
                        addressPickerSection
                    }

                    Button(action: { senderEditing = true }) {
                        HStack(spacing: 6) {
                            Image(systemName: "pencil")
                            Text("Envoyer au nom d'une autre personne")
                        }
                        .font(AppFont.medium(13))
                        .foregroundColor(.gray500)
                    }
                }
            } else {
                CdTextField(label: "Nom complet", text: $senderName, placeholder: "Jean Kouassi")
                CdTextField(label: "Téléphone", text: $senderPhone, placeholder: "07 XX XX XX XX",
                            leadingIcon: "phone.fill", keyboardType: .phonePad)
                communePicker(label: "Commune de départ", value: $senderCommune)
                if user != nil {
                    Button(action: { senderEditing = false; prefillSender() }) {
                        HStack(spacing: 6) {
                            Image(systemName: "arrow.uturn.left")
                            Text("Utiliser mes informations")
                        }
                        .font(AppFont.medium(13))
                        .foregroundColor(.orangePrimary)
                    }
                }
            }
        }
    }

    // Shipping address picker (commune auto-fill)
    private var addressPickerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Adresse de départ").font(AppFont.medium(13)).foregroundColor(.gray700)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(shippingAddresses) { addr in
                        let selected = addr.commune == senderCommune
                        Button(action: { senderCommune = addr.commune ?? senderCommune }) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(addr.commune ?? "—")
                                    .font(AppFont.semiBold(13))
                                    .foregroundColor(selected ? .white : .gray900)
                                if let q = addr.quartier {
                                    Text(q).font(AppFont.regular(11))
                                        .foregroundColor(selected ? .white.opacity(0.8) : .gray500)
                                }
                                if addr.isDefault == true {
                                    Text("Par défaut").font(AppFont.bold(10))
                                        .foregroundColor(selected ? .white.opacity(0.9) : .orangePrimary)
                                }
                            }
                            .padding(.horizontal, 12).padding(.vertical, 10)
                            .background(selected ? Color.orangePrimary : Color.white)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12)
                                .stroke(selected ? Color.clear : Color.gray200, lineWidth: 1.5))
                            .shadow(color: .black.opacity(0.04), radius: 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: Step 1 - Recipient
    private var recipientForm: some View {
        VStack(alignment: .leading, spacing: 16) {
            stepHeader(title: "Destinataire", subtitle: "Informations sur le receveur",
                       icon: "arrow.down.circle.fill", color: .orangePrimary)

            // Address book button (if logged in)
            if user != nil {
                Button(action: { showAddressBook = true }) {
                    HStack(spacing: 10) {
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.blueInfo)
                        Text("Choisir dans le carnet d'adresses")
                            .font(AppFont.semiBold(14))
                            .foregroundColor(.blueInfo)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12))
                            .foregroundColor(.blueInfo.opacity(0.6))
                    }
                    .padding(14)
                    .background(Color.blueInfo.opacity(0.07))
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.blueInfo.opacity(0.2), lineWidth: 1.5))
                }
                .buttonStyle(.plain)
            }

            // Manual form
            CdTextField(label: "Nom complet", text: $recipientName, placeholder: "Ama Koné")
            CdTextField(label: "Téléphone", text: $recipientPhone, placeholder: "05 XX XX XX XX",
                        leadingIcon: "phone.fill", keyboardType: .phonePad)
            communePicker(label: "Commune d'arrivée", value: $recipientCommune)
        }
    }

    // MARK: Step 2 - Package
    private var packageForm: some View {
        VStack(alignment: .leading, spacing: 16) {
            stepHeader(title: "Détails du colis", subtitle: "Format, poids et mode de livraison",
                       icon: "shippingbox.fill", color: .purpleRelay)

            VStack(alignment: .leading, spacing: 8) {
                Text("Format du colis").font(AppFont.medium(13)).foregroundColor(.gray900)
                HStack(spacing: 8) {
                    ForEach([("Petit", "small"), ("Moyen", "medium"), ("Grand", "large")], id: \.0) { label, value in
                        Button(action: { packageSize = value }) {
                            Text(label)
                                .font(AppFont.semiBold(13))
                                .foregroundColor(packageSize == value ? .white : .gray700)
                                .frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(packageSize == value ? Color.orangePrimary : Color.gray100)
                                .cornerRadius(10)
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Poids (kg)").font(AppFont.medium(13)).foregroundColor(.gray900)
                HStack {
                    Button(action: { if weight > 0.5 { weight -= 0.5 } }) {
                        Image(systemName: "minus.circle.fill").font(.system(size: 28)).foregroundColor(.orangePrimary)
                    }
                    Text(String(format: "%.1f kg", weight))
                        .font(AppFont.extraBold(20)).foregroundColor(.gray900).frame(minWidth: 80)
                    Button(action: { weight += 0.5 }) {
                        Image(systemName: "plus.circle.fill").font(.system(size: 28)).foregroundColor(.orangePrimary)
                    }
                }
                .frame(maxWidth: .infinity)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Mode de livraison").font(AppFont.medium(13)).foregroundColor(.gray900)
                VStack(spacing: 8) {
                    ForEach([
                        ("relay_to_relay", "Relais → Relais", "storefront.fill", Color.purpleRelay),
                        ("home_to_relay", "Dom. → Relais", "house.fill", Color.blueInfo),
                        ("relay_to_home", "Relais → Dom.", "house.fill", Color.greenSuccess),
                    ], id: \.0) { value, label, icon, color in
                        Button(action: { deliveryMode = value }) {
                            HStack(spacing: 10) {
                                Image(systemName: icon).foregroundColor(color)
                                Text(label).font(AppFont.medium(14)).foregroundColor(.gray900)
                                Spacer()
                                if deliveryMode == value {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.orangePrimary)
                                }
                            }
                            .padding(12)
                            .background(deliveryMode == value ? Color.orangePrimary.opacity(0.08) : Color.gray50)
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(
                                deliveryMode == value ? Color.orangePrimary : Color.gray200, lineWidth: 1.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Mode de paiement").font(AppFont.medium(13)).foregroundColor(.gray900)
                HStack(spacing: 8) {
                    ForEach([("relay_cash", "Espèces au relais"), ("paystack", "En ligne")], id: \.0) { value, label in
                        Button(action: { paymentMethod = value }) {
                            Text(label)
                                .font(AppFont.semiBold(12))
                                .foregroundColor(paymentMethod == value ? .white : .gray700)
                                .frame(maxWidth: .infinity).padding(.vertical, 10)
                                .background(paymentMethod == value ? Color.orangePrimary : Color.gray100)
                                .cornerRadius(10)
                        }
                    }
                }
            }
        }
    }

    // MARK: Step 3 - Confirmation
    private var confirmationStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            stepHeader(title: "Confirmation", subtitle: "Vérifiez avant de créer l'envoi",
                       icon: "checkmark.circle.fill", color: .greenSuccess)

            VStack(spacing: 12) {
                summaryRow(icon: "arrow.up.circle.fill", color: .blueInfo,
                           label: "Expéditeur", value: "\(senderName) · \(senderCommune)")
                summaryRow(icon: "arrow.down.circle.fill", color: .orangePrimary,
                           label: "Destinataire", value: "\(recipientName) · \(recipientCommune)")
                summaryRow(icon: "shippingbox.fill", color: .purpleRelay,
                           label: "Colis", value: "\(packageSizeLabel(packageSize)) · \(String(format: "%.1f", weight)) kg")
                summaryRow(icon: "creditcard.fill", color: .greenSuccess,
                           label: "Paiement", value: paymentMethod == "relay_cash" ? "Espèces au relais" : "En ligne")

                if let price = pricingVM.result {
                    Divider()
                    HStack {
                        Text("Tarif estimé").font(AppFont.bold(15)).foregroundColor(.gray900)
                        Spacer()
                        Text("\(Int(price.price)) FCFA").font(AppFont.extraBold(22)).foregroundColor(.orangePrimary)
                    }
                } else if pricingVM.isLoading {
                    HStack {
                        ProgressView().tint(.orangePrimary)
                        Text("Calcul du tarif…").font(AppFont.medium(14)).foregroundColor(.gray500)
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8)

            if let error = vm.error { ErrorBanner(message: error) }
        }
    }

    // MARK: - Address Book Sheet
    private var addressBookSheet: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if recipientAddresses.isEmpty {
                    EmptyStateView(icon: "person.2", title: "Carnet vide",
                                   subtitle: "Aucun contact enregistré.")
                } else {
                    List(recipientAddresses) { contact in
                        Button(action: {
                            recipientName = contact.fullName
                            recipientPhone = contact.phone ?? ""
                            recipientCommune = contact.commune ?? ""
                            showAddressBook = false
                        }) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle().fill(Color.orangePrimary.opacity(0.12)).frame(width: 44, height: 44)
                                    Text(String((contact.firstName ?? "?").prefix(1)).uppercased())
                                        .font(AppFont.bold(18)).foregroundColor(.orangePrimary)
                                }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(contact.fullName)
                                        .font(AppFont.semiBold(15)).foregroundColor(.gray900)
                                    Text(contact.displaySubtitle)
                                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                                    if let addr = contact.address, !addr.isEmpty {
                                        Text(addr).font(AppFont.regular(12)).foregroundColor(.gray400)
                                    }
                                }
                                Spacer()
                                if contact.isDefault == true {
                                    Image(systemName: "star.fill")
                                        .font(.system(size: 12))
                                        .foregroundColor(.orangePrimary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Carnet d'adresses")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { showAddressBook = false }
                        .font(AppFont.medium(15))
                        .foregroundColor(.gray700)
                }
            }
        }
    }

    // MARK: Helpers
    private func stepHeader(title: String, subtitle: String, icon: String, color: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 28)).foregroundColor(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(AppFont.bold(18)).foregroundColor(.gray900)
                Text(subtitle).font(AppFont.regular(13)).foregroundColor(.gray500)
            }
        }
    }

    private func communePicker(label: String, value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(AppFont.medium(13)).foregroundColor(.gray900)
            Menu {
                ForEach(communes, id: \.self) { c in
                    Button(c) { value.wrappedValue = c }
                }
            } label: {
                HStack {
                    Image(systemName: "location.fill").foregroundColor(.gray500).font(.system(size: 14))
                    Text(value.wrappedValue.isEmpty ? "Choisir une commune" : value.wrappedValue)
                        .font(AppFont.regular(14))
                        .foregroundColor(value.wrappedValue.isEmpty ? .gray400 : .gray900)
                    Spacer()
                    Image(systemName: "chevron.down").font(.system(size: 12)).foregroundColor(.gray500)
                }
                .padding(.horizontal, 14).padding(.vertical, 14)
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray300, lineWidth: 1.5))
                .cornerRadius(12)
            }
        }
    }

    private func summaryRow(icon: String, color: Color, label: String, value: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).foregroundColor(color).font(.system(size: 16)).frame(width: 24)
            VStack(alignment: .leading, spacing: 1) {
                Text(label).font(AppFont.regular(12)).foregroundColor(.gray500)
                Text(value).font(AppFont.medium(14)).foregroundColor(.gray900)
            }
            Spacer()
        }
    }

    private func packageSizeLabel(_ s: String) -> String {
        switch s { case "small": return "Petit"; case "large": return "Grand"; default: return "Moyen" }
    }

    private func submitShipment() {
        let req = CreateShipmentRequest(
            senderName: senderName,
            senderPhone: senderPhone,
            senderCommune: senderCommune,
            recipientName: recipientName,
            recipientPhone: recipientPhone,
            recipientCommune: recipientCommune,
            packageSize: packageSize,
            weight: weight,
            deliveryMode: deliveryMode,
            paymentMethod: paymentMethod,
            relayPickupId: selectedPickupRelayId,
            relayDeliveryId: selectedDeliveryRelayId
        )
        Task {
            do {
                _ = try await vm.createShipment(req)
                dismiss()
            } catch {
                // error is handled inside vm
            }
        }
    }
}
