package ci.colisdirect.app.data.repository

import ci.colisdirect.app.data.api.ApiService
import ci.colisdirect.app.data.api.model.AuthResponse
import ci.colisdirect.app.data.api.model.SignInRequest
import ci.colisdirect.app.data.api.model.SignUpRequest
import ci.colisdirect.app.data.api.model.UserDto
import ci.colisdirect.app.data.local.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult<out T> {
    data class Success<T>(val data: T) : AuthResult<T>()
    data class Error(val message: String) : AuthResult<Nothing>()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenManager: TokenManager,
) {
    suspend fun signIn(
        emailOrPhone: String,
        password: String,
        usePhone: Boolean = false
    ): AuthResult<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val request = if (usePhone) {
                SignInRequest(phone = emailOrPhone, password = password)
            } else {
                SignInRequest(email = emailOrPhone, password = password)
            }
            val response = api.signIn(request)
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenManager.saveToken(body.token)
                tokenManager.saveUserInfo(
                    userId = body.user.id,
                    email = body.user.email,
                    role = body.user.role,
                    firstName = body.user.firstName,
                    lastName = body.user.lastName,
                    relayPointId = body.user.relayPointId,
                )
                AuthResult.Success(body)
            } else {
                val errorMsg = response.errorBody()?.string()
                    ?.let { parseErrorMessage(it) }
                    ?: "Email ou mot de passe incorrect"
                AuthResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            AuthResult.Error("Erreur de connexion : ${e.localizedMessage}")
        }
    }

    suspend fun signUp(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
    ): AuthResult<AuthResponse> = withContext(Dispatchers.IO) {
        try {
            val request = SignUpRequest(email, password, firstName, lastName, phone)
            val response = api.signUp(request)
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenManager.saveToken(body.token)
                tokenManager.saveUserInfo(
                    userId = body.user.id,
                    email = body.user.email,
                    role = body.user.role,
                    firstName = body.user.firstName,
                    lastName = body.user.lastName,
                )
                AuthResult.Success(body)
            } else {
                val errorMsg = response.errorBody()?.string()
                    ?.let { parseErrorMessage(it) }
                    ?: "Erreur lors de l'inscription"
                AuthResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            AuthResult.Error("Erreur de connexion : ${e.localizedMessage}")
        }
    }

    suspend fun getMe(): AuthResult<UserDto> = withContext(Dispatchers.IO) {
        try {
            val response = api.getMe()
            if (response.isSuccessful) {
                val user = response.body()!!.user
                tokenManager.saveUserInfo(
                    userId = user.id,
                    email = user.email,
                    role = user.role,
                    firstName = user.firstName,
                    lastName = user.lastName,
                    relayPointId = user.relayPointId,
                )
                AuthResult.Success(user)
            } else {
                AuthResult.Error("Session expirée")
            }
        } catch (e: Exception) {
            AuthResult.Error(e.localizedMessage ?: "Erreur réseau")
        }
    }

    fun signOut() {
        tokenManager.clearAll()
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()

    fun getCurrentRole(): String? = tokenManager.getUserRole()

    private fun parseErrorMessage(errorBody: String): String {
        return try {
            val json = org.json.JSONObject(errorBody)
            json.optString("error", errorBody)
        } catch (e: Exception) {
            errorBody
        }
    }
}
