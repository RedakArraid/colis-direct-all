import Foundation
import Security

// MARK: - Token Manager (Keychain-backed)
final class TokenManager: @unchecked Sendable {
    nonisolated(unsafe) static let shared = TokenManager()
    private init() {}

    private let tokenKey = "ci.colisdirect.app.token"
    private let roleKey = "ci.colisdirect.app.role"

    // MARK: Token
    func saveToken(_ token: String) {
        save(key: tokenKey, value: token)
    }

    func getToken() -> String? {
        load(key: tokenKey)
    }

    func clearToken() {
        delete(key: tokenKey)
    }

    // MARK: Role (UserDefaults is fine for role — non-sensitive)
    func saveRole(_ role: String) {
        UserDefaults.standard.set(role, forKey: roleKey)
    }

    func getRole() -> String? {
        UserDefaults.standard.string(forKey: roleKey)
    }

    func clearRole() {
        UserDefaults.standard.removeObject(forKey: roleKey)
    }

    func clearAll() {
        clearToken()
        clearRole()
    }

    var isLoggedIn: Bool {
        getToken() != nil
    }

    // MARK: - Private Keychain Helpers
    private func save(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecValueData: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private func load(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func delete(key: String) {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrAccount: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
