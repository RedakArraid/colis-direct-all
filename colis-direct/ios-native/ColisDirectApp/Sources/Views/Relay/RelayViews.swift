import SwiftUI

// MARK: - Relay Home View
struct RelayHomeView: View {
    @ObservedObject var vm: RelayViewModel
    @ObservedObject var authVM: AuthViewModel

    @State private var showIntake = false
    @State private var showDelivery = false
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Espace Relais")
                        .font(AppFont.extraBold(22))
                        .foregroundColor(.white)
                    if let user = authVM.state.user {
                        Text("Bienvenue, \(user.fullName)")
                            .font(AppFont.medium(13))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    // Stats row
                    HStack(spacing: 20) {
                        statChip(label: "En attente", count: vm.pendingShipments.count, color: .yellowWarning)
                        statChip(label: "Total", count: vm.pendingShipments.count, color: .blueInfo)
                    }
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 56)
                .padding(.bottom, 20)
                .background(LinearGradient(colors: [Color.purpleRelay, Color(hex: "#6D28D9")], startPoint: .topLeading, endPoint: .bottomTrailing))

                // Quick actions
                HStack(spacing: 12) {
                    quickAction(icon: "barcode.viewfinder", title: "Réception", color: .purpleRelay) {
                        showIntake = true
                    }
                    quickAction(icon: "checkmark.circle.fill", title: "Livraison", color: .greenSuccess) {
                        showDelivery = true
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)

                // Shipments list
                if vm.isLoading {
                    LoadingView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if vm.pendingShipments.isEmpty {
                                EmptyStateView(
                                    icon: "shippingbox",
                                    title: "Aucun colis",
                                    subtitle: "Aucun colis en attente au relais."
                                )
                                .padding(.top, 32)
                            } else {
                                ForEach(vm.pendingShipments) { shipment in
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
            .task { await vm.loadPendingShipments() }
            .refreshable { await vm.loadPendingShipments() }
            .sheet(isPresented: $showIntake) {
                RelayIntakeView(vm: vm)
            }
            .sheet(isPresented: $showDelivery) {
                DeliveryConfirmView(vm: vm)
            }
        }
    }

    private func statChip(label: String, count: Int, color: Color) -> some View {
        HStack(spacing: 6) {
            Text("\(count)")
                .font(AppFont.extraBold(18))
                .foregroundColor(.white)
            Text(label)
                .font(AppFont.medium(12))
                .foregroundColor(.white.opacity(0.8))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.2))
        .cornerRadius(20)
    }

    private func quickAction(icon: String, title: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.12))
                        .frame(height: 56)
                    Image(systemName: icon)
                        .font(.system(size: 24))
                        .foregroundColor(color)
                }
                Text(title)
                    .font(AppFont.semiBold(12))
                    .foregroundColor(.gray700)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Relay Intake View
struct RelayIntakeView: View {
    @ObservedObject var vm: RelayViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var trackingInput = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "barcode.viewfinder")
                    .font(.system(size: 56))
                    .foregroundColor(.purpleRelay)
                    .padding(.top, 32)

                Text("Réception d'un colis")
                    .font(AppFont.extraBold(22))
                    .foregroundColor(.gray900)

                Text("Scannez ou saisissez le numéro de suivi du colis à réceptionner au relais.")
                    .font(AppFont.regular(14))
                    .foregroundColor(.gray500)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                VStack(spacing: 16) {
                    CdTextField(
                        label: "Numéro de suivi",
                        text: $trackingInput,
                        placeholder: "CD12345678ABCD",
                        leadingIcon: "barcode"
                    )

                    Button(action: {
                        Task {
                            await vm.relayIntake(trackingNumber: trackingInput)
                        }
                    }) {
                        HStack(spacing: 8) {
                            if vm.isLoading {
                                ProgressView().tint(.white).scaleEffect(0.85)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Confirmer la réception")
                                    .font(AppFont.bold(15))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(trackingInput.isEmpty ? Color.purpleRelay.opacity(0.5) : Color.purpleRelay)
                        .cornerRadius(12)
                    }
                    .disabled(trackingInput.isEmpty || vm.isLoading)
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
            .navigationTitle("Réception")
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
                Text("Colis réceptionné !").font(AppFont.bold(13)).foregroundColor(.greenSuccess)
                Text(name).font(AppFont.medium(12)).foregroundColor(.gray700)
            }
        }
        .padding(14)
        .background(Color.greenSuccess.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal, 20)
    }
}

// MARK: - Delivery Confirm View
struct DeliveryConfirmView: View {
    @ObservedObject var vm: RelayViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var trackingInput = ""
    @State private var recipientPhone = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 56))
                    .foregroundColor(.greenSuccess)
                    .padding(.top, 32)

                Text("Confirmer une livraison")
                    .font(AppFont.extraBold(22))
                    .foregroundColor(.gray900)

                Text("Saisissez le numéro de suivi et le téléphone du destinataire pour confirmer la remise du colis.")
                    .font(AppFont.regular(14))
                    .foregroundColor(.gray500)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                VStack(spacing: 16) {
                    CdTextField(label: "Numéro de suivi", text: $trackingInput, placeholder: "CD12345678", leadingIcon: "barcode")
                    CdTextField(label: "Téléphone destinataire", text: $recipientPhone, placeholder: "05 XX XX XX XX", leadingIcon: "phone.fill", keyboardType: .phonePad)

                    Button(action: {
                        Task {
                            await vm.completeDelivery(trackingNumber: trackingInput, recipientPhone: recipientPhone)
                        }
                    }) {
                        HStack(spacing: 8) {
                            if vm.isLoading {
                                ProgressView().tint(.white).scaleEffect(0.85)
                            } else {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Confirmer la livraison")
                                    .font(AppFont.bold(15))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background((trackingInput.isEmpty || recipientPhone.isEmpty) ? Color.greenSuccess.opacity(0.5) : Color.greenSuccess)
                        .cornerRadius(12)
                    }
                    .disabled(trackingInput.isEmpty || recipientPhone.isEmpty || vm.isLoading)
                }
                .padding(.horizontal, 20)

                if let scanned = vm.lastScannedShipment {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark.circle.fill").foregroundColor(.greenSuccess)
                        Text("Colis \(scanned.trackingNumber) livré !")
                            .font(AppFont.bold(13)).foregroundColor(.greenSuccess)
                    }
                    .padding(14)
                    .background(Color.greenSuccess.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }

                if let error = vm.error {
                    ErrorBanner(message: error).padding(.horizontal, 20)
                }

                Spacer()
            }
            .background(Color.gray50)
            .navigationTitle("Livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Fermer") { dismiss() } }
            }
            .onDisappear { vm.clearScanResult() }
        }
    }
}
