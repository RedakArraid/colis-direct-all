package ci.colisdirect.app.ui.screens.relay

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.viewmodel.RelayViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryConfirmScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: RelayViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var trackingNumber by remember { mutableStateOf("") }
    var pickupCode by remember { mutableStateOf("") }
    var recipientIdentifier by remember { mutableStateOf("") }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
            trackingNumber = ""
            pickupCode = ""
            recipientIdentifier = ""
            onSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Remise colis client") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Retour") }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(8.dp))

            // Info banner
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(MaterialTheme.colorScheme.primaryContainer),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.PersonPin, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                    Column {
                        Text("Remise au client", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Vérifiez l'identité et le code de retrait avant de remettre le colis",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            OutlinedTextField(
                value = trackingNumber,
                onValueChange = { trackingNumber = it.uppercase().trim() },
                label = { Text("Numéro de suivi") },
                placeholder = { Text("CD...") },
                leadingIcon = { Icon(Icons.Default.Tag, null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            )

            OutlinedTextField(
                value = pickupCode,
                onValueChange = { pickupCode = it.trim() },
                label = { Text("Code de retrait *") },
                placeholder = { Text("6 chiffres") },
                leadingIcon = { Icon(Icons.Default.Lock, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            )

            OutlinedTextField(
                value = recipientIdentifier,
                onValueChange = { recipientIdentifier = it.trim() },
                label = { Text("Téléphone / Email destinataire (optionnel)") },
                placeholder = { Text("Pour double vérification") },
                leadingIcon = { Icon(Icons.Default.Person, null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            )

            state.error?.let {
                Card(
                    colors = CardDefaults.cardColors(MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = {
                    viewModel.completeDelivery(
                        trackingNumber = trackingNumber,
                        pickupCode = pickupCode,
                        recipientIdentifier = recipientIdentifier.ifBlank { null },
                    )
                },
                enabled = trackingNumber.isNotBlank() && pickupCode.isNotBlank() && !state.isLoading,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                    )
                } else {
                    Icon(Icons.Default.CheckCircle, null)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Confirmer la remise",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}
