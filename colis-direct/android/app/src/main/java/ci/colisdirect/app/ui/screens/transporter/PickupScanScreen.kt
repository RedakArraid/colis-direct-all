package ci.colisdirect.app.ui.screens.transporter

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.StatusBadge
import ci.colisdirect.app.viewmodel.TransporterViewModel

/** Saisie manuelle du n° de suivi — pas de scan caméra. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PickupScanScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: TransporterViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var trackingInput by remember { mutableStateOf("") }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
            onSuccess()
        }
    }

    fun lookup() {
        val code = trackingInput.trim()
        if (code.isNotBlank()) viewModel.lookupShipmentForPickup(code.uppercase())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Saisir un colis") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
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
            Spacer(Modifier.height(4.dp))

            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(MaterialTheme.colorScheme.primaryContainer),
            ) {
                Row(
                    Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.Edit, null, tint = MaterialTheme.colorScheme.primary)
                    Text(
                        "Tapez le numéro de suivi ou le code figurant sur l'étiquette.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            OutlinedTextField(
                value = trackingInput,
                onValueChange = { trackingInput = it.uppercase() },
                label = { Text("Numéro de suivi") },
                placeholder = { Text("Ex : CD202605290001CI") },
                leadingIcon = { Icon(Icons.Default.Tag, null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Characters,
                    imeAction = ImeAction.Search,
                ),
                keyboardActions = KeyboardActions(onSearch = { lookup() }),
            )

            Button(
                onClick = { lookup() },
                enabled = trackingInput.isNotBlank() && !state.isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.isLoading && state.scannedShipment == null) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Icon(Icons.Default.Search, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Rechercher le colis", fontWeight = FontWeight.Bold)
                }
            }

            state.error?.let { err ->
                Card(
                    colors = CardDefaults.cardColors(MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text(err, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.error)
                }
            }

            state.scannedShipment?.let { shipment ->
                Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                shipment.trackingNumber,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            StatusBadge(status = shipment.currentStatus ?: "")
                        }
                        Text("${shipment.recipientFirstName} ${shipment.recipientLastName} — ${shipment.recipientCommune}")
                        Text("${shipment.packageType} — ${shipment.weight} kg")

                        HorizontalDivider()

                        Button(
                            onClick = {
                                viewModel.carrierPickup(
                                    shipment.trackingNumber,
                                    shipment.originRelayId,
                                )
                            },
                            enabled = !state.isLoading,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(Icons.Default.CheckCircle, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Confirmer la collecte", fontWeight = FontWeight.SemiBold)
                        }
                        OutlinedButton(
                            onClick = { viewModel.clearMessages(); trackingInput = "" },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Saisir un autre colis")
                        }
                    }
                }
            }
        }
    }
}
