import SwiftUI

// MARK: - Client Profile View
struct ClientProfileView: View {
    @ObservedObject var authVM: AuthViewModel
    @ObservedObject var clientVM: ClientViewModel
    var transporterVM: TransporterViewModel?
    var relayVM: RelayViewModel?

    @State private var showLogoutConfirm = false
    @State private var showPickupScan = false
    @State private var showHomePickup = false
    @State private var showIntakeScan = false
    @State private var showDeliveryConfirm = false
    @State private var showAbout = false
    @State private var showTarifs = false

    var user: UserDto? { authVM.state.user }
    var role: String { user?.role.lowercased() ?? "" }

    // Stats from clientVM shipments (only for client)
    private var totalShipments: Int {
        clientVM.shipments.count
    }
    private var deliveredCount: Int {
        clientVM.shipments.filter { $0.currentStatus == "DELIVERED" }.count
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                profileHeader
                
                VStack(spacing: 20) {
                    // Stats for client
                    if role == "client" {
                        statsRow
                    }

                    // Transporter specific actions
                    if role == "transporter" {
                        menuSection(title: "ACTIONS TRANSPORTEUR") {
                            menuRow(
                                icon: "qrcode.viewfinder",
                                color: .blueInfo,
                                title: "Scanner un colis",
                                subtitle: "Collecte d'un colis au relais"
                            ) { showPickupScan = true }
                            Divider().padding(.leading, 60)
                            menuRow(
                                icon: "house.fill",
                                color: .greenSuccess,
                                title: "Ramassage à domicile",
                                subtitle: "Collecte chez l'expéditeur"
                            ) { showHomePickup = true }
                        }
                    }

                    // Relay specific actions
                    if role == "relay_partner" {
                        menuSection(title: "ACTIONS RELAIS") {
                            menuRow(
                                icon: "barcode.viewfinder",
                                color: .purpleRelay,
                                title: "Réception colis",
                                subtitle: "Scanner un colis entrant"
                            ) { showIntakeScan = true }
                            Divider().padding(.leading, 60)
                            menuRow(
                                icon: "checkmark.circle.fill",
                                color: .greenSuccess,
                                title: "Confirmer livraison",
                                subtitle: "Colis remis au destinataire"
                            ) { showDeliveryConfirm = true }
                        }
                    }

                    // Mon Compte section
                    menuSection(title: "MON COMPTE") {
                        menuRow(
                            icon: "person.fill",
                            color: .orangePrimary,
                            title: "Informations personnelles",
                            subtitle: "Nom, email, téléphone"
                        ) { }
                        Divider().padding(.leading, 60)
                        if role == "client" {
                            menuRow(
                                icon: "shippingbox.fill",
                                color: .blueInfo,
                                title: "Mes colis",
                                subtitle: totalShipments > 0 ? "\(totalShipments) envois au total" : "Gérer vos envois"
                            ) { }
                            Divider().padding(.leading, 60)
                            menuRow(
                                icon: "mappin.and.ellipse",
                                color: .greenSuccess,
                                title: "Carnet d'adresses",
                                subtitle: "Adresses sauvegardées"
                            ) { }
                            Divider().padding(.leading, 60)
                            menuRow(
                                icon: "list.bullet.rectangle",
                                color: Color(hex: "#F59E0B"),
                                title: "Historique paiements",
                                subtitle: "Toutes vos transactions"
                            ) { }
                            Divider().padding(.leading, 60)
                        }
                        menuRow(
                            icon: "message.fill",
                            color: Color(hex: "#6366F1"),
                            title: "Support client",
                            subtitle: "Aide 24h/24"
                        ) {
                            if let url = URL(string: "https://wa.me/2250700000000") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }

                    // Info section
                    menuSection(title: "COMPTE") {
                        infoRow(icon: "phone.fill", label: "Téléphone", value: user?.phone ?? "—")
                        Divider().padding(.leading, 60)
                        infoRow(icon: "envelope.fill", label: "Email", value: user?.email ?? "—")
                        Divider().padding(.leading, 60)
                        infoRow(icon: "shield.fill", label: "Rôle", value: roleLabel(role))
                    }

                    // ColisDirect section
                    menuSection(title: "COLISDIRECT") {
                        menuRow(
                            icon: "info.circle.fill",
                            color: Color(hex: "#6366F1"),
                            title: "À propos",
                            subtitle: nil
                        ) {
                            if let url = URL(string: AppConfig.webURL + "about") {
                                UIApplication.shared.open(url)
                            }
                        }
                        Divider().padding(.leading, 60)
                        menuRow(
                            icon: "list.bullet.rectangle.portrait.fill",
                            color: .orangePrimary,
                            title: "Tarifs",
                            subtitle: nil
                        ) {
                            if let url = URL(string: AppConfig.webURL + "pricing") {
                                UIApplication.shared.open(url)
                            }
                        }
                        Divider().padding(.leading, 60)
                        menuRow(
                            icon: "questionmark.circle.fill",
                            color: .greenSuccess,
                            title: "FAQ",
                            subtitle: nil
                        ) {
                            if let url = URL(string: AppConfig.webURL + "faq") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }

                    // Logout
                    Button(action: { showLogoutConfirm = true }) {
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.redDanger.opacity(0.1))
                                    .frame(width: 40, height: 40)
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.redDanger)
                            }
                            Text("Se déconnecter")
                                .font(AppFont.semiBold(15))
                                .foregroundColor(.redDanger)
                            Spacer()
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
                    }
                    .buttonStyle(.plain)

                    // Version
                    Text("ColisDirect v1.0 — © 2026 Côte d'Ivoire")
                        .font(AppFont.regular(11))
                        .foregroundColor(.gray400)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, 8)
                }
                .padding(.horizontal, 16)
                .padding(.top, 20)
                .padding(.bottom, 32)
            }
        }
        .background(Color.gray50)
        .ignoresSafeArea(.container, edges: .top)
        .navigationBarHidden(true)
        .onAppear {
            // Load shipments for stats (client only)
            if role == "client" {
                Task {
                    await clientVM.loadShipments()
                }
            }
        }
        .confirmationDialog("Se déconnecter ?", isPresented: $showLogoutConfirm, titleVisibility: .visible) {
            Button("Se déconnecter", role: .destructive) { authVM.signOut() }
            Button("Annuler", role: .cancel) {}
        }
        .sheet(isPresented: $showPickupScan) {
            if let tVM = transporterVM { PickupScanView(vm: tVM) }
        }
        .sheet(isPresented: $showHomePickup) {
            if let tVM = transporterVM { HomePickupView(vm: tVM) }
        }
        .sheet(isPresented: $showIntakeScan) {
            if let rVM = relayVM { RelayIntakeView(vm: rVM) }
        }
        .sheet(isPresented: $showDeliveryConfirm) {
            if let rVM = relayVM { DeliveryConfirmView(vm: rVM) }
        }
    }

    // MARK: - Profile Header
    private var profileHeader: some View {
        // Fully self-contained header: dark top + white bottom, no offset tricks
        VStack(spacing: 0) {
            // ── Dark top section ──
            VStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [Color.orangePrimary, Color(hex: "#FF8533")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 80, height: 80)
                        .shadow(color: Color.orangePrimary.opacity(0.45), radius: 12, y: 4)
                    Text(avatarInitials)
                        .font(AppFont.extraBold(32))
                        .foregroundColor(.white)
                }

                // Name + email + badge — all on dark background
                VStack(spacing: 4) {
                    Text(user?.fullName ?? "Utilisateur")
                        .font(AppFont.bold(20))
                        .foregroundColor(.white)

                    if let email = user?.email {
                        Text(email)
                            .font(AppFont.regular(13))
                            .foregroundColor(.white.opacity(0.65))
                    } else if let phone = user?.phone {
                        Text(phone)
                            .font(AppFont.regular(13))
                            .foregroundColor(.white.opacity(0.65))
                    }
                }

                // Role badge
                Text(roleLabel(role))
                    .font(AppFont.semiBold(12))
                    .foregroundColor(roleColor(role))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 5)
                    .background(Color.white.opacity(0.15))
                    .overlay(
                        Capsule().stroke(roleColor(role).opacity(0.6), lineWidth: 1)
                    )
                    .clipShape(Capsule())
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 60)
            .padding(.bottom, 28)
            .background(
                LinearGradient(
                    colors: [Color(hex: "#111827"), Color(hex: "#1F2937")],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
    }

    private var avatarInitials: String {
        let first = user?.firstName?.prefix(1) ?? ""
        let last = user?.lastName?.prefix(1) ?? ""
        let initials = "\(first)\(last)"
        return initials.isEmpty ? "?" : initials.uppercased()
    }

    // Convenience
    private var email: String? { user?.email }

    // MARK: - Stats Row (client only)
    private var statsRow: some View {
        HStack(spacing: 12) {
            statCard(value: "\(totalShipments)", label: "Total envois", color: .gray900, bg: Color.white)
            statCard(value: "\(deliveredCount)", label: "Livrés avec succès", color: .greenSuccess, bg: Color.greenSuccess.opacity(0.08))
        }
    }

    private func statCard(value: String, label: String, color: Color, bg: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(AppFont.extraBold(28))
                .foregroundColor(color)
            Text(label)
                .font(AppFont.regular(13))
                .foregroundColor(.gray500)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(bg)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray200, lineWidth: 1)
        )
    }

    // MARK: - Menu Section
    private func menuSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(AppFont.bold(11))
                .foregroundColor(.gray500)
                .kerning(0.8)
                .padding(.horizontal, 4)

            VStack(spacing: 0) {
                content()
            }
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
        }
    }

    // MARK: - Menu Row (tappable)
    private func menuRow(icon: String, color: Color, title: String, subtitle: String?, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(color.opacity(0.12))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(color)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(AppFont.semiBold(15))
                        .foregroundColor(.gray900)
                    if let subtitle {
                        Text(subtitle)
                            .font(AppFont.regular(12))
                            .foregroundColor(.gray500)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.gray400)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Info Row (display only)
    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.gray100)
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(.gray500)
            }
            Text(label)
                .font(AppFont.medium(14))
                .foregroundColor(.gray700)
            Spacer()
            Text(value)
                .font(AppFont.regular(14))
                .foregroundColor(.gray500)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    // MARK: - Helpers
    private func roleLabel(_ role: String) -> String {
        switch role {
        case "client": return "Client"
        case "transporter": return "Transporteur"
        case "relay_partner": return "Partenaire Relais"
        case "admin": return "Administrateur"
        case "support": return "Support"
        default: return role.capitalized
        }
    }

    private func roleColor(_ role: String) -> Color {
        switch role {
        case "transporter": return .blueInfo
        case "relay_partner": return .purpleRelay
        case "admin": return .redDanger
        case "support": return Color(hex: "#F59E0B")
        default: return .orangePrimary
        }
    }
}
