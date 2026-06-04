import SwiftUI
import SafariServices

// MARK: - PaymentFlowView
struct PaymentFlowView: View {
    let shipment: ShipmentDto
    let user: UserDto?
    @ObservedObject var vm: ClientViewModel
    @Environment(\.dismiss) var dismiss

    enum PaymentStep {
        case methodSelection
        case mobileMoney(operatorName: String, opId: String, color: Color)
        case card
        case success(isRelayCash: Bool)
    }

    @State private var currentStep: PaymentStep = .methodSelection
    @State private var selectedMethodId = "om"
    @State private var phone = ""
    @State private var cardNumber = ""
    @State private var cardName = ""
    @State private var cardExpiry = ""
    @State private var cardCvv = ""
    @State private var saveCard = false
    
    @State private var showSafari = false
    @State private var paymentUrl: URL? = nil
    @State private var lastRef: String? = nil

    init(shipment: ShipmentDto, user: UserDto?, vm: ClientViewModel) {
        self.shipment = shipment
        self.user = user
        self.vm = vm
        _phone = State(initialValue: shipment.senderPhone ?? user?.phone ?? "")
        _cardName = State(initialValue: user?.fullName ?? "")
    }

    var isSuccessStep: Bool {
        if case .success = currentStep {
            return true
        }
        return false
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            if !isSuccessStep {
                HStack {
                    Button(action: {
                        goBack()
                    }) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.gray900)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Text("Paiement")
                        .font(AppFont.bold(17))
                        .foregroundColor(.gray900)
                    
                    Spacer()
                    
                    Color.clear
                        .frame(width: 44, height: 44)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 10)
                .background(Color.white)
                .overlay(
                    VStack {
                        Spacer()
                        Divider()
                    }
                )
            }
            
            // Content
            switch currentStep {
            case .methodSelection:
                methodSelectionView
            case .mobileMoney(let name, let opId, let color):
                mobileMoneyView(operatorName: name, opId: opId, color: color)
            case .card:
                cardView
            case .success(let isRelayCash):
                successView(isRelayCash: isRelayCash)
            }
        }
        .background(Color.white)
        .sheet(isPresented: $showSafari, onDismiss: {
            if let ref = lastRef {
                Task {
                    await vm.verifyPayment(reference: ref, trackingNumber: shipment.trackingNumber)
                }
            }
        }) {
            if let url = paymentUrl {
                SafariView(url: url)
            }
        }
    }

    func goBack() {
        switch currentStep {
        case .methodSelection:
            dismiss()
        case .mobileMoney, .card:
            currentStep = .methodSelection
        case .success:
            dismiss()
        }
    }

    func formatPrice(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.groupingSeparator = " "
        formatter.numberStyle = .decimal
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? String(format: "%.0f", amount)
        return "\(formatted) FCFA"
    }

    // MARK: - 1. Selection View
    var methodSelectionView: some View {
        ScrollView {
            VStack(spacing: 16) {
                // PmAmount card
                VStack(spacing: 12) {
                    HStack {
                        let route = "\(shipment.senderCommune ?? "") → \(shipment.recipientCommune ?? "")"
                        Text(route)
                            .font(AppFont.regular(13))
                            .foregroundColor(.gray700)
                        Spacer()
                        Text(formatPrice(shipment.price ?? 0.0))
                            .font(AppFont.semiBold(13))
                            .foregroundColor(.gray900)
                    }
                    Divider()
                        .background(Color.orangePrimary.opacity(0.3))
                    HStack {
                        Text("Total à payer")
                            .font(AppFont.bold(14))
                            .foregroundColor(.gray900)
                        Spacer()
                        Text(formatPrice(shipment.price ?? 0.0))
                            .font(AppFont.extraBold(22))
                            .foregroundColor(.orangePrimary)
                    }
                }
                .padding()
                .background(Color.orangePrimary.opacity(0.1))
                .cornerRadius(14)
                
                Text("Choisissez un moyen de paiement")
                    .font(AppFont.bold(13))
                    .foregroundColor(.gray900)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                // Methods list
                VStack(spacing: 10) {
                    methodRow(id: "om", name: "Orange Money", desc: "Paiement instantané", logoName: "OM", color: Color(hex: "#FF7900"))
                    methodRow(id: "mtn", name: "MTN MoMo", desc: "Paiement instantané", logoName: "MTN", color: Color(hex: "#FFCC00"))
                    methodRow(id: "wave", name: "Wave", desc: "Paiement instantané", logoName: "W", color: Color(hex: "#1DC8FF"))
                    methodRow(id: "moov", name: "Moov Money", desc: "Paiement instantané", logoName: "Moov", color: Color(hex: "#0066B3"))
                    methodRow(id: "card", name: "Carte bancaire", desc: "Visa, Mastercard", logoName: "CB", color: .gray500)
                    methodRow(id: "cash", name: "Espèces à la livraison", desc: "Payé par le destinataire", logoName: "ESP", color: .greenSuccess)
                }
                
                HStack(spacing: 8) {
                    Image(systemName: "shield.checkmark.fill")
                        .foregroundColor(.greenSuccess)
                        .font(.system(size: 16))
                    Text("Paiement 100% sécurisé et chiffré")
                        .font(AppFont.regular(12))
                        .foregroundColor(.gray500)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 8)
                
                Button(action: {
                    handleContinueSelection()
                }) {
                    Text("Continuer")
                        .font(AppFont.bold(15))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.orangePrimary)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .padding(.top, 10)
            }
            .padding()
        }
    }

    func methodRow(id: String, name: String, desc: String, logoName: String, color: Color) -> some View {
        let isSelected = selectedMethodId == id
        return Button(action: {
            selectedMethodId = id
        }) {
            HStack(spacing: 14) {
                // Operator square
                Text(logoName)
                    .font(AppFont.extraBold(11))
                    .foregroundColor(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.15))
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(AppFont.bold(14))
                        .foregroundColor(.gray900)
                    Text(desc)
                        .font(AppFont.regular(12))
                        .foregroundColor(.gray500)
                }
                Spacer()
                
                // Radio button circle
                Circle()
                    .stroke(isSelected ? Color.orangePrimary : Color.gray200, lineWidth: 2)
                    .frame(width: 22, height: 22)
                    .overlay(
                        Circle()
                            .fill(isSelected ? Color.orangePrimary : Color.clear)
                            .frame(width: 12, height: 12)
                    )
            }
            .padding(14)
            .background(isSelected ? Color.orangePrimary.opacity(0.08) : Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.orangePrimary : Color.gray200, lineWidth: 1.5)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    func handleContinueSelection() {
        switch selectedMethodId {
        case "card":
            currentStep = .card
        case "cash":
            Task {
                await vm.switchToRelayPayment(trackingNumber: shipment.trackingNumber)
            }
            currentStep = .success(isRelayCash: true)
        case "mtn":
            currentStep = .mobileMoney(operatorName: "MTN MoMo", opId: "mtn", color: Color(hex: "#FFCC00"))
        case "wave":
            currentStep = .mobileMoney(operatorName: "Wave", opId: "wave", color: Color(hex: "#1DC8FF"))
        case "moov":
            currentStep = .mobileMoney(operatorName: "Moov Money", opId: "moov", color: Color(hex: "#0066B3"))
        default: // Orange Money ("om")
            currentStep = .mobileMoney(operatorName: "Orange Money", opId: "om", color: Color(hex: "#FF7900"))
        }
    }

    // MARK: - 2. Mobile Money View
    func mobileMoneyView(operatorName: String, opId: String, color: Color) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Text(operatorName.prefix(2).uppercased())
                        .font(AppFont.extraBold(18))
                        .foregroundColor(color)
                        .frame(width: 56, height: 56)
                        .background(color.opacity(0.2))
                        .cornerRadius(12)
                    
                    Text("Paiement \(operatorName)")
                        .font(AppFont.bold(18))
                        .foregroundColor(.gray900)
                    
                    Text("Vous recevrez une demande de confirmation sur votre téléphone")
                        .font(AppFont.regular(13))
                        .foregroundColor(.gray500)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding(.top, 10)
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Numéro \(operatorName)")
                        .font(AppFont.bold(12))
                        .foregroundColor(.gray500)
                    
                    HStack(spacing: 10) {
                        Text("+225")
                            .font(AppFont.bold(15))
                            .foregroundColor(.gray900)
                        Divider()
                            .frame(height: 20)
                        TextField("07 58 42 19 03", text: $phone)
                            .font(AppFont.bold(15))
                            .keyboardType(.phonePad)
                    }
                    .padding()
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.orangePrimary, lineWidth: 1.5)
                    )
                }
                
                // Instructions Card
                VStack(alignment: .leading, spacing: 12) {
                    Text("Comment ça marche")
                        .font(AppFont.bold(13))
                        .foregroundColor(.gray900)
                    
                    let steps = [
                        "Saisissez votre numéro \(operatorName)",
                        "Validez le montant de \(formatPrice(shipment.price ?? 0.0))",
                        "Confirmez avec votre code secret"
                    ]
                    
                    ForEach(0..<steps.count, id: \.self) { idx in
                        HStack(spacing: 12) {
                            Text("\(idx + 1)")
                                .font(AppFont.bold(12))
                                .foregroundColor(.white)
                                .frame(width: 24, height: 24)
                                .background(Color.orangePrimary)
                                .clipShape(Circle())
                            Text(steps[idx])
                                .font(AppFont.regular(13))
                                .foregroundColor(.gray700)
                        }
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.gray50)
                .cornerRadius(14)
                
                HStack {
                    Text("Montant")
                        .font(AppFont.regular(14))
                        .foregroundColor(.gray500)
                    Spacer()
                    Text(formatPrice(shipment.price ?? 0.0))
                        .font(AppFont.extraBold(26))
                        .foregroundColor(.orangePrimary)
                }
                .padding(.top, 10)
                
                if let err = vm.error {
                    Text(err)
                        .font(AppFont.medium(12))
                        .foregroundColor(.redDanger)
                }
                
                Button(action: {
                    startPaymentProcess()
                }) {
                    HStack {
                        if vm.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Ouvrir \(formatPrice(shipment.price ?? 0.0))")
                                .font(AppFont.bold(15))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(phone.count >= 8 && !vm.isLoading ? Color.orangePrimary : Color.orangePrimary.opacity(0.5))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .disabled(phone.count < 8 || vm.isLoading)
                
                Button(action: {
                    currentStep = .success(isRelayCash: false)
                    if let ref = lastRef {
                        Task {
                            await vm.verifyPayment(reference: ref, trackingNumber: shipment.trackingNumber)
                        }
                    }
                }) {
                    Text("J'ai terminé le paiement")
                        .font(AppFont.semiBold(14))
                        .foregroundColor(.orangePrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.orangePrimary, lineWidth: 1.5)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding()
        }
    }

    // MARK: - 3. Card View
    var cardView: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Card Graphic
                ZStack(alignment: .leading) {
                    LinearGradient.navyGradient
                        .cornerRadius(18)
                    
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text("ColisDirect")
                                .font(AppFont.extraBold(16))
                                .foregroundColor(.white)
                            Spacer()
                            Text("VISA")
                                .font(AppFont.extraBold(14))
                                .foregroundColor(.white)
                                .italic()
                        }
                        
                        RoundedRectangle(cornerRadius: 6)
                            .fill(LinearGradient(colors: [Color(hex: "#E6C36B"), Color(hex: "#C9A14A")], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 44, height: 32)
                            .padding(.top, 22)
                        
                        Text(cardNumber.isEmpty ? "•••• •••• •••• ••••" : cardNumber)
                            .font(.system(size: 19, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .tracking(2)
                            .padding(.top, 16)
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("TITULAIRE")
                                    .font(.system(size: 8))
                                    .foregroundColor(.white.opacity(0.6))
                                Text(cardName.isEmpty ? "VOTRE NOM" : cardName.uppercased())
                                    .font(AppFont.bold(12))
                                    .foregroundColor(.white)
                            }
                            Spacer()
                            VStack(alignment: .leading, spacing: 2) {
                                Text("EXPIRE")
                                    .font(.system(size: 8))
                                    .foregroundColor(.white.opacity(0.6))
                                Text(cardExpiry.isEmpty ? "MM/AA" : cardExpiry)
                                    .font(AppFont.bold(12))
                                    .foregroundColor(.white)
                            }
                        }
                        .padding(.top, 12)
                    }
                    .padding(22)
                }
                .frame(height: 180)
                
                VStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Numéro de carte")
                            .font(AppFont.medium(12))
                            .foregroundColor(.gray500)
                        TextField("5282 3456 7890 1289", text: $cardNumber)
                            .font(AppFont.semiBold(14))
                            .keyboardType(.numberPad)
                            .padding()
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray200, lineWidth: 1))
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Titulaire de la carte")
                            .font(AppFont.medium(12))
                            .foregroundColor(.gray500)
                        TextField("Axel M.", text: $cardName)
                            .font(AppFont.semiBold(14))
                            .padding()
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray200, lineWidth: 1))
                    }
                    
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Date d'expiration")
                                .font(AppFont.medium(12))
                                .foregroundColor(.gray500)
                            TextField("08 / 28", text: $cardExpiry)
                                .font(AppFont.semiBold(14))
                                .keyboardType(.numberPad)
                                .padding()
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray200, lineWidth: 1))
                        }
                        
                        VStack(alignment: .leading, spacing: 6) {
                            Text("CVV")
                                .font(AppFont.medium(12))
                                .foregroundColor(.gray500)
                            SecureField("•••", text: $cardCvv)
                                .font(AppFont.semiBold(14))
                                .keyboardType(.numberPad)
                                .padding()
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray200, lineWidth: 1))
                        }
                    }
                    
                    Toggle(isOn: $saveCard) {
                        Text("Enregistrer cette carte")
                            .font(AppFont.regular(13))
                            .foregroundColor(.gray900)
                    }
                    .tint(.orangePrimary)
                    .padding(.top, 4)
                }
                
                if let err = vm.error {
                    Text(err)
                        .font(AppFont.medium(12))
                        .foregroundColor(.redDanger)
                }
                
                Button(action: {
                    startPaymentProcess()
                }) {
                    HStack {
                        if vm.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Ouvrir le paiement sécurisé")
                                .font(AppFont.bold(15))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(cardNumber.count >= 12 && cardExpiry.count >= 4 && cardCvv.count >= 3 && !vm.isLoading ? Color.orangePrimary : Color.orangePrimary.opacity(0.5))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .disabled(cardNumber.count < 12 || cardExpiry.count < 4 || cardCvv.count < 3 || vm.isLoading)
                
                Button(action: {
                    currentStep = .success(isRelayCash: false)
                    if let ref = lastRef {
                        Task {
                            await vm.verifyPayment(reference: ref, trackingNumber: shipment.trackingNumber)
                        }
                    }
                }) {
                    Text("J'ai terminé le paiement")
                        .font(AppFont.semiBold(14))
                        .foregroundColor(.orangePrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.orangePrimary, lineWidth: 1.5)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding()
        }
    }

    // MARK: - 4. Receipt Success View
    func successView(isRelayCash: Bool) -> some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 20) {
                    // Success Banner
                    VStack(spacing: 12) {
                        Image(systemName: isRelayCash ? "shippingbox.fill" : (vm.paymentVerified == false ? "clock.fill" : "checkmark.circle.fill"))
                            .font(.system(size: 64))
                            .foregroundColor(.white)
                        
                        let displayTitle: String = {
                            if isRelayCash {
                                return "Colis enregistré"
                            } else if vm.paymentVerified == false {
                                return "Paiement en attente"
                            } else {
                                return "Paiement réussi !"
                            }
                        }()
                        
                        Text(displayTitle)
                            .font(AppFont.extraBold(22))
                            .foregroundColor(.white)
                        
                        let displaySubtitle: String = {
                            if isRelayCash {
                                return "Réglez lors du dépôt au point relais."
                            } else if vm.paymentVerified == false {
                                return "Le paiement n'a pas encore été validé par Paystack."
                            } else {
                                return "Votre envoi a été confirmé"
                            }
                        }()
                        
                        Text(displaySubtitle)
                            .font(AppFont.regular(14))
                            .foregroundColor(.white.opacity(0.9))
                        
                        Text(formatPrice(shipment.price ?? 0.0))
                            .font(AppFont.extraBold(34))
                            .foregroundColor(.white)
                            .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                    .background(isRelayCash || vm.paymentVerified == false ? Color.orangePrimary : Color.greenSuccess)
                    
                    VStack(spacing: 16) {
                        // Details block
                        VStack(spacing: 0) {
                            detailRow(label: "N° de suivi", value: shipment.trackingNumber, isOrange: true)
                            Divider()
                            detailRow(label: "Mode de paiement", value: isRelayCash ? "Espèces au relais" : (selectedMethodId == "card" ? "Carte bancaire" : "Mobile Money"))
                            Divider()
                            if let ref = lastRef {
                                detailRow(label: "N° de transaction", value: ref)
                                Divider()
                            }
                            let route = "\(shipment.senderCommune ?? "") → \(shipment.recipientCommune ?? "")"
                            detailRow(label: "Trajet", value: route)
                        }
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.gray200, lineWidth: 1))
                        .padding(.horizontal)
                        
                        // QR Code placeholder / instructions
                        HStack(spacing: 12) {
                            Image(systemName: "qrcode")
                                .font(.system(size: 36))
                                .foregroundColor(.orangePrimary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Reçu disponible")
                                    .font(AppFont.bold(13))
                                    .foregroundColor(.gray900)
                                Text("Présentez ce numéro de suivi au point relais")
                                    .font(AppFont.regular(12))
                                    .foregroundColor(.gray500)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Color.orangePrimary.opacity(0.1))
                        .cornerRadius(14)
                        .padding(.horizontal)
                    }
                }
            }
            .onAppear {
                if !isRelayCash, let ref = lastRef {
                    Task {
                        await vm.verifyPayment(reference: ref, trackingNumber: shipment.trackingNumber)
                    }
                }
            }
            
            // Footer buttons
            VStack(spacing: 10) {
                Button(action: {
                    dismiss()
                }) {
                    Text("Suivre mon colis")
                        .font(AppFont.bold(15))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.orangePrimary)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
                
                Button(action: {
                    dismiss()
                }) {
                    Text("Fermer")
                        .font(AppFont.bold(15))
                        .foregroundColor(.gray900)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Color.white)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray200, lineWidth: 1.5))
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
            .padding()
            .background(Color.white)
        }
    }

    func detailRow(label: String, value: String, isOrange: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(AppFont.regular(13))
                .foregroundColor(.gray500)
            Spacer()
            Text(value)
                .font(AppFont.bold(13))
                .foregroundColor(isOrange ? .orangePrimary : .gray900)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    func startPaymentProcess() {
        Task {
            if let result = await vm.initiatePaystackPayment(shipment: shipment, user: user) {
                if let url = URL(string: result.0) {
                    self.paymentUrl = url
                    self.lastRef = result.1
                    self.showSafari = true
                    self.currentStep = .success(isRelayCash: false)
                }
            }
        }
    }
}

// MARK: - SafariView (SFSafariViewController wrapper)
struct SafariView: UIViewControllerRepresentable {
    let url: URL
    
    func makeUIViewController(context: Context) -> SFSafariViewController {
        return SFSafariViewController(url: url)
    }
    
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
