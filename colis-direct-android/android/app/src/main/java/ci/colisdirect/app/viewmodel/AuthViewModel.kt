package ci.colisdirect.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ci.colisdirect.app.data.api.model.UserDto
import ci.colisdirect.app.data.local.TokenManager
import ci.colisdirect.app.data.repository.AuthRepository
import ci.colisdirect.app.data.repository.AuthResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        if (authRepository.isLoggedIn()) {
            refreshUser()
        }
    }

    fun signIn(emailOrPhone: String, password: String, usePhone: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = authRepository.signIn(emailOrPhone, password, usePhone)) {
                is AuthResult.Success -> {
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        user = result.data.user,
                        isLoggedIn = true,
                    )
                }
                is AuthResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message,
                    )
                }
            }
        }
    }

    fun signUp(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            when (val result = authRepository.signUp(email, password, firstName, lastName, phone)) {
                is AuthResult.Success -> {
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        user = result.data.user,
                        isLoggedIn = true,
                    )
                }
                is AuthResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message,
                    )
                }
            }
        }
    }

    fun signOut() {
        authRepository.signOut()
        _uiState.value = AuthUiState()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun getCurrentRole(): String? = authRepository.getCurrentRole()

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()

    private fun refreshUser() {
        viewModelScope.launch {
            when (val result = authRepository.getMe()) {
                is AuthResult.Success -> {
                    _uiState.value = AuthUiState(
                        user = result.data,
                        isLoggedIn = true,
                    )
                }
                is AuthResult.Error -> {
                    // Token invalide ou expiré
                    authRepository.signOut()
                    _uiState.value = AuthUiState()
                }
            }
        }
    }
}
