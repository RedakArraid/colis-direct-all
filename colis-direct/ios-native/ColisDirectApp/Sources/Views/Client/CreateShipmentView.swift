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
    @State private var senderQuartier = ""
    @State private var senderAddress = ""
    @State private var senderEditing = false
    @State private var selectedShippingAddressId: String? = nil

    // Recipient fields
    @State private var recipientName = ""
    @State private var recipientPhone = ""
    @State private var recipientCommune = ""
    @State private var recipientQuartier = ""
    @State private var recipientAddress = ""
    @State private var showAddressBook = false
    @State private var saveRecipientToAddressBook = false

    // Package fields
    @State private var packageSize = "moyen"
    @State private var weight = 1.0
    @State private var deliveryMode = "relay_to_relay"
    @State private var paymentMethod = "relay_cash"
    @State private var selectedDeliveryRelayId: String? = nil

    // Address data loaded from API
    @State private var shippingAddresses: [ShippingAddressDto] = []
    @State private var recipientAddresses: [RecipientAddressDto] = []
    @State private var loadingAddresses = false
    @State private var createdShipment: ShipmentDto? = nil

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
            return !senderName.isEmpty && !senderPhone.isEmpty && !senderCommune.isEmpty && !senderQuartier.isEmpty && !senderAddress.isEmpty
        case .recipient:
            return !recipientName.isEmpty && !recipientPhone.isEmpty && !recipientCommune.isEmpty && !recipientQuartier.isEmpty && !recipientAddress.isEmpty
        case .package:
            let needsDelivery = (deliveryMode == "relay_to_relay" || deliveryMode == "home_to_relay")
            if needsDelivery && selectedDeliveryRelayId == nil { return false }
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
                updateDefaultRelaySelection()
                recalculatePrice()
            }
            .onChange(of: packageSize) { _ in recalculatePrice() }
            .onChange(of: weight) { _ in recalculatePrice() }
            .onChange(of: senderCommune) { _ in
                updateDefaultRelaySelection()
                recalculatePrice()
            }
            .onChange(of: recipientCommune) { _ in
                updateDefaultRelaySelection()
                recalculatePrice()
            }
            .onChange(of: deliveryMode) { newMode in
                let needsDelivery = (newMode == "relay_to_relay" || newMode == "home_to_relay")
                if needsDelivery {
                    let filtered = relayVM.relayPoints.filter { $0.commune?.lowercased() == recipientCommune.lowercased() }
                    selectedDeliveryRelayId = filtered.first?.id ?? relayVM.relayPoints.first?.id
                } else {
                    selectedDeliveryRelayId = nil
                }
                recalculatePrice()
            }
        }
        .sheet(isPresented: $showAddressBook) {
            addressBookSheet
        }
        .sheet(item: $createdShipment) { shipment in
            PaymentFlowView(shipment: shipment, user: user, vm: vm)
                .onDisappear {
                    dismiss()
                }
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
        // Auto-fill address from default shipping address
        if senderCommune.isEmpty {
            if let addr = defaultShippingAddress, let c = addr.commune, !c.isEmpty {
                senderCommune = c
                senderQuartier = addr.quartier ?? ""
                senderAddress = addr.address ?? ""
                selectedShippingAddressId = addr.id
            } else if let firstAddr = shippingAddresses.first, let c = firstAddr.commune, !c.isEmpty {
                senderCommune = c
                senderQuartier = firstAddr.quartier ?? ""
                senderAddress = firstAddr.address ?? ""
                selectedShippingAddressId = firstAddr.id
            } else {
                senderCommune = "Abidjan" // Default fallback commune de départ
                senderQuartier = ""
                senderAddress = ""
                selectedShippingAddressId = nil
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
                CdTextField(label: "Quartier de départ", text: $senderQuartier, placeholder: "Ex: Cocody Centre")
                CdTextField(label: "Adresse précise", text: $senderAddress, placeholder: "Ex: Rue des Jardins, en face de la pharmacie")
                
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
                        let selected = selectedShippingAddressId == addr.id
                        Button(action: {
                            senderCommune = addr.commune ?? ""
                            senderQuartier = addr.quartier ?? ""
                            senderAddress = addr.address ?? ""
                            selectedShippingAddressId = addr.id
                        }) {
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
            CdTextField(label: "Quartier d'arrivée", text: $recipientQuartier, placeholder: "Ex: Angré Oscars")
            CdTextField(label: "Adresse précise", text: $recipientAddress, placeholder: "Ex: En face de la pharmacie principale")

            if user != nil {
                Toggle(isOn: $saveRecipientToAddressBook) {
                    Text("Ajouter ce destinataire à mon carnet d'adresses")
                        .font(AppFont.regular(13))
                        .foregroundColor(.gray900)
                }
                .tint(.orangePrimary)
                .padding(.top, 4)
            }
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
                    ForEach([("Petit", "petit"), ("Moyen", "moyen"), ("Grand", "grand")], id: \.0) { label, value in
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
                
                if pricingVM.isLoading {
                    HStack(spacing: 8) {
                        ProgressView().tint(.orangePrimary)
                        Text("Calcul des tarifs…").font(AppFont.medium(14)).foregroundColor(.gray500)
                    }
                    .padding(.vertical, 8)
                } else if let errorMsg = pricingVM.error {
                    Text(errorMsg)
                        .font(AppFont.regular(12))
                        .foregroundColor(.red)
                        .padding(.vertical, 4)
                }
                
                VStack(spacing: 10) {
                    ForEach([
                        ("relay_to_relay", "Relais → Relais", "storefront.fill", Color.purpleRelay),
                        ("home_to_relay", "Dom. → Relais", "house.fill", Color.blueInfo),
                        ("relay_to_home", "Relais → Dom.", "house.fill", Color.greenSuccess),
                        ("home_to_home", "Dom. → Dom.", "house.fill", Color.orangePrimary),
                    ], id: \.0) { value, label, icon, color in
                        let pricingResultMode = pricingVM.result?.modes.first(where: { $0.key == value })
                        let isAvailable = pricingResultMode?.available ?? true
                        
                        // Hide home_to_home if not returned in modes list (distance > 50km)
                        if value != "home_to_home" || pricingVM.result?.modes.contains(where: { $0.key == "home_to_home" }) == true {
                            Button(action: {
                                if isAvailable {
                                    deliveryMode = value
                                }
                            }) {
                                HStack(spacing: 12) {
                                    Image(systemName: icon)
                                        .font(.system(size: 18))
                                        .foregroundColor(isAvailable ? color : .gray300)
                                        .frame(width: 24)
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(label)
                                            .font(AppFont.medium(14))
                                            .foregroundColor(isAvailable ? .gray900 : .gray400)
                                        
                                        if let delay = pricingResultMode?.delay {
                                            Text(delay)
                                                .font(AppFont.regular(11))
                                                .foregroundColor(.gray400)
                                        }
                                    }
                                    
                                    Spacer()
                                    
                                    if let modePrice = pricingResultMode {
                                        VStack(alignment: .trailing, spacing: 2) {
                                            HStack(spacing: 4) {
                                                Text("\(Int(modePrice.finalPriceFcfa))")
                                                    .font(AppFont.extraBold(16))
                                                    .foregroundColor(isAvailable ? (deliveryMode == value ? .orangePrimary : .gray900) : .gray400)
                                                Text("FCFA")
                                                    .font(AppFont.medium(10))
                                                    .foregroundColor(isAvailable ? .gray500 : .gray400)
                                            }
                                            
                                            if modePrice.discountPercent > 0 {
                                                HStack(spacing: 4) {
                                                    Text("\(Int(modePrice.standardPriceFcfa))")
                                                        .font(AppFont.regular(11))
                                                        .foregroundColor(.gray400)
                                                        .strikethrough()
                                                    Text("-\(Int(modePrice.discountPercent))%")
                                                        .font(AppFont.bold(10))
                                                        .foregroundColor(.greenSuccess)
                                                }
                                            }
                                        }
                                    } else {
                                        Text("—")
                                            .font(AppFont.medium(14))
                                            .foregroundColor(.gray400)
                                    }
                                    
                                    if deliveryMode == value && isAvailable {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.orangePrimary)
                                            .font(.system(size: 18))
                                    }
                                }
                                .padding(14)
                                .background(deliveryMode == value ? Color.orangePrimary.opacity(0.06) : Color.white)
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(deliveryMode == value ? Color.orangePrimary : Color.gray200, lineWidth: 1.5)
                                )
                                .shadow(color: Color.black.opacity(0.02), radius: 4, y: 2)
                            }
                            .buttonStyle(.plain)
                            .disabled(!isAvailable)
                            .opacity(isAvailable ? 1.0 : 0.5)
                        }
                    }
                }
            }



            if deliveryMode == "relay_to_relay" || deliveryMode == "home_to_relay" {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Relais d'arrivée (Retrait)").font(AppFont.medium(13)).foregroundColor(.gray900)
                    let filtered = relayVM.relayPoints.filter { $0.commune?.lowercased() == recipientCommune.lowercased() }
                    Menu {
                        if filtered.isEmpty {
                            ForEach(relayVM.relayPoints) { r in
                                Button("\(r.name ?? "Relais") (\(r.commune ?? ""))") {
                                    selectedDeliveryRelayId = r.id
                                }
                            }
                        } else {
                            ForEach(filtered) { r in
                                Button(r.name ?? "Relais") {
                                    selectedDeliveryRelayId = r.id
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.down.circle.fill").foregroundColor(.purpleRelay).font(.system(size: 14))
                            let selectedName = relayVM.relayPoints.first(where: { $0.id == selectedDeliveryRelayId })?.name
                            Text(selectedName ?? "Choisir le relais d'arrivée")
                                .font(AppFont.regular(14))
                                .foregroundColor(selectedDeliveryRelayId == nil ? .gray400 : .gray900)
                            Spacer()
                            Image(systemName: "chevron.down").font(.system(size: 12)).foregroundColor(.gray500)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 14)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(selectedDeliveryRelayId == nil && canProceed ? Color.orangePrimary : Color.gray300, lineWidth: 1.5))
                        .cornerRadius(12)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Mode de paiement").font(AppFont.medium(13)).foregroundColor(.gray900)
                VStack(spacing: 8) {
                    ForEach([("relay_cash", "Paiement lors de la prise en charge"), ("paystack", "Paiement en ligne")], id: \.0) { value, label in
                        Button(action: { paymentMethod = value }) {
                            Text(label)
                                .font(AppFont.semiBold(13))
                                .foregroundColor(paymentMethod == value ? .white : .gray700)
                                .frame(maxWidth: .infinity).padding(.vertical, 12)
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
        VStack(alignment: .leading, spacing: 20) {
            stepHeader(title: "Confirmation", subtitle: "Vérifiez avant de créer l'envoi",
                       icon: "checkmark.circle.fill", color: .greenSuccess)

            VStack(spacing: 0) {
                // Section Expéditeur
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "arrow.up.circle.fill").foregroundColor(.blueInfo)
                        Text("Expéditeur").font(AppFont.bold(14)).foregroundColor(.gray900)
                    }
                    Text(senderName)
                        .font(AppFont.medium(14)).foregroundColor(.gray700)
                    Text("Tél: \(senderPhone)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                    Text("Commune: \(senderCommune), \(senderQuartier)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                    Text("Adresse: \(senderAddress)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                
                Divider()

                // Section Destinataire
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "arrow.down.circle.fill").foregroundColor(.orangePrimary)
                        Text("Destinataire").font(AppFont.bold(14)).foregroundColor(.gray900)
                    }
                    Text(recipientName)
                        .font(AppFont.medium(14)).foregroundColor(.gray700)
                    Text("Tél: \(recipientPhone)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                    Text("Commune: \(recipientCommune), \(recipientQuartier)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                    Text("Adresse: \(recipientAddress)")
                        .font(AppFont.regular(13)).foregroundColor(.gray500)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)

                Divider()

                // Section Colis & Livraison
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "shippingbox.fill").foregroundColor(.purpleRelay)
                        Text("Colis & Mode de livraison").font(AppFont.bold(14)).foregroundColor(.gray900)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Format:").font(AppFont.regular(13)).foregroundColor(.gray500)
                            Spacer()
                            Text(packageSizeLabel(packageSize)).font(AppFont.medium(13)).foregroundColor(.gray700)
                        }
                        HStack {
                            Text("Poids:").font(AppFont.regular(13)).foregroundColor(.gray500)
                            Spacer()
                            Text(String(format: "%.1f kg", weight)).font(AppFont.medium(13)).foregroundColor(.gray700)
                        }
                        HStack {
                            Text("Mode:").font(AppFont.regular(13)).foregroundColor(.gray500)
                            Spacer()
                            Text(deliveryModeLabel(deliveryMode)).font(AppFont.medium(13)).foregroundColor(.gray700)
                        }
                        
                        if deliveryMode == "relay_to_relay" || deliveryMode == "relay_to_home" {
                            HStack {
                                Text("Dépôt:").font(AppFont.regular(13)).foregroundColor(.gray500)
                                Spacer()
                                Text("Libre (n'importe quel relais)").font(AppFont.medium(13)).foregroundColor(.gray700)
                            }
                        }
                        if let deliveryId = selectedDeliveryRelayId,
                           let r = relayVM.relayPoints.first(where: { $0.id == deliveryId }) {
                            HStack {
                                Text("Retrait:").font(AppFont.regular(13)).foregroundColor(.gray500)
                                Spacer()
                                Text(r.name ?? "Relais").font(AppFont.medium(13)).foregroundColor(.gray700)
                            }
                        }
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)

                Divider()

                // Section Paiement & Tarif
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "creditcard.fill").foregroundColor(.greenSuccess)
                        Text("Règlement").font(AppFont.bold(14)).foregroundColor(.gray900)
                    }
                    
                    Text(paymentMethod == "relay_cash" ? "Paiement lors de la prise en charge" : "Paiement en ligne")
                        .font(AppFont.medium(13)).foregroundColor(.gray700)
                    
                    if let pricingResult = pricingVM.result,
                       let selectedModeObj = pricingResult.modes.first(where: { $0.key == deliveryMode }) {
                        
                        VStack(spacing: 4) {
                            if selectedModeObj.discountPercent > 0 {
                                HStack {
                                    Text("Tarif standard").font(AppFont.regular(13)).foregroundColor(.gray500)
                                    Spacer()
                                    Text("\(Int(selectedModeObj.standardPriceFcfa)) FCFA").font(AppFont.regular(13)).foregroundColor(.gray500).strikethrough()
                                }
                                HStack {
                                    Text("Remise (\(Int(selectedModeObj.discountPercent))%)").font(AppFont.regular(13)).foregroundColor(.greenSuccess)
                                    Spacer()
                                    Text("-\(Int(selectedModeObj.discountAmountFcfa)) FCFA").font(AppFont.regular(13)).foregroundColor(.greenSuccess)
                                }
                            }
                            
                            HStack {
                                Text("Total à payer").font(AppFont.bold(15)).foregroundColor(.gray900)
                                Spacer()
                                Text("\(Int(selectedModeObj.finalPriceFcfa)) FCFA")
                                    .font(AppFont.extraBold(20)).foregroundColor(.orangePrimary)
                            }
                            .padding(.top, 4)
                        }
                    } else if pricingVM.isLoading {
                        ProgressView().tint(.orangePrimary).padding(.vertical, 4)
                    }
                }
                .padding(14)
                .background(Color.orangePrimary.opacity(0.03))
            }
            .background(Color.white)
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray200, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.02), radius: 6, y: 3)

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
                            recipientQuartier = contact.quartier ?? ""
                            recipientAddress = contact.address ?? ""
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
        switch s { case "petit": return "Petit"; case "grand": return "Grand"; default: return "Moyen" }
    }

    private func deliveryModeLabel(_ m: String) -> String {
        switch m {
        case "relay_to_relay": return "Relais → Relais (Dépôt & Retrait en relais)"
        case "home_to_relay": return "Domicile → Relais (Ramassage & Retrait en relais)"
        case "relay_to_home": return "Relais → Domicile (Dépôt en relais & Livraison à domicile)"
        case "home_to_home": return "Domicile → Domicile (Ramassage & Livraison à domicile)"
        default: return m
        }
    }

    private func submitShipment() {
        let isHomePickup = (deliveryMode == "home_to_home" || deliveryMode == "home_to_relay")
        let isHomeDelivery = (deliveryMode == "home_to_home" || deliveryMode == "relay_to_home")
        
        let senderParts = senderName.split(separator: " ", maxSplits: 1).map(String.init)
        let senderFirst = senderParts.first ?? senderName
        let senderLast = senderParts.count > 1 ? senderParts.last! : ""

        let recipientParts = recipientName.split(separator: " ", maxSplits: 1).map(String.init)
        let recipientFirst = recipientParts.first ?? recipientName
        let recipientLast = recipientParts.count > 1 ? recipientParts.last! : ""

        let req = CreateShipmentRequest(
            senderFirstName: senderFirst,
            senderLastName: senderLast,
            senderEmail: user?.email,
            senderPhone: senderPhone,
            senderCommune: senderCommune,
            senderQuartier: senderQuartier,
            senderAddress: senderAddress,
            recipientFirstName: recipientFirst,
            recipientLastName: recipientLast,
            recipientEmail: nil,
            recipientPhone: recipientPhone,
            recipientCommune: recipientCommune,
            recipientQuartier: recipientQuartier,
            recipientAddress: recipientAddress,
            packageType: packageSize,
            gridType: "colis",
            weight: weight,
            homeDelivery: isHomeDelivery,
            pickupMethod: isHomePickup ? "home_pickup" : "relay_deposit",
            originRelayId: nil,
            destinationRelayId: isHomeDelivery ? nil : selectedDeliveryRelayId,
            paymentMethod: paymentMethod,
            paymentStatus: "pending"
        )
        
        if saveRecipientToAddressBook && user != nil {
            let addrReq = CreateRecipientAddressRequest(
                label: "\(recipientFirst) \(recipientLast)".trimmingCharacters(in: .whitespacesAndNewlines),
                firstName: recipientFirst,
                lastName: recipientLast,
                email: nil,
                phone: recipientPhone,
                commune: recipientCommune,
                quartier: recipientQuartier,
                address: recipientAddress,
                isDefault: false
            )
            Task {
                try? await APIService.shared.createRecipientAddress(addrReq)
            }
        }

        Task {
            do {
                let created = try await vm.createShipment(req)
                self.createdShipment = created
            } catch {
                // error is handled inside vm
            }
        }
    }

    private func recalculatePrice() {
        guard !senderCommune.isEmpty, !recipientCommune.isEmpty else { return }
        pricingVM.senderCommune = senderCommune
        pricingVM.recipientCommune = recipientCommune
        pricingVM.packageSize = packageSize
        pricingVM.weight = weight
        Task {
            await pricingVM.calculate()
        }
    }

    private func updateDefaultRelaySelection() {
        let needsDelivery = (deliveryMode == "relay_to_relay" || deliveryMode == "home_to_relay")
        if needsDelivery && selectedDeliveryRelayId == nil {
            let filtered = relayVM.relayPoints.filter { $0.commune?.lowercased() == recipientCommune.lowercased() }
            selectedDeliveryRelayId = filtered.first?.id ?? relayVM.relayPoints.first?.id
        }
    }
}
