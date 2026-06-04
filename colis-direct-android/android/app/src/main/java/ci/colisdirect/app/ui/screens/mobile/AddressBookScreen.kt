package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.RecipientAddressDto
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AddressBookViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressBookScreen(
    onBack: () -> Unit,
    selectionMode: Boolean = false,
    onSelect: ((RecipientAddressDto) -> Unit)? = null,
    onCreateShipment: (() -> Unit)? = null,
    viewModel: AddressBookViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) { viewModel.loadAddresses() }

    LaunchedEffect(state.error, state.successMessage) {
        state.error?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessages() }
        state.successMessage?.let { snackbarHostState.showSnackbar(it); viewModel.clearMessages() }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (selectionMode) "Sélectionner un destinataire" else "Carnet d'adresses",
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = OrangePrimary) }
            }
            state.addresses.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(Icons.Default.LocationOff, null, tint = Gray300, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Aucune adresse sauvegardée",
                        fontWeight = FontWeight.SemiBold,
                        color = Gray500,
                    )
                    Text(
                        "Vos adresses fréquentes apparaîtront ici",
                        fontSize = 13.sp,
                        color = Gray500,
                    )
                    if (!selectionMode && onCreateShipment != null) {
                        Spacer(Modifier.height(24.dp))
                        Button(
                            onClick = onCreateShipment,
                            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                        ) {
                            Icon(Icons.Default.Add, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Créer un envoi")
                        }
                    }
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    if (selectionMode) {
                        item {
                            Text(
                                "Sélectionnez un destinataire pour pré-remplir le formulaire.",
                                fontSize = 13.sp,
                                color = Gray500,
                            )
                        }
                    }
                    items(state.addresses, key = { it.id }) { addr ->
                        AddressCard(
                            address = addr,
                            selectionMode = selectionMode,
                            onSelect = { onSelect?.invoke(addr) },
                            onDelete = { viewModel.deleteAddress(addr.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AddressCard(
    address: RecipientAddressDto,
    selectionMode: Boolean,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Supprimer cette adresse ?") },
            confirmButton = {
                TextButton(onClick = { showDeleteDialog = false; onDelete() }) {
                    Text("Supprimer", color = Color(0xFFDC2626))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Annuler") }
            },
        )
    }

    Card(
        onClick = { if (selectionMode) onSelect() },
        enabled = selectionMode,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "${address.firstName} ${address.lastName}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                    Surface(
                        color = Color(0xFFFFF3E8),
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            address.commune,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = OrangePrimary,
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Phone, null, modifier = Modifier.size(12.dp), tint = Gray500)
                    Text(address.phone, fontSize = 12.sp, color = Gray500)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Home, null, modifier = Modifier.size(12.dp), tint = Gray500)
                    Text(
                        listOfNotNull(address.quartier, address.address).joinToString(", "),
                        fontSize = 12.sp,
                        color = Gray500,
                    )
                }
            }
            if (!selectionMode) {
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(Icons.Default.DeleteOutline, "Supprimer", tint = Gray500)
                }
            }
        }
    }
}
