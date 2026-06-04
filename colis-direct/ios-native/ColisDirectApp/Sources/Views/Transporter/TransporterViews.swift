import SwiftUI
import AVFoundation

// MARK: - Transporter Home View
struct TransporterHomeView: View {
    @ObservedObject var vm: TransporterViewModel
    var onPickupScan: () -> Void

    @State private var selectedTab = 0
    @State private var showPickupScan = false
    @State private var showHomePickup = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Espace Transporteur")
                        .font(AppFont.extraBold(22))
                        .foregroundColor(.white)
                    Text("\(vm.assignments.count) colis à collecter · \(vm.deliveredShipments.count) livrés")
                        .font(AppFont.medium(13))
                        .foregroundColor(.white.opacity(0.8))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 56)
                .padding(.bottom, 20)
                .background(LinearGradient(colors: [Color.navyDark, Color(hex: "#1E3A5F")], startPoint: .topLeading, endPoint: .bottomTrailing))

                // Quick actions
                HStack(spacing: 12) {
                    quickAction(icon: "qrcode.viewfinder", title: "Scanner", subtitle: "Collecter colis", color: .blueInfo) {
                        showPickupScan = true
                    }
                    quickAction(icon: "house.fill", title: "Domicile", subtitle: "Ramassage", color: .greenSuccess) {
                        showHomePickup = true
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)

                // Tabs
                HStack(spacing: 0) {
                    tabButton(title: "À collecter (\(vm.assignments.count))", index: 0)
                    tabButton(title: "Livrés (\(vm.deliveredShipments.count))", index: 1)
                }
                .background(Color.white)

                // Content
                if vm.isLoading {
                    LoadingView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            let list = selectedTab == 0 ? vm.assignments : vm.deliveredShipments
                            if list.isEmpty {
                                EmptyStateView(
                                    icon: selectedTab == 0 ? "shippingbox" : "checkmark.circle",
                                    title: selectedTab == 0 ? "Aucun colis à collecter" : "Aucune livraison",
                                    subtitle: selectedTab == 0 ? "Vous n'avez pas d'assignations en attente." : "Vous n'avez pas encore de livraisons effectuées."
                                )
                                .padding(.top, 32)
                            } else {
                                ForEach(list) { shipment in
                                    ShipmentRow(shipment: shipment)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                    }
                    .background(Color.gray50)
                }
            }
            .navigationBarHidden(true)
            .task {
                await vm.loadAssignments()
                await vm.loadDelivered()
            }
            .refreshable {
                await vm.loadAssignments()
                await vm.loadDelivered()
            }
            .sheet(isPresented: $showPickupScan) {
                PickupScanView(vm: vm)
            }
            .sheet(isPresented: $showHomePickup) {
                HomePickupView(vm: vm)
            }
        }
    }

    private func quickAction(icon: String, title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(color.opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: icon).font(.system(size: 20)).foregroundColor(color)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(AppFont.bold(13)).foregroundColor(.gray900)
                    Text(subtitle).font(AppFont.regular(11)).foregroundColor(.gray500)
                }
                Spacer()
            }
            .padding(12)
            .background(Color.gray50)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }

    private func tabButton(title: String, index: Int) -> some View {
        Button(action: { selectedTab = index }) {
            VStack(spacing: 0) {
                Text(title)
                    .font(AppFont.semiBold(13))
                    .foregroundColor(selectedTab == index ? .orangePrimary : .gray500)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                Rectangle()
                    .fill(selectedTab == index ? Color.orangePrimary : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Pickup Scan View
struct PickupScanView: View {
    @ObservedObject var vm: TransporterViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var trackingInput = ""
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Scanner preview placeholder
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.navyDark)
                    .frame(maxWidth: .infinity)
                    .frame(height: 240)
                    .overlay(
                        VStack(spacing: 16) {
                            Image(systemName: "qrcode.viewfinder")
                                .font(.system(size: 60))
                                .foregroundColor(.white.opacity(0.6))
                            Text("Scannez le code-barres du colis")
                                .font(AppFont.medium(14))
                                .foregroundColor(.white.opacity(0.8))
                        }
                    )

                // Manual input
                VStack(alignment: .leading, spacing: 12) {
                    Text("Ou saisir manuellement")
                        .font(AppFont.semiBold(14))
                        .foregroundColor(.gray700)
                    CdTextField(
                        label: "Numéro de suivi",
                        text: $trackingInput,
                        placeholder: "CD12345678ABCD",
                        leadingIcon: "barcode"
                    )

                    OrangeButton(title: "Confirmer la collecte", icon: "checkmark.circle.fill",
                                 isLoading: vm.isLoading,
                                 isDisabled: trackingInput.isEmpty) {
                        Task {
                            await vm.pickupScan(trackingNumber: trackingInput)
                            if vm.error == nil {
                                showSuccess = true
                            }
                        }
                    }
                }

                if let scanned = vm.lastScannedShipment {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Colis collecté avec succès", systemImage: "checkmark.circle.fill")
                            .font(AppFont.bold(14))
                            .foregroundColor(.greenSuccess)
                        Text("\(scanned.senderName ?? "—") → \(scanned.recipientName ?? "—")")
                            .font(AppFont.medium(13))
                            .foregroundColor(.gray700)
                    }
                    .padding(14)
                    .background(Color.greenSuccess.opacity(0.1))
                    .cornerRadius(12)
                }

                if let error = vm.error {
                    ErrorBanner(message: error)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .background(Color.gray50)
            .navigationTitle("Scanner un colis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fermer") { dismiss() }
                }
            }
            .onDisappear { vm.clearScanResult() }
        }
    }
}

// MARK: - Home Pickup View
struct HomePickupView: View {
    @ObservedObject var vm: TransporterViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var trackingInput = ""
    @State private var senderPhone = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "house.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.blueInfo)
                    .padding(.top, 24)

                Text("Ramassage à domicile")
                    .font(AppFont.extraBold(22))
                    .foregroundColor(.gray900)

                Text("Saisissez le numéro de suivi et le téléphone de l'expéditeur pour confirmer le ramassage.")
                    .font(AppFont.regular(14))
                    .foregroundColor(.gray500)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                VStack(spacing: 16) {
                    CdTextField(label: "Numéro de suivi", text: $trackingInput, placeholder: "CD12345678", leadingIcon: "barcode")
                    CdTextField(label: "Téléphone expéditeur", text: $senderPhone, placeholder: "07 XX XX XX XX", leadingIcon: "phone.fill", keyboardType: .phonePad)

                    OrangeButton(title: "Confirmer le ramassage", icon: "checkmark.circle.fill",
                                 isLoading: vm.isLoading,
                                 isDisabled: trackingInput.isEmpty || senderPhone.isEmpty) {
                        Task {
                            await vm.confirmHomePickup(trackingNumber: trackingInput, senderPhone: senderPhone)
                        }
                    }
                }
                .padding(.horizontal, 20)

                if let scanned = vm.lastScannedShipment {
                    successBanner(name: "\(scanned.senderName ?? "—") → \(scanned.recipientName ?? "—")")
                }

                if let error = vm.error {
                    ErrorBanner(message: error).padding(.horizontal, 20)
                }

                Spacer()
            }
            .background(Color.gray50)
            .navigationTitle("Ramassage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Fermer") { dismiss() } }
            }
            .onDisappear { vm.clearScanResult() }
        }
    }

    private func successBanner(name: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill").foregroundColor(.greenSuccess)
            VStack(alignment: .leading, spacing: 2) {
                Text("Ramassage confirmé !").font(AppFont.bold(13)).foregroundColor(.greenSuccess)
                Text(name).font(AppFont.medium(12)).foregroundColor(.gray700)
            }
        }
        .padding(14)
        .background(Color.greenSuccess.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal, 20)
    }
}
