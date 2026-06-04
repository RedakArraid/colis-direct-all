package ci.colisdirect.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.BuildConfig
import ci.colisdirect.app.dev.DevE2EAccounts
import ci.colisdirect.app.ui.theme.InterFontFamily
import ci.colisdirect.app.ui.theme.NavyDark
import ci.colisdirect.app.ui.theme.OrangePrimary
import ci.colisdirect.app.ui.theme.Gray300
import ci.colisdirect.app.ui.theme.Gray50
import ci.colisdirect.app.ui.theme.Gray400
import ci.colisdirect.app.ui.theme.Gray500
import ci.colisdirect.app.ui.theme.Gray900
import ci.colisdirect.app.viewmodel.AuthViewModel

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onLoginSuccess: (String) -> Unit,
) {
    val authState by authViewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    var isSignup by remember { mutableStateOf(false) }
    var emailOrPhone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var signupEmail by remember { mutableStateOf("") }
    var signupPhone by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var usePhone by remember { mutableStateOf(false) }

    LaunchedEffect(authState.isLoggedIn) {
        if (authState.isLoggedIn && authState.user != null) {
            onLoginSuccess(authState.user!!.role)
        }
    }

    LaunchedEffect(authState.error) {
        if (authState.error != null) {
            kotlinx.coroutines.delay(4000)
            authViewModel.clearError()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState())
    ) {
        // ── Dark Navy Header (matches web left-panel style on mobile) ──────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(NavyDark)
                .padding(top = 56.dp, start = 28.dp, end = 28.dp, bottom = 40.dp),
        ) {
            Column {
                // Brand logo row
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(OrangePrimary),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Default.LocalShipping,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "COLISDIRECT",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 20.sp,
                        letterSpacing = (-0.5).sp,
                        color = Color.White,
                    )
                }

                Spacer(Modifier.height(28.dp))

                Text(
                    "Bienvenue 👋",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 30.sp,
                    letterSpacing = (-0.5).sp,
                    color = Color.White,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Connectez-vous pour gérer vos colis.",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Normal,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.75f),
                )
            }
        }

        // ── Form Section ────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(horizontal = 24.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = !isSignup,
                    onClick = { isSignup = false },
                    label = { Text("Connexion") },
                    modifier = Modifier.weight(1f),
                )
                FilterChip(
                    selected = isSignup,
                    onClick = { isSignup = true },
                    label = { Text("Inscription") },
                    modifier = Modifier.weight(1f),
                )
            }

            Text(
                if (isSignup) "Créer un compte" else "Se connecter",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 26.sp,
                letterSpacing = (-0.4).sp,
                color = Gray900,
            )

            if (isSignup) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    CdTextField(firstName, { firstName = it }, "Prénom", modifier = Modifier.weight(1f))
                    CdTextField(lastName, { lastName = it }, "Nom", modifier = Modifier.weight(1f))
                }
                CdTextField(signupEmail, { signupEmail = it }, "E-mail", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                CdTextField(signupPhone, { signupPhone = it }, "Téléphone", keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), placeholder = "07 XX XX XX XX")
            }

            if (!isSignup) Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "Connexion avec",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    color = Gray500,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.5.dp, Gray300, RoundedCornerShape(12.dp))
                        .background(Gray50)
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    // Email pill
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(9.dp))
                            .background(if (!usePhone) OrangePrimary else Color.Transparent)
                            .clickable { usePhone = false; emailOrPhone = "" }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "E-mail",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = if (!usePhone) Color.White else Gray500,
                        )
                    }
                    // Phone pill
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(9.dp))
                            .background(if (usePhone) OrangePrimary else Color.Transparent)
                            .clickable { usePhone = true; emailOrPhone = "" }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "Téléphone",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = if (usePhone) Color.White else Gray500,
                        )
                    }
                }
            }

            if (DevE2EAccounts.isEnabled && !isSignup) {
                DevQuickLoginSection(
                    isLoading = authState.isLoading,
                    onSignIn = { email ->
                        focusManager.clearFocus()
                        emailOrPhone = email
                        password = DevE2EAccounts.PASSWORD
                        authViewModel.signIn(email, DevE2EAccounts.PASSWORD, usePhone = false)
                    },
                )
            }

            if (!isSignup) CdTextField(
                value = emailOrPhone,
                onValueChange = { emailOrPhone = it },
                label = if (usePhone) "Numéro de téléphone" else "Adresse e-mail",
                leadingIcon = {
                    Icon(
                        if (usePhone) Icons.Default.Phone else Icons.Default.Email,
                        contentDescription = null,
                        tint = Gray500,
                        modifier = Modifier.size(18.dp),
                    )
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = if (usePhone) KeyboardType.Phone else KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                placeholder = if (usePhone) "07 XX XX XX XX" else "votre@email.com",
            )

            CdTextField(
                value = password,
                onValueChange = { password = it },
                label = "Mot de passe",
                leadingIcon = {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = null,
                        tint = Gray500,
                        modifier = Modifier.size(18.dp),
                    )
                },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null,
                            tint = Gray500,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        if (emailOrPhone.isNotBlank() && password.isNotBlank()) {
                            authViewModel.signIn(emailOrPhone, password, usePhone)
                        }
                    }
                ),
                placeholder = "••••••••",
            )

            if (isSignup) {
                CdTextField(
                    confirmPassword,
                    { confirmPassword = it },
                    "Confirmer le mot de passe",
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    placeholder = "••••••••",
                )
            }

            // Error message
            AnimatedVisibility(
                visible = authState.error != null,
                enter = fadeIn() + slideInVertically(),
                exit = fadeOut(),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFFFEE2E2))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.Error,
                        contentDescription = null,
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = authState.error ?: "",
                        color = Color(0xFF991B1B),
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                    )
                }
            }

            Button(
                onClick = {
                    focusManager.clearFocus()
                    if (isSignup) {
                        if (password != confirmPassword) return@Button
                        authViewModel.signUp(signupEmail, password, firstName, lastName, signupPhone)
                    } else {
                        authViewModel.signIn(emailOrPhone, password, usePhone)
                    }
                },
                enabled = if (isSignup) {
                    firstName.isNotBlank() && lastName.isNotBlank() && signupEmail.isNotBlank() &&
                        signupPhone.isNotBlank() && password.length >= 6 && password == confirmPassword && !authState.isLoading
                } else {
                    emailOrPhone.isNotBlank() && password.isNotBlank() && !authState.isLoading
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = OrangePrimary,
                    contentColor = Color.White,
                    disabledContainerColor = OrangePrimary.copy(alpha = 0.5f),
                ),
            ) {
                if (authState.isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(
                        if (isSignup) "Créer mon compte" else "Se connecter",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    )
                }
            }
        }

        // Footer
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "© 2026 COLISDIRECT — Côte d'Ivoire",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Normal,
                fontSize = 11.sp,
                color = Gray500,
            )
        }
    }
}

@Composable
private fun DevQuickLoginSection(
    isLoading: Boolean,
    onSignIn: (email: String) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            "Connexion rapide (dev)",
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
            color = Gray500,
        )
        Text(
            "API : ${BuildConfig.API_BASE_URL}",
            fontFamily = InterFontFamily,
            fontSize = 10.sp,
            color = Gray400,
            lineHeight = 14.sp,
        )
        DevE2EAccounts.entries.forEach { account ->
            OutlinedButton(
                onClick = { onSignIn(account.email) },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(account.testTag),
                enabled = !isLoading,
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(vertical = 10.dp, horizontal = 12.dp),
            ) {
                Text(
                    account.label,
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                )
            }
        }
    }
}

// ── Shared styled text field matching the web app input style ───────────────
@Composable
fun CdTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    placeholder: String = "",
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = modifier) {
        Text(
            label,
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 13.sp,
            color = Gray900,
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    placeholder,
                    fontFamily = InterFontFamily,
                    fontSize = 14.sp,
                    color = Gray500,
                )
            },
            leadingIcon = leadingIcon,
            trailingIcon = trailingIcon,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = OrangePrimary,
                unfocusedBorderColor = Gray300,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedTextColor = Gray900,
                unfocusedTextColor = Gray900,
            ),
            textStyle = androidx.compose.ui.text.TextStyle(
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Normal,
                fontSize = 14.sp,
            ),
        )
    }
}
