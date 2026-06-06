import SwiftUI

// MARK: - Shipments List View (Client)
struct ShipmentsListView: View {
    @ObservedObject var vm: ClientViewModel
    var user: UserDto? = nil           // pre-fill sender in create form
    @State private var searchText = ""
    @State private var selectedStatus: String? = nil
    @State private var sortDescending = true
    @State private var selectedShipmentId: String? = nil
    @State private var showCreateShipment = false
    @State private var shipmentToCancel: ShipmentDto? = nil
    @State private var showCancelConfirm = false
    @State private var paymentShipment: ShipmentDto? = nil

    let statusFilters: [(label: String, value: String?)] = [
        ("Tous", nil),
        ("En cours", "in_transit"),
        ("Livrés", "delivered"),
        ("Annulés", "cancelled"),
    ]

    var filteredShipments: [ShipmentDto] {
        var list = vm.shipments
        if let s = selectedStatus {
            list = list.filter { shipment in
                guard let status = shipment.currentStatus?.uppercased() else { return false }
                if s == "in_transit" {
                    // "En cours" includes any status that is not a terminal state (Delivered, Cancelled, or Returned)
                    return status != "DELIVERED" &&
                           status != "DELIVERED_TO_CUSTOMER" &&
                           status != "PICKED_UP_BY_CUSTOMER" &&
                           status != "CANCELLED" &&
                           status != "RETURN_TO_SENDER"
                } else if s == "delivered" {
                    return status == "DELIVERED" || status == "DELIVERED_TO_CUSTOMER" || status == "PICKED_UP_BY_CUSTOMER"
                } else if s == "cancelled" {
                    return status == "CANCELLED" || status == "RETURN_TO_SENDER"
                }
                return status.lowercased() == s
            }
        }
        if !searchText.isEmpty {
            list = list.filter {
                $0.trackingNumber.localizedCaseInsensitiveContains(searchText) ||
                ($0.recipientName ?? "").localizedCaseInsensitiveContains(searchText) ||
                ($0.recipientCommune ?? "").localizedCaseInsensitiveContains(searchText)
            }
        }
        return sortDescending ? list : list.reversed()
    }

    var pendingPaymentShipments: [ShipmentDto] {
        vm.shipments.filter { $0.paymentStatus?.lowercased() == "pending" }
    }

    var homePickupShipments: [ShipmentDto] {
        vm.shipments.filter {
            ($0.deliveryMode ?? "").contains("home") &&
            $0.currentStatus?.uppercased() == "PICKUP_PENDING"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    Text("Mes colis")
                        .font(AppFont.extraBold(24))
                        .foregroundColor(.gray900)
                    Spacer()
                    Button(action: { showCreateShipment = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.orangePrimary)
                            .cornerRadius(12)
                    }
                }

                // Search bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundColor(.gray500)
                    TextField("Rechercher un colis...", text: $searchText)
                        .font(AppFont.regular(14))
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.gray400)
                        }
                    }
                }
                .padding(12)
                .background(Color.gray100)
                .cornerRadius(10)

                // Status filter tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(statusFilters, id: \.label) { filter in
                            Button(action: {
                                selectedStatus = filter.value
                            }) {
                                Text(filter.label)
                                    .font(AppFont.semiBold(13))
                                    .foregroundColor(selectedStatus == filter.value ? .white : .gray700)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(selectedStatus == filter.value ? Color.orangePrimary : Color.white)
                                    .cornerRadius(20)
                                    .shadow(color: .black.opacity(0.04), radius: 4)
                            }
                        }
                    }
                }

                // Sort toggle
                HStack {
                    Text("\(filteredShipments.count) colis")
                        .font(AppFont.medium(13))
                        .foregroundColor(.gray500)
                    Spacer()
                    Button(action: { sortDescending.toggle() }) {
                        HStack(spacing: 4) {
                            Image(systemName: sortDescending ? "arrow.down" : "arrow.up")
                                .font(.system(size: 12))
                            Text(sortDescending ? "Plus récents" : "Plus anciens")
                                .font(AppFont.medium(12))
                        }
                        .foregroundColor(.gray700)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.gray100)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color.white)
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)

            // Content
            if vm.isLoading {
                LoadingView()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if let error = vm.error {
                            ErrorBanner(message: error)
                                .onAppear {
                                    Task {
                                        try? await Task.sleep(nanoseconds: 4_000_000_000)
                                        vm.clearError()
                                    }
                                }
                        }

                        // Action banners
                        actionBanners

                        if filteredShipments.isEmpty {
                            EmptyStateView(
                                icon: "shippingbox",
                                title: "Aucun colis",
                                subtitle: searchText.isEmpty ? "Vous n'avez pas encore créé d'envoi." : "Aucun résultat pour \"\(searchText)\""
                            )
                        } else {
                            ForEach(filteredShipments) { shipment in
                                NavigationLink(destination: ShipmentDetailView(shipment: shipment, vm: vm)) {
                                    ShipmentRow(shipment: shipment)
                                }
                                .buttonStyle(.plain)
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
        .task { await vm.loadShipments() }
        .sheet(isPresented: $showCreateShipment) {
            CreateShipmentView(vm: vm, user: user)
        }
        .sheet(item: $paymentShipment) { shipment in
            PaymentFlowView(shipment: shipment, user: user, vm: vm)
        }
        .refreshable { await vm.loadShipments() }
        .confirmationDialog("Annuler ce colis ?", isPresented: $showCancelConfirm, titleVisibility: .visible) {
            Button("Confirmer l'annulation", role: .destructive) {
                if let s = shipmentToCancel {
                    Task {
                        await vm.cancelShipment(trackingNumber: s.trackingNumber)
                    }
                }
            }
            Button("Annuler", role: .cancel) {}
        }
    }

    // MARK: Action Banners
    @ViewBuilder
    private var actionBanners: some View {
        // Home pickup pending
        if !homePickupShipments.isEmpty {
            HStack(spacing: 12) {
                Image(systemName: "truck.box.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.blueInfo)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ramassage à domicile prévu")
                        .font(AppFont.bold(14))
                        .foregroundColor(.gray900)
                    Text("\(homePickupShipments.count) colis en attente de collecte")
                        .font(AppFont.regular(12))
                        .foregroundColor(.gray600)
                }
                Spacer()
            }
            .padding(14)
            .background(Color.blueInfo.opacity(0.08))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.blueInfo.opacity(0.2), lineWidth: 1))
        }

        // Pending payment
        ForEach(pendingPaymentShipments) { shipment in
            pendingPaymentBanner(shipment)
        }
    }

    private func pendingPaymentBanner(_ shipment: ShipmentDto) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(.yellowWarning)
                Text("Paiement en attente")
                    .font(AppFont.bold(13))
                    .foregroundColor(.gray900)
                Spacer()
                Text(shipment.trackingNumber.suffix(8))
                    .font(.system(.caption, design: .monospaced).weight(.bold))
                    .foregroundColor(.orangePrimary)
            }
            Text("Ce colis attend une confirmation de paiement.")
                .font(AppFont.regular(12))
                .foregroundColor(.gray600)
            HStack(spacing: 12) {
                Button(action: {
                    paymentShipment = shipment
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "creditcard.fill")
                            .font(.system(size: 12))
                        Text("Procéder au paiement")
                    }
                    .font(AppFont.bold(12))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.orangePrimary)
                    .cornerRadius(8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(vm.isLoading)
            }

            Button(action: {
                shipmentToCancel = shipment
                showCancelConfirm = true
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "xmark.circle")
                    Text("Annuler l'envoi")
                }
                .font(AppFont.medium(12))
                .foregroundColor(.redDanger)
                .padding(.top, 4)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(vm.isLoading)
        }
        .padding(14)
        .background(Color.yellowWarning.opacity(0.08))
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.yellowWarning.opacity(0.3), lineWidth: 1))
    }
}

// MARK: - Color extension for gray600
extension Color {
    static let gray600 = Color(hex: "#4B5563")
}
