package ci.colisdirect.app.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "colisdirect_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_FIRST_NAME = "user_first_name"
        private const val KEY_USER_LAST_NAME = "user_last_name"
        private const val KEY_RELAY_POINT_ID = "relay_point_id"
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun isLoggedIn(): Boolean = !getToken().isNullOrBlank()

    fun saveUserInfo(
        userId: String,
        email: String,
        role: String,
        firstName: String,
        lastName: String,
        relayPointId: String? = null,
    ) {
        prefs.edit()
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROLE, role)
            .putString(KEY_USER_FIRST_NAME, firstName)
            .putString(KEY_USER_LAST_NAME, lastName)
            .putString(KEY_RELAY_POINT_ID, relayPointId)
            .apply()
    }

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)
    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)
    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)
    fun getUserFirstName(): String? = prefs.getString(KEY_USER_FIRST_NAME, null)
    fun getUserLastName(): String? = prefs.getString(KEY_USER_LAST_NAME, null)
    fun getRelayPointId(): String? = prefs.getString(KEY_RELAY_POINT_ID, null)
    fun getFullName(): String = "${getUserFirstName() ?: ""} ${getUserLastName() ?: ""}".trim()

    fun clearAll() {
        prefs.edit().clear().apply()
    }
}
