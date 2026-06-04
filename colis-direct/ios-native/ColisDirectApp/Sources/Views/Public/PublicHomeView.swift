import SwiftUI

// MARK: - Public Home View
struct PublicHomeView: View {
    @EnvironmentObject var authVM: AuthViewModel
    
    var onTrack: (String) -> Void
    var onCreateShipment: () -> Void
    var onFindRelay: () -> Void

    @State private var trackingInput = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    heroBanner
                    servicesRapides
                    rejoignezNous
                    tarifsTransparents
                }
                .padding(.bottom, 24)
            }
            .background(Color.gray50)
            .navigationBarHidden(true)
        }
    }

    // MARK: - Hero Banner
    private var heroBanner: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Brand header / Logo
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 24, height: 24)
                    .overlay(
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                    )
                Text("COLISDIRECT")
                    .font(AppFont.extraBold(15))
                    .foregroundColor(.white)
                    .kerning(-0.5)
            }
            .padding(.top, 40)

            VStack(alignment: .leading, spacing: 4) {
                let isLoggedIn = authVM.isLoggedIn
                let firstName = authVM.state.user?.firstName ?? ""
                
                Text(isLoggedIn && !firstName.isEmpty ? "Bonjour \(firstName) 👋" : "Bonjour 👋")
                    .font(AppFont.medium(14))
                    .foregroundColor(.white.opacity(0.95))
                
                Text(isLoggedIn ? "Que souhaitez-vous faire ?" : "Bienvenue sur ColisDirect")
                    .font(AppFont.extraBold(20))
                    .foregroundColor(.white)
                    .lineLimit(2)
            }
            
            // Suivi rapide box
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                    Text("Suivi rapide")
                        .font(AppFont.bold(12))
                        .foregroundColor(.white)
                }
                
                HStack(spacing: 8) {
                    TextField("", text: $trackingInput, prompt: Text("Ex: CD202605290001CI").foregroundColor(.gray400))
                        .font(AppFont.regular(13))
                        .foregroundColor(.gray900)
                        .padding(.horizontal, 12)
                        .frame(height: 44)
                        .background(Color.white)
                        .cornerRadius(10)
                        .autocapitalization(.allCharacters)
                        .disableAutocorrection(true)
                    
                    Button(action: {
                        let trimmed = trackingInput.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !trimmed.isEmpty {
                            onTrack(trimmed)
                        }
                    }) {
                        Text("Suivre")
                            .font(AppFont.bold(13))
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .frame(height: 44)
                            .background(Color.black)
                            .cornerRadius(10)
                    }
                }
            }
            .padding(12)
            .background(Color.white.opacity(0.12))
            .cornerRadius(14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
        .background(
            LinearGradient(
                colors: [Color.orangePrimary, Color(hex: "#FF8533")],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    // MARK: - Services Rapides
    private var servicesRapides: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SERVICES RAPIDES")
                .font(AppFont.bold(11))
                .foregroundColor(.gray500)
                .kerning(0.8)
                .padding(.horizontal, 16)
                .padding(.top, 8)
            
            HStack(spacing: 12) {
                // Envoyer un colis
                Button(action: onCreateShipment) {
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.orangePrimary.opacity(0.15))
                            .frame(width: 48, height: 48)
                            .overlay(
                                Image(systemName: "shippingbox.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(.orangePrimary)
                            )
                        Text("Envoyer un colis")
                            .font(AppFont.semiBold(12))
                            .foregroundColor(.gray900)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                
                // Trouver un relais
                Button(action: onFindRelay) {
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.greenSuccess.opacity(0.15))
                            .frame(width: 48, height: 48)
                            .overlay(
                                Image(systemName: "map.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(.greenSuccess)
                            )
                        Text("Trouver un relais")
                            .font(AppFont.semiBold(12))
                            .foregroundColor(.gray900)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
        .padding(.horizontal, 16)
        .offset(y: -16)
    }

    // MARK: - Rejoignez Nous
    private var rejoignezNous: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("REJOIGNEZ-NOUS")
                .font(AppFont.bold(11))
                .foregroundColor(.white.opacity(0.85))
                .kerning(0.8)
            
            Text("Devenez partenaire")
                .font(AppFont.extraBold(18))
                .foregroundColor(.white)
            
            Text("Livreur agréé ou point relais — développez votre activité avec ColisDirect.")
                .font(AppFont.regular(13))
                .foregroundColor(.white.opacity(0.8))
                .lineSpacing(2)
            
            HStack(spacing: 10) {
                // Livreur
                Button(action: {
                    if let url = URL(string: AppConfig.webURL + "become-transporter") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "bicycle")
                            .font(.system(size: 14, weight: .bold))
                        Text("Livreur")
                            .font(AppFont.bold(12))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .background(Color.black.opacity(0.35))
                    .cornerRadius(12)
                }
                
                // Point relais
                Button(action: {
                    if let url = URL(string: AppConfig.webURL + "become-relay") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Point relais")
                            .font(AppFont.bold(12))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 38)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.5), lineWidth: 1.5)
                    )
                    .cornerRadius(12)
                }
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.orangePrimary, Color(hex: "#FF8533")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(20)
        .padding(.horizontal, 16)
        .offset(y: -8)
    }

    // MARK: - Tarifs Transparents
    private var tarifsTransparents: some View {
        VStack(alignment: .center, spacing: 8) {
            Text("TARIFS TRANSPARENTS")
                .font(AppFont.bold(11))
                .foregroundColor(.orangePrimary)
                .kerning(1.0)
            
            Text("Dès 600 FCFA")
                .font(AppFont.extraBold(22))
                .foregroundColor(.white)
            
            Text("Envoyez partout en Côte d'Ivoire.")
                .font(AppFont.regular(13))
                .foregroundColor(.white.opacity(0.65))
                .multilineTextAlignment(.center)
            
            Button(action: {
                if let url = URL(string: AppConfig.webURL + "pricing") {
                    UIApplication.shared.open(url)
                }
            }) {
                HStack(spacing: 6) {
                    Text("Voir tous les tarifs")
                        .font(AppFont.bold(14))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color.orangePrimary)
                .cornerRadius(12)
            }
            .padding(.top, 4)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color(hex: "#0F0F0F"), Color(hex: "#1A1A2E")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(20)
        .padding(.horizontal, 16)
        .offset(y: -8)
    }
}

// MARK: - Public Shipments Prompt (non-connected)
struct PublicShipmentsPromptView: View {
    var onLogin: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "shippingbox")
                .font(.system(size: 60))
                .foregroundColor(.gray300)

            Text("Mes colis")
                .font(AppFont.bold(24))
                .foregroundColor(.gray900)

            Text("Connectez-vous pour voir\nvos envois et livraisons.")
                .font(AppFont.regular(15))
                .foregroundColor(.gray500)
                .multilineTextAlignment(.center)

            OrangeButton(title: "Se connecter", icon: "person.fill", action: onLogin)
                .padding(.horizontal, 32)
            Spacer()
        }
    }
}
