package ci.colisdirect.app.ui.screens.client

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.theme.Gray50
import ci.colisdirect.app.ui.theme.Gray600
import ci.colisdirect.app.ui.theme.Gray900
import ci.colisdirect.app.ui.theme.OrangePrimary
import ci.colisdirect.app.viewmodel.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileEditScreen(
    onBack: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val state by authViewModel.uiState.collectAsState()
    val user = state.user
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var commune by remember { mutableStateOf("") }
    var saved by remember { mutableStateOf(false) }

    LaunchedEffect(user?.id) {
        firstName = user?.firstName.orEmpty()
        lastName = user?.lastName.orEmpty()
        phone = user?.phone.orEmpty()
        commune = user?.commune.orEmpty()
    }

    ProfileScaffold(title = "Informations personnelles", onBack = onBack) {
        OutlinedTextField(
            value = firstName,
            onValueChange = { firstName = it },
            label = { Text("Prénom") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = lastName,
            onValueChange = { lastName = it },
            label = { Text("Nom") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = user?.email.orEmpty(),
            onValueChange = {},
            label = { Text("E-mail") },
            modifier = Modifier.fillMaxWidth(),
            enabled = false,
            singleLine = true,
        )
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Téléphone") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
        )
        OutlinedTextField(
            value = commune,
            onValueChange = { commune = it },
            label = { Text("Commune") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        state.error?.let { err ->
            Text(err, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
        }
        if (saved) {
            Text("Profil enregistré.", color = Color(0xFF16A34A), fontSize = 13.sp)
        }
        Button(
            onClick = {
                saved = false
                authViewModel.updateProfile(firstName, lastName, phone, commune) { ok ->
                    if (ok) saved = true
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isLoading && firstName.isNotBlank() && lastName.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            shape = RoundedCornerShape(12.dp),
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.White,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Enregistrer")
            }
        }
        Text(
            "Pour modifier l'e-mail, contactez le support.",
            fontSize = 12.sp,
            color = Gray600,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfilePaymentMethodsScreen(
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    ProfileScaffold(title = "Moyens de paiement", onBack = onBack) {
        Text(
            "Paiement en ligne via Paystack (Mobile Money, carte). Les moyens enregistrés côté compte seront gérés ici prochainement.",
            fontSize = 14.sp,
            color = Gray600,
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                CustomTabsIntent.Builder().build()
                    .launchUrl(context, Uri.parse("https://colisdirect.com"))
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text("Voir les options sur le site")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSettingsScreen(
    onBack: () -> Unit,
) {
    var notifEnabled by remember { mutableStateOf(true) }
    ProfileScaffold(title = "Paramètres", onBack = onBack) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(Color.White),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Notifications push", fontWeight = FontWeight.SemiBold, color = Gray900)
                    Text("Bientôt disponible", fontSize = 12.sp, color = Gray600)
                }
                Switch(
                    checked = notifEnabled,
                    onCheckedChange = { notifEnabled = it },
                    enabled = false,
                )
            }
        }
        Text(
            "Langue, sécurité et préférences avancées arrivent dans une mise à jour ultérieure.",
            fontSize = 13.sp,
            color = Gray600,
            modifier = Modifier.padding(top = 12.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileScaffold(
    title: String,
    onBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
        containerColor = Gray50,
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}
