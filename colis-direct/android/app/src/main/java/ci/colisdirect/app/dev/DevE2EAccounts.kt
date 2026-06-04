package ci.colisdirect.app.dev

import ci.colisdirect.app.BuildConfig

/**
 * Comptes E2E locaux — alignés sur [colis-direct/tests/e2e/README.md].
 * Visible uniquement en flavor **dev** + build **DEBUG**.
 */
data class DevE2EAccount(
    val label: String,
    val email: String,
    val testTag: String,
)

object DevE2EAccounts {
    const val PASSWORD = "admin123"

    val entries: List<DevE2EAccount> = listOf(
        DevE2EAccount("Client", "e2e+client@colisdirect.test", "e2e_login_client"),
        DevE2EAccount("Point relais", "e2e+relay@colisdirect.test", "e2e_login_relay"),
        DevE2EAccount("Transporteur", "e2e+transporter@colisdirect.test", "e2e_login_transporter"),
        DevE2EAccount("Admin", "e2e+admin@colisdirect.test", "e2e_login_admin"),
        DevE2EAccount("Support", "e2e+support@colisdirect.test", "e2e_login_support"),
    )

    val isEnabled: Boolean
        get() = BuildConfig.DEBUG && BuildConfig.ENV == "dev"
}
