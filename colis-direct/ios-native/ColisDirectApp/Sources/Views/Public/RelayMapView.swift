import SwiftUI
import MapKit

// MARK: - Relay Map View
struct RelayMapView: View {
    @ObservedObject var vm: RelayPointsViewModel
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 5.3484, longitude: -4.0167), // Abidjan
        span: MKCoordinateSpan(latitudeDelta: 0.4, longitudeDelta: 0.4)
    )
    @State private var selectedRelay: RelayPointDto? = nil
    @State private var searchText = ""

    var filteredPoints: [RelayPointDto] {
        if searchText.isEmpty { return vm.relayPoints }
        return vm.relayPoints.filter {
            ($0.name ?? "").localizedCaseInsensitiveContains(searchText) ||
            ($0.commune ?? "").localizedCaseInsensitiveContains(searchText) ||
            ($0.address ?? "").localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 12) {
                    HStack {
                        Text("Points Relais")
                            .font(AppFont.extraBold(22))
                            .foregroundColor(.white)
                        Spacer()
                        Text("\(vm.relayPoints.count) relais")
                            .font(AppFont.medium(13))
                            .foregroundColor(.white.opacity(0.8))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.2))
                            .cornerRadius(20)
                    }

                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray500)
                        TextField("Rechercher un relais...", text: $searchText)
                            .font(AppFont.regular(14))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .background(Color.white)
                    .cornerRadius(10)
                }
                .padding(.horizontal, 20)
                .padding(.top, 56)
                .padding(.bottom, 16)
                .background(LinearGradient(colors: [Color.orangePrimary, Color.orangeLight], startPoint: .leading, endPoint: .trailing))

                if vm.isLoading {
                    LoadingView()
                } else {
                    // Map + List
                    VStack(spacing: 0) {
                        // Map
                        Map(coordinateRegion: $region, annotationItems: filteredPoints.filter { $0.latitude != nil && $0.longitude != nil }) { relay in
                            MapAnnotation(coordinate: CLLocationCoordinate2D(
                                latitude: relay.latitude!,
                                longitude: relay.longitude!
                            )) {
                                Button(action: { selectedRelay = relay }) {
                                    VStack(spacing: 4) {
                                        ZStack {
                                            Circle()
                                                .fill(selectedRelay?.id == relay.id ? Color.navyDark : Color.orangePrimary)
                                                .frame(width: 36, height: 36)
                                            Image(systemName: "storefront.fill")
                                                .font(.system(size: 16))
                                                .foregroundColor(.white)
                                        }
                                        .shadow(color: .black.opacity(0.3), radius: 4)

                                        Text(relay.name ?? "")
                                            .font(AppFont.bold(9))
                                            .foregroundColor(.gray900)
                                            .lineLimit(1)
                                            .padding(.horizontal, 4)
                                            .padding(.vertical, 2)
                                            .background(Color.white.opacity(0.9))
                                            .cornerRadius(4)
                                    }
                                }
                            }
                        }
                        .frame(height: 260)

                        // List
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                if filteredPoints.isEmpty {
                                    EmptyStateView(
                                        icon: "mappin.slash",
                                        title: "Aucun relais trouvé",
                                        subtitle: "Essayez un autre terme de recherche."
                                    )
                                } else {
                                    ForEach(filteredPoints) { relay in
                                        relayCard(relay)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                    }
                }
            }
            .background(Color.gray50)
            .navigationBarHidden(true)
            .task { await vm.load() }
            .sheet(item: $selectedRelay) { relay in
                relayDetailSheet(relay)
            }
        }
    }

    private func relayCard(_ relay: RelayPointDto) -> some View {
        Button(action: {
            selectedRelay = relay
            if let lat = relay.latitude, let lng = relay.longitude {
                withAnimation {
                    region.center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
                    region.span = MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                }
            }
        }) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.orangePrimary.opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: "storefront.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.orangePrimary)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(relay.name ?? "Point relais")
                        .font(AppFont.bold(14))
                        .foregroundColor(.gray900)
                    if let commune = relay.commune {
                        Text(commune)
                            .font(AppFont.medium(12))
                            .foregroundColor(.orangePrimary)
                    }
                    if let address = relay.address {
                        Text(address)
                            .font(AppFont.regular(12))
                            .foregroundColor(.gray500)
                            .lineLimit(1)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(.gray400)
            }
            .padding(12)
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.04), radius: 6)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func relayDetailSheet(_ relay: RelayPointDto) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray300)
                .frame(width: 40, height: 5)
                .frame(maxWidth: .infinity)
                .padding(.top, 12)

            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.orangePrimary.opacity(0.12))
                            .frame(width: 52, height: 52)
                        Image(systemName: "storefront.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.orangePrimary)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(relay.name ?? "Point relais")
                            .font(AppFont.bold(18))
                            .foregroundColor(.gray900)
                        if let commune = relay.commune {
                            Text(commune)
                                .font(AppFont.medium(13))
                                .foregroundColor(.orangePrimary)
                        }
                    }
                }
                .padding(.horizontal, 20)

                Divider().padding(.horizontal, 20)

                if let address = relay.address {
                    infoRow(icon: "location.fill", text: address, color: .gray700)
                }
                if let phone = relay.phone {
                    infoRow(icon: "phone.fill", text: phone, color: .gray700)
                }
                if relay.isActive == true {
                    infoRow(icon: "checkmark.circle.fill", text: "Point actif", color: .greenSuccess)
                }
            }

            if let lat = relay.latitude, let lng = relay.longitude {
                Map(coordinateRegion: .constant(MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )), annotationItems: [relay]) { r in
                    MapPin(coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), tint: .orange)
                }
                .frame(height: 180)
                .cornerRadius(14)
                .padding(.horizontal, 20)
            }

            Spacer()
        }
        .background(Color.white)
        .presentationDetents([.medium, .large])
    }

    private func infoRow(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.system(size: 16))
                .frame(width: 24)
            Text(text)
                .font(AppFont.medium(14))
                .foregroundColor(.gray700)
        }
        .padding(.horizontal, 20)
    }
}
