package ci.colisdirect.app.domain

/**
 * Règles d'affichage alignées sur l'app web (`App.tsx`, dashboards par rôle).
 * Une seule source de vérité pour onglets, menus profil et modules.
 */
object ProfileVisibility {

    const val PRO = "pro"
    const val SUPPORT_SUPERVISOR = "support_supervisor"

    private val STAFF_ROLES = setOf(
        UserRoles.ADMIN,
        UserRoles.SUPPORT,
        SUPPORT_SUPERVISOR,
        UserRoles.RELAY_PARTNER,
        UserRoles.TRANSPORTER,
    )

    /** Route shell dédiée après connexion (équivalent redirection `App.tsx`). */
    fun dedicatedShellRoute(role: String?): String? = when (role) {
        UserRoles.TRANSPORTER -> "courier_main"
        UserRoles.RELAY_PARTNER -> "relay_main"
        UserRoles.ADMIN -> "admin_main"
        UserRoles.SUPPORT, SUPPORT_SUPERVISOR -> "support_main"
        else -> null
    }

    fun usesDedicatedShell(role: String?): Boolean = dedicatedShellRoute(role) != null

    /**
     * Espace client « Mon espace » (`UserMenu.tsx` — exclut admin, support, relais, transporteur).
     * Inclut `pro` et client `is_pro` (dual client/pro web).
     */
    fun canAccessClientSpace(role: String?, isPro: Boolean?): Boolean {
        if (role == null) return true
        if (role in STAFF_ROLES) return false
        if (role == PRO) return true
        if (role == UserRoles.CLIENT && isPro == true) return true
        return role == UserRoles.CLIENT
    }

    enum class ClientProfileItem {
        EDIT_PROFILE,
        ADDRESS_BOOK,
        PAYMENT_HISTORY,
        PAYMENT_METHODS,
        PARTNER,
        SETTINGS,
        LEGAL,
        SUPPORT,
    }

    fun visibleClientProfileItems(role: String?, isPro: Boolean?): Set<ClientProfileItem> {
        if (!canAccessClientSpace(role, isPro)) return emptySet()
        return ClientProfileItem.entries.toSet()
    }

    /** Onglets barre admin (`AdminDashboard` — accès complet). */
    enum class AdminTab { HOME, SHIPMENTS, NETWORK, SUPPORT, PROFILE }

    fun visibleAdminTabs(isAdmin: Boolean): List<AdminTab> =
        if (isAdmin) AdminTab.entries else emptyList()

    /** Modules menu profil admin (web : toute la nav latérale admin). */
    enum class AdminProfileModule {
        USERS,
        RELAY_POINTS,
        RELAY_APPLICATIONS,
        TRANSPORTER_APPLICATIONS,
        SHIPMENTS,
        ESCALATED_TICKETS,
        DELIVERY_ZONES,
        PRICING,
        PROMO_CODES,
        BATCH_DISPATCH,
        MARKETPLACE_FINANCE,
        JOB_POSTINGS,
        API_KEYS,
        SYSTEM_SETTINGS,
        WEB_CONSOLE,
    }

    fun visibleAdminProfileModules(isAdmin: Boolean): Set<AdminProfileModule> =
        if (isAdmin) AdminProfileModule.entries.toSet() else emptySet()

    /** Onglets support (`CustomerSupportDashboard` — pas de gestion réseau/envois). */
    enum class SupportTab { OVERVIEW, TICKETS, RELAY_CASH, PROFILE }

    fun visibleSupportTabs(role: String?): List<SupportTab> =
        if (isSupportStaff(role)) SupportTab.entries else emptyList()

    fun isSupportStaff(role: String?): Boolean =
        role == UserRoles.SUPPORT || role == SUPPORT_SUPERVISOR

    /** Onglets relais (`RelayDashboard` DESKTOP_TABS). */
    enum class RelayTab { OVERVIEW, PAYMENTS, COLIS, ASSISTANCE, SETTINGS }

    fun visibleRelayTabs(): List<RelayTab> = RelayTab.entries

    /** Actions opérationnelles — onglet Assistance, pas Paramètres. */
    enum class RelayAssistanceAction {
        INTAKE,
        DELIVERY_CONFIRM,
        PHONE_SEARCH,
    }

    fun visibleRelayAssistanceActions(): Set<RelayAssistanceAction> =
        RelayAssistanceAction.entries.toSet()

    /** Menu profil livreur (`TransporterSpace` ProfileMenu). */
    enum class CourierProfileItem {
        PERSONAL_INFO,
        DOCUMENTS,
        PAYMENTS,
        EARNINGS_DETAIL,
        DELIVERY_HISTORY,
        NOTIFICATIONS,
        SUPPORT,
        ACCOUNT_SETTINGS,
        AVAILABILITY_TOGGLE,
        REFRESH,
        LOGOUT,
    }

    fun visibleCourierProfileItems(): Set<CourierProfileItem> =
        CourierProfileItem.entries.toSet()

    /** Éléments réservés à l'admin dans la synthèse profil (support n'y a pas accès API). */
    fun canSeeAdminPlatformSummary(isAdmin: Boolean): Boolean = isAdmin

    fun canLoadAdminManagementApis(isAdmin: Boolean): Boolean = isAdmin

    fun canSeeEscalatedTicketsOnly(isAdmin: Boolean): Boolean = isAdmin

    fun defaultSupportTicketFilter(isAdmin: Boolean): String? =
        if (isAdmin) "escalated" else null
}
