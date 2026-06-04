import Foundation
import Combine

// MARK: - Auth State
struct AuthState {
    var isLoading = false
    var user: UserDto? = nil
    var error: String? = nil
    var isLoggedIn = false
}

// MARK: - AuthViewModel
@MainActor
final class AuthViewModel: ObservableObject {
    @Published var state = AuthState()

    private let api = APIService.shared
    private let tokenManager = TokenManager.shared

    init() {
        if tokenManager.isLoggedIn {
            Task { await refreshUser() }
        }
    }

    var currentRole: String? { state.user?.role.lowercased() }
    var isLoggedIn: Bool { state.isLoggedIn }

    func signIn(emailOrPhone: String, password: String, usePhone: Bool = false) {
        Task {
            state.isLoading = true
            state.error = nil
            do {
                let response = try await api.signIn(
                    email: usePhone ? nil : emailOrPhone,
                    phone: usePhone ? emailOrPhone : nil,
                    password: password
                )
                state = AuthState(isLoading: false, user: response.user, isLoggedIn: true)
            } catch {
                state.isLoading = false
                state.error = error.localizedDescription
                // Auto-clear error after 4s
                Task {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    state.error = nil
                }
            }
        }
    }

    func signOut() {
        Task {
            try? await api.signOut()
            tokenManager.clearAll()
            state = AuthState()
        }
    }

    func clearError() {
        state.error = nil
    }

    private func refreshUser() async {
        do {
            let user = try await api.getMe()
            state = AuthState(user: user, isLoggedIn: true)
        } catch {
            tokenManager.clearAll()
            state = AuthState()
        }
    }
}
