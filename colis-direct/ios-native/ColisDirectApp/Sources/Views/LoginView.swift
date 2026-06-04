import SwiftUI

// MARK: - Login View
struct LoginView: View {
    @ObservedObject var authVM: AuthViewModel

    @State private var emailOrPhone = ""
    @State private var password = ""
    @State private var usePhone = false
    @FocusState private var focusedField: Field?

    enum Field { case emailOrPhone, password }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: Navy Header
                ZStack(alignment: .bottomLeading) {
                    LinearGradient.navyGradient
                        .frame(height: 220)

                    VStack(alignment: .leading, spacing: 8) {
                        // Brand logo
                        HStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.orangePrimary)
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Image(systemName: "shippingbox.fill")
                                        .font(.system(size: 18))
                                        .foregroundColor(.white)
                                )

                            Text("COLISDIRECT")
                                .font(AppFont.extraBold(20))
                                .foregroundColor(.white)
                                .kerning(-0.5)
                        }

                        Spacer().frame(height: 16)

                        Text("Bienvenue 👋")
                            .font(AppFont.extraBold(30))
                            .foregroundColor(.white)
                            .kerning(-0.5)

                        Text("Connectez-vous pour gérer vos colis.")
                            .font(AppFont.regular(14))
                            .foregroundColor(.white.opacity(0.75))
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 32)
                }

                // MARK: Form
                VStack(alignment: .leading, spacing: 20) {
                    Text("Se connecter")
                        .font(AppFont.extraBold(26))
                        .foregroundColor(.gray900)
                        .kerning(-0.4)

                    // Toggle: Email / Phone
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Connexion avec")
                            .font(AppFont.medium(13))
                            .foregroundColor(.gray500)

                        HStack(spacing: 4) {
                            pillButton(title: "E-mail", isActive: !usePhone) {
                                usePhone = false; emailOrPhone = ""
                            }
                            pillButton(title: "Téléphone", isActive: usePhone) {
                                usePhone = true; emailOrPhone = ""
                            }
                        }
                        .padding(4)
                        .background(Color.gray50)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray300, lineWidth: 1.5)
                        )
                        .cornerRadius(12)
                    }

                    // Email / Phone field
                    CdTextField(
                        label: usePhone ? "Numéro de téléphone" : "Adresse e-mail",
                        text: $emailOrPhone,
                        placeholder: usePhone ? "07 XX XX XX XX" : "votre@email.com",
                        leadingIcon: usePhone ? "phone.fill" : "envelope.fill",
                        keyboardType: usePhone ? .phonePad : .emailAddress
                    )
                    .focused($focusedField, equals: .emailOrPhone)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .password }

                    // Password field
                    CdTextField(
                        label: "Mot de passe",
                        text: $password,
                        placeholder: "••••••••",
                        leadingIcon: "lock.fill",
                        isSecure: true
                    )
                    .focused($focusedField, equals: .password)
                    .submitLabel(.done)
                    .onSubmit { submitLogin() }

                    // Error
                    if let error = authVM.state.error {
                        ErrorBanner(message: error)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    // Login button
                    OrangeButton(
                        title: "Se connecter",
                        isLoading: authVM.state.isLoading,
                        isDisabled: emailOrPhone.isEmpty || password.isEmpty
                    ) {
                        submitLogin()
                    }

                    if AppConfig.useStagingAPI {
                        Divider()
                            .overlay(Color.gray300)

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Connexion rapide (Dev)")
                                .font(AppFont.bold(12))
                                .foregroundColor(.gray500)
                                .kerning(0.5)

                            VStack(spacing: 8) {
                                HStack(spacing: 8) {
                                    devLoginButton(title: "👤 Client", email: "e2e+client@colisdirect.test")
                                    devLoginButton(title: "🏪 Relais", email: "e2e+relay@colisdirect.test")
                                }
                                HStack(spacing: 8) {
                                    devLoginButton(title: "🚚 Livreur", email: "e2e+transporter@colisdirect.test")
                                    devLoginButton(title: "🛠️ Support", email: "e2e+support@colisdirect.test")
                                }
                                devLoginButton(title: "👑 Admin", email: "e2e+admin@colisdirect.test")
                            }
                        }
                        .padding(.top, 8)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 32)
                .padding(.bottom, 40)

                // Footer
                Text("© 2026 COLISDIRECT — Côte d'Ivoire")
                    .font(AppFont.regular(11))
                    .foregroundColor(.gray500)
                    .padding(.bottom, 24)
            }
        }
        .background(Color.white)
        .animation(.easeInOut(duration: 0.2), value: authVM.state.error)
        .navigationBarHidden(true)
    }

    private func submitLogin() {
        focusedField = nil
        authVM.signIn(emailOrPhone: emailOrPhone, password: password, usePhone: usePhone)
    }

    private func pillButton(title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(AppFont.semiBold(14))
                .foregroundColor(isActive ? .white : .gray500)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isActive ? Color.orangePrimary : Color.clear)
                .cornerRadius(9)
        }
    }

    private func autoLogin(email: String) {
        emailOrPhone = email
        password = "admin123"
        usePhone = false
        focusedField = nil
        authVM.signIn(emailOrPhone: email, password: "admin123", usePhone: false)
    }

    private func devLoginButton(title: String, email: String) -> some View {
        Button(action: { autoLogin(email: email) }) {
            Text(title)
                .font(AppFont.bold(12))
                .foregroundColor(.orangePrimary)
                .frame(maxWidth: .infinity)
                .frame(height: 36)
                .background(Color.orangePrimary.opacity(0.1))
                .cornerRadius(8)
        }
    }
}
