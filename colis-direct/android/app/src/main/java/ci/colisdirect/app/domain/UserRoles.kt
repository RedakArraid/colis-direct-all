package ci.colisdirect.app.domain

object UserRoles {
    const val CLIENT = "client"
    const val PRO = ProfileVisibility.PRO
    const val RELAY_PARTNER = "relay_partner"
    const val TRANSPORTER = "transporter"
    const val ADMIN = "admin"
    const val SUPPORT = "support"
    const val SUPPORT_SUPERVISOR = ProfileVisibility.SUPPORT_SUPERVISOR

    fun isClient(role: String?): Boolean = role == CLIENT

    fun isRelayPartner(role: String?): Boolean = role == RELAY_PARTNER

    fun isTransporter(role: String?): Boolean = role == TRANSPORTER

    fun isAdmin(role: String?): Boolean = role == ADMIN

    fun isSupport(role: String?): Boolean =
        role == SUPPORT || role == SUPPORT_SUPERVISOR

    fun isStaff(role: String?): Boolean = isAdmin(role) || isSupport(role)

    fun usesDedicatedShell(role: String?): Boolean = ProfileVisibility.usesDedicatedShell(role)
}
