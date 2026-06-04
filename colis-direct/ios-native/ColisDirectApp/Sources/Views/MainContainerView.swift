import SwiftUI

// MARK: - Main Container (TabView)
struct MainContainerView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var trackingVM = TrackingViewModel()
    @StateObject private var clientVM = ClientViewModel()
    @StateObject private var relayPointsVM = RelayPointsViewModel()
    @StateObject private var transporterVM = TransporterViewModel()
    @StateObject private var relayVM = RelayViewModel()

    @State private var selectedTab: TabType = .home

    var isLoggedIn: Bool { authVM.isLoggedIn }
    var role: String { authVM.currentRole ?? "" }

    enum TabType: Int {
        case home = 0, shipments, tracking, relays, profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            // MARK: Home
            homeView
                .tabItem {
                    Label("Accueil", systemImage: "house.fill")
                }
                .tag(TabType.home)

            // MARK: Mes Colis
            shipmentsView
                .tabItem {
                    Label("Mes colis", systemImage: "shippingbox.fill")
                }
                .tag(TabType.shipments)

            // MARK: Suivre
            TrackingView(vm: trackingVM)
                .tabItem {
                    Label("Suivre", systemImage: "magnifyingglass")
                }
                .tag(TabType.tracking)

            // MARK: Relais
            RelayMapView(vm: relayPointsVM)
                .tabItem {
                    Label("Relais", systemImage: "map.fill")
                }
                .tag(TabType.relays)

            // MARK: Profil
            profileView
                .tabItem {
                    Label("Profil", systemImage: "person.fill")
                }
                .tag(TabType.profile)
        }
        .accentColor(.orangePrimary)
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = .white
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }

    // MARK: - Home View
    @ViewBuilder
    private var homeView: some View {
        switch role {
        case "transporter":
            TransporterHomeView(vm: transporterVM, onPickupScan: {
                // Navigate to scan
            })
        case "relay_partner":
            RelayHomeView(vm: relayVM, authVM: authVM)
        default:
            PublicHomeView(onTrack: { number in
                trackingVM.trackingNumber = number
                selectedTab = .tracking
            }, onCreateShipment: {
                if isLoggedIn {
                    selectedTab = .shipments
                } else {
                    selectedTab = .profile
                }
            }, onFindRelay: {
                selectedTab = .relays
            })
        }
    }

    // MARK: - Shipments View
    @ViewBuilder
    private var shipmentsView: some View {
        if isLoggedIn {
            NavigationStack {
                ShipmentsListView(vm: clientVM, user: authVM.state.user)
            }
        } else {
            PublicShipmentsPromptView(onLogin: { selectedTab = .profile })
        }
    }

    // MARK: - Profile View
    @ViewBuilder
    private var profileView: some View {
        if isLoggedIn {
            NavigationStack {
                ClientProfileView(
                    authVM: authVM,
                    clientVM: clientVM,
                    transporterVM: role == "transporter" ? transporterVM : nil,
                    relayVM: role == "relay_partner" ? relayVM : nil
                )
            }
        } else {
            NavigationStack {
                LoginView(authVM: authVM)
            }
        }
    }
}
