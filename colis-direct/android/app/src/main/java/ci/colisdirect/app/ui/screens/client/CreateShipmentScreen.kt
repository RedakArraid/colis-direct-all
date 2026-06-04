package ci.colisdirect.app.ui.screens.client

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ci.colisdirect.app.data.api.model.CreateShipmentRequest
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.domain.CreateShipmentValidation
import ci.colisdirect.app.domain.DeliveryModeCard
import ci.colisdirect.app.domain.PricingHelper
import ci.colisdirect.app.domain.formatFcfa
import ci.colisdirect.app.ui.components.CommuneDropdown
import ci.colisdirect.app.ui.theme.Gray900
import ci.colisdirect.app.ui.theme.InterFontFamily
import ci.colisdirect.app.ui.theme.OrangePrimary
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateShipmentScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    savedStateHandle: SavedStateHandle? = null,
    onOpenAddressBook: () -> Unit = {},
    onNavigateToPayment: (trackingNumber: String, amountFcfa: Int, routeLabel: String) -> Unit = { _, _, _ -> },
    onNavigateToCheckout: (trackingNumber: String, relayCash: Boolean) -> Unit = { _, _ -> },
    viewModel: ClientViewModel = appClientViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val authState by authViewModel.uiState.collectAsState()
    var currentStep by remember { mutableIntStateOf(0) }

    var senderFirstName by remember { mutableStateOf("") }
    var senderLastName by remember { mutableStateOf("") }
    var senderPhone by remember { mutableStateOf("") }
    var senderCommune by remember { mutableStateOf("") }
    var senderQuartier by remember { mutableStateOf("") }
    var senderAddress by remember { mutableStateOf("") }
    var senderRepere by remember { mutableStateOf("") }

    var recipientFirstName by remember { mutableStateOf("") }
    var recipientLastName by remember { mutableStateOf("") }
    var recipientPhone by remember { mutableStateOf("") }
    var recipientCommune by remember { mutableStateOf("") }
    var recipientQuartier by remember { mutableStateOf("") }
    var recipientAddress by remember { mutableStateOf("") }
    var recipientRepere by remember { mutableStateOf("") }

    var localError by remember { mutableStateOf<String?>(null) }
    var gridType by remember { mutableStateOf("colis") }
    var packageType by remember { mutableStateOf("petit") }
    var weight by remember { mutableStateOf("1.0") }
    var isFragile by remember { mutableStateOf(false) }
    var isInsured by remember { mutableStateOf(false) }
    var paymentMethod by remember { mutableStateOf("relay_cash") }
    var pickupMethod by remember { mutableStateOf("relay_deposit") }
    var homeDelivery by remember { mutableStateOf(false) }
    var originRelayId by remember { mutableStateOf<String?>(null) }
    var destinationRelayId by remember { mutableStateOf<String?>(null) }
    var saveRecipientToBook by remember { mutableStateOf(false) }

    val isLoggedIn = authState.isLoggedIn && authState.user != null
    val steps = listOf("Informations", "Mode", "Relais", "Récap")
    val weightVal = weight.toDoubleOrNull() ?: 1.0

    val bookApplied = savedStateHandle
        ?.getStateFlow("book_applied", false)
        ?.collectAsStateWithLifecycle()
        ?: remember { mutableStateOf(false) }

    LaunchedEffect(bookApplied.value) {
        if (!bookApplied.value || savedStateHandle == null) return@LaunchedEffect
        savedStateHandle.get<String>("book_r_fname")?.let { if (it.isNotBlank()) recipientFirstName = it }
        savedStateHandle.get<String>("book_r_lname")?.let { if (it.isNotBlank()) recipientLastName = it }
        savedStateHandle.get<String>("book_r_phone")?.let { if (it.isNotBlank()) recipientPhone = it }
        savedStateHandle.get<String>("book_r_commune")?.let { if (it.isNotBlank()) recipientCommune = it }
        savedStateHandle.get<String>("book_r_quartier")?.let { if (it.isNotBlank()) recipientQuartier = it }
        savedStateHandle.get<String>("book_r_address")?.let { if (it.isNotBlank()) recipientAddress = it }
        savedStateHandle["book_applied"] = false
    }

    LaunchedEffect(Unit) { viewModel.loadRelayPoints() }

    LaunchedEffect(authState.user) {
        authState.user?.let { user ->
            if (senderFirstName.isBlank()) senderFirstName = user.firstName
            if (senderLastName.isBlank()) senderLastName = user.lastName
            if (senderPhone.isBlank()) senderPhone = user.phone?.replace("+225", "")?.trim() ?: ""
            if (senderCommune.isBlank()) senderCommune = user.commune ?: ""
            if (senderQuartier.isBlank()) senderQuartier = user.quartier ?: ""
        }
    }

    LaunchedEffect(senderCommune, recipientCommune, packageType, gridType, weight) {
        if (senderCommune.isNotBlank() && recipientCommune.isNotBlank()) {
            viewModel.loadPricing(senderCommune, recipientCommune, packageType, gridType, weightVal)
        }
    }

    val displayPrice = viewModel.resolveDisplayPrice(
        senderCommune, recipientCommune, gridType, packageType, weightVal,
        pickupMethod, homeDelivery, isFragile, isInsured,
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        steps.getOrElse(currentStep) { "Envoyer un colis" },
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        when {
                            currentStep == 3 && pickupMethod == "home_pickup" && homeDelivery -> currentStep = 1
                            currentStep > 0 -> currentStep--
                            else -> onBack()
                        }
                    }) {
                        Icon(Icons.Default.ArrowBack, "Retour")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Gray900,
                ),
            )
        },
        containerColor = Color(0xFFF6F7F9),
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                steps.forEachIndexed { index, label ->
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        LinearProgressIndicator(
                            progress = { if (index <= currentStep) 1f else 0f },
                            modifier = Modifier.fillMaxWidth().height(3.dp),
                            color = OrangePrimary,
                        )
                        Text(
                            label,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (index <= currentStep) OrangePrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                AnimatedContent(targetState = currentStep, label = "step") { step ->
                    when (step) {
                        0 -> InformationsStep(
                            isLoggedIn = isLoggedIn,
                            onOpenAddressBook = if (isLoggedIn) onOpenAddressBook else null,
                            saveRecipientToBook = saveRecipientToBook,
                            onSaveRecipientToBookChange = { saveRecipientToBook = it },
                            showSaveRecipientOption = isLoggedIn,
                            senderFirstName = senderFirstName,
                            senderLastName = senderLastName,
                            senderPhone = senderPhone,
                            senderCommune = senderCommune,
                            senderQuartier = senderQuartier,
                            senderAddress = senderAddress,
                            senderRepere = senderRepere,
                            onSenderFirstNameChange = { senderFirstName = it },
                            onSenderLastNameChange = { senderLastName = it },
                            onSenderPhoneChange = { senderPhone = it },
                            onSenderCommuneChange = { senderCommune = it },
                            onSenderQuartierChange = { senderQuartier = it },
                            onSenderAddressChange = { senderAddress = it },
                            onSenderRepereChange = { senderRepere = it },
                            recipientFirstName = recipientFirstName,
                            recipientLastName = recipientLastName,
                            recipientPhone = recipientPhone,
                            recipientCommune = recipientCommune,
                            recipientQuartier = recipientQuartier,
                            recipientAddress = recipientAddress,
                            recipientRepere = recipientRepere,
                            onRecipientFirstNameChange = { recipientFirstName = it },
                            onRecipientLastNameChange = { recipientLastName = it },
                            onRecipientPhoneChange = { recipientPhone = it },
                            onRecipientCommuneChange = { recipientCommune = it },
                            onRecipientQuartierChange = { recipientQuartier = it },
                            onRecipientAddressChange = { recipientAddress = it },
                            onRecipientRepereChange = { recipientRepere = it },
                            gridType = gridType,
                            onGridTypeChange = { gridType = it },
                            packageType = packageType,
                            onPackageTypeChange = { packageType = it },
                            weight = weight,
                            onWeightChange = { weight = it },
                            isFragile = isFragile,
                            isInsured = isInsured,
                            onFragileChange = { isFragile = it },
                            onInsuredChange = { isInsured = it },
                        )
                        1 -> DeliveryModeStep(
                            senderCommune = senderCommune,
                            recipientCommune = recipientCommune,
                            gridType = gridType,
                            packageType = packageType,
                            pickupMethod = pickupMethod,
                            homeDelivery = homeDelivery,
                            pricingLoading = state.pricingLoading,
                            pricing = state.pricing,
                            onSelectMode = { pm, hd ->
                                pickupMethod = pm
                                homeDelivery = hd
                            },
                            priceFor = { pm, hd ->
                                viewModel.resolveDisplayPrice(
                                    senderCommune, recipientCommune, gridType, packageType, weightVal,
                                    pm, hd, isFragile, isInsured,
                                )
                            },
                        )
                        2 -> RelayStep(
                            relayPoints = state.relayPoints,
                            pickupMethod = pickupMethod,
                            homeDelivery = homeDelivery,
                            originRelayId = originRelayId,
                            destinationRelayId = destinationRelayId,
                            onOriginRelayChange = { originRelayId = it },
                            onDestinationRelayChange = { destinationRelayId = it },
                        )
                        3 -> SummaryStep(
                            senderName = "$senderFirstName $senderLastName".trim(),
                            recipientName = "$recipientFirstName $recipientLastName".trim(),
                            route = "$senderCommune → $recipientCommune",
                            pickupMethod = pickupMethod,
                            homeDelivery = homeDelivery,
                            weight = weight,
                            gridType = gridType,
                            packageType = packageType,
                            priceFcfa = displayPrice,
                            paymentMethod = paymentMethod,
                            onPaymentMethodChange = { paymentMethod = it },
                        )
                        else -> Unit
                    }
                }

                (localError ?: state.error)?.let {
                    Card(
                        colors = CardDefaults.cardColors(MaterialTheme.colorScheme.errorContainer),
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp))
                    }
                }
            }

            Surface(shadowElevation = 8.dp) {
                Button(
                    onClick = {
                        localError = null
                        if (currentStep < 3) {
                            when (currentStep) {
                                0 -> {
                                    localError = CreateShipmentValidation.validateStepInformations(
                                        isLoggedIn, senderFirstName, senderLastName, senderPhone,
                                        senderCommune, senderQuartier, senderAddress,
                                        recipientFirstName, recipientLastName, recipientPhone,
                                        recipientCommune, recipientQuartier, recipientAddress,
                                        weight,
                                    )
                                    if (localError != null) return@Button
                                    currentStep++
                                }
                                1 -> {
                                    if (pickupMethod == "home_pickup" && homeDelivery) {
                                        currentStep = 3
                                    } else {
                                        currentStep++
                                    }
                                }
                                2 -> {
                                    localError = CreateShipmentValidation.validateStepRelays(
                                        pickupMethod, homeDelivery, originRelayId, destinationRelayId,
                                    )
                                    if (localError != null) return@Button
                                    currentStep++
                                }
                            }
                        } else {
                            val request = CreateShipmentRequest(
                                senderFirstName = senderFirstName,
                                senderLastName = senderLastName,
                                senderPhone = senderPhone,
                                senderEmail = authState.user?.email,
                                senderCommune = senderCommune,
                                senderQuartier = senderQuartier,
                                senderAddress = senderAddress.ifBlank { null },
                                senderRepere = senderRepere.ifBlank { null },
                                recipientFirstName = recipientFirstName,
                                recipientLastName = recipientLastName,
                                recipientPhone = recipientPhone,
                                recipientEmail = null,
                                recipientCommune = recipientCommune,
                                recipientQuartier = recipientQuartier,
                                recipientAddress = recipientAddress.ifBlank { null },
                                recipientRepere = recipientRepere.ifBlank { null },
                                packageType = packageType,
                                gridType = gridType,
                                weight = weightVal,
                                paymentMethod = if (paymentMethod == "relay_cash") "relay_cash" else "paystack",
                                pickupMethod = pickupMethod,
                                homeDelivery = homeDelivery,
                                originRelayId = if (pickupMethod == "relay_deposit") originRelayId else null,
                                destinationRelayId = if (!homeDelivery) destinationRelayId else null,
                            )
                            viewModel.createShipment(request, saveRecipientToBook = saveRecipientToBook) { shipment ->
                                when (paymentMethod) {
                                    "relay_cash" -> onNavigateToCheckout(shipment.trackingNumber, true)
                                    else -> {
                                        val routeLabel = "${senderCommune}_to_${recipientCommune}"
                                        onNavigateToPayment(
                                            shipment.trackingNumber,
                                            displayPrice,
                                            routeLabel,
                                        )
                                    }
                                }
                            }
                        }
                    },
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth().padding(16.dp).height(52.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(
                            when {
                                currentStep < 3 -> "Continuer"
                                else -> "Confirmer · ${formatFcfa(displayPrice)}"
                            },
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InformationsStep(
    isLoggedIn: Boolean,
    onOpenAddressBook: (() -> Unit)? = null,
    showSaveRecipientOption: Boolean = false,
    saveRecipientToBook: Boolean = false,
    onSaveRecipientToBookChange: (Boolean) -> Unit = {},
    senderFirstName: String, senderLastName: String, senderPhone: String, senderCommune: String, senderQuartier: String,
    senderAddress: String, senderRepere: String,
    onSenderFirstNameChange: (String) -> Unit, onSenderLastNameChange: (String) -> Unit,
    onSenderPhoneChange: (String) -> Unit, onSenderCommuneChange: (String) -> Unit, onSenderQuartierChange: (String) -> Unit,
    onSenderAddressChange: (String) -> Unit, onSenderRepereChange: (String) -> Unit,
    recipientFirstName: String, recipientLastName: String, recipientPhone: String, recipientCommune: String, recipientQuartier: String,
    recipientAddress: String, recipientRepere: String,
    onRecipientFirstNameChange: (String) -> Unit, onRecipientLastNameChange: (String) -> Unit,
    onRecipientPhoneChange: (String) -> Unit, onRecipientCommuneChange: (String) -> Unit, onRecipientQuartierChange: (String) -> Unit,
    onRecipientAddressChange: (String) -> Unit, onRecipientRepereChange: (String) -> Unit,
    gridType: String, onGridTypeChange: (String) -> Unit,
    packageType: String, onPackageTypeChange: (String) -> Unit,
    weight: String, onWeightChange: (String) -> Unit,
    isFragile: Boolean, isInsured: Boolean,
    onFragileChange: (Boolean) -> Unit, onInsuredChange: (Boolean) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Expéditeur", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        if (isLoggedIn) {
            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(Color.White)) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("🔒 Profil connecté", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("$senderFirstName $senderLastName", fontWeight = FontWeight.SemiBold)
                }
            }
            OutlinedTextField(senderPhone, onSenderPhoneChange, label = { Text("Téléphone *") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), shape = RoundedCornerShape(12.dp))
            CommuneDropdown("Commune *", senderCommune, onSenderCommuneChange)
            OutlinedTextField(senderQuartier, onSenderQuartierChange, label = { Text("Quartier *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(senderAddress, onSenderAddressChange, label = { Text("Adresse précise *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(senderRepere, onSenderRepereChange, label = { Text("Repère (optionnel)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(senderFirstName, onSenderFirstNameChange, label = { Text("Prénom") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                OutlinedTextField(senderLastName, onSenderLastNameChange, label = { Text("Nom") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
            }
            OutlinedTextField(senderPhone, onSenderPhoneChange, label = { Text("Téléphone *") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), shape = RoundedCornerShape(12.dp))
            CommuneDropdown("Commune *", senderCommune, onSenderCommuneChange)
            OutlinedTextField(senderQuartier, onSenderQuartierChange, label = { Text("Quartier *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(senderAddress, onSenderAddressChange, label = { Text("Adresse précise *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(senderRepere, onSenderRepereChange, label = { Text("Repère (optionnel)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        }

        HorizontalDivider()
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Destinataire", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (onOpenAddressBook != null) {
                FilledTonalButton(
                    onClick = onOpenAddressBook,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = OrangePrimary, contentColor = Color.White),
                ) {
                    Icon(Icons.Default.MenuBook, null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Carnet", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(recipientFirstName, onRecipientFirstNameChange, label = { Text("Prénom") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
            OutlinedTextField(recipientLastName, onRecipientLastNameChange, label = { Text("Nom") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
        }
        OutlinedTextField(recipientPhone, onRecipientPhoneChange, label = { Text("Téléphone *") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), shape = RoundedCornerShape(12.dp))
        CommuneDropdown("Commune *", recipientCommune, onRecipientCommuneChange)
        OutlinedTextField(recipientQuartier, onRecipientQuartierChange, label = { Text("Quartier *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        OutlinedTextField(recipientAddress, onRecipientAddressChange, label = { Text("Adresse précise *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        OutlinedTextField(recipientRepere, onRecipientRepereChange, label = { Text("Repère (optionnel)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        if (showSaveRecipientOption) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = saveRecipientToBook,
                    onCheckedChange = onSaveRecipientToBookChange,
                    colors = CheckboxDefaults.colors(checkedColor = OrangePrimary),
                )
                Text(
                    "Enregistrer ce destinataire dans mon carnet",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        Text("Colis", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = gridType == "courier", onClick = { onGridTypeChange("courier") }, label = { Text("✉️ Courrier") })
            FilterChip(selected = gridType == "colis", onClick = { onGridTypeChange("colis") }, label = { Text("📦 Colis") })
        }
        if (gridType == "colis") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("petit" to "Petit", "moyen" to "Moyen", "grand" to "Grand").forEach { (v, l) ->
                    FilterChip(selected = packageType == v, onClick = { onPackageTypeChange(v) }, label = { Text(l) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = isFragile, onClick = { onFragileChange(!isFragile) }, label = { Text("Fragile +500") })
                FilterChip(selected = isInsured, onClick = { onInsuredChange(!isInsured) }, label = { Text("Assuré +500") })
            }
        }
        OutlinedTextField(
            weight, onWeightChange,
            label = { Text("Poids (kg)") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            shape = RoundedCornerShape(12.dp),
        )
    }
}

@Composable
private fun DeliveryModeStep(
    senderCommune: String,
    recipientCommune: String,
    gridType: String,
    packageType: String,
    pickupMethod: String,
    homeDelivery: Boolean,
    pricingLoading: Boolean,
    pricing: ci.colisdirect.app.data.api.model.PricingCalculateResponse?,
    onSelectMode: (String, Boolean) -> Unit,
    priceFor: (String, Boolean) -> Int,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Choisissez votre mode", color = OrangePrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(
            "$senderCommune → $recipientCommune",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (pricingLoading) {
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = OrangePrimary)
        }
        val apiCheapest = pricing?.modes?.filter { it.available != false }?.minByOrNull { it.finalPriceFcfa }?.key
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            PricingHelper.deliveryModeCards.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { card ->
                        DeliveryModeCardUi(
                            card = card,
                            selected = pickupMethod == card.pickupMethod && homeDelivery == card.homeDelivery,
                            price = priceFor(card.pickupMethod, card.homeDelivery),
                            showBestPrice = (apiCheapest ?: "relay_to_relay") == card.key,
                            modifier = Modifier.weight(1f),
                            onClick = { onSelectMode(card.pickupMethod, card.homeDelivery) },
                        )
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
        Text("Paiement", style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun DeliveryModeCardUi(
    card: DeliveryModeCard,
    selected: Boolean,
    price: Int,
    showBestPrice: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = modifier.heightIn(min = 120.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(if (selected) Color(0xFFFFF3E8) else Color.White),
        border = BorderStroke(2.dp, if (selected) OrangePrimary else Color(0xFFE6E6E6)),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (showBestPrice) {
                Text("MEILLEUR PRIX", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
            }
            Text(card.emoji, fontSize = 20.sp)
            Text(card.label, fontWeight = FontWeight.Bold, fontSize = 11.sp)
            Text(formatFcfa(price), fontWeight = FontWeight.ExtraBold, color = OrangePrimary, fontSize = 13.sp)
        }
    }
}

@Composable
private fun RelayStep(
    relayPoints: List<RelayPointDto>,
    pickupMethod: String,
    homeDelivery: Boolean,
    originRelayId: String?,
    destinationRelayId: String?,
    onOriginRelayChange: (String?) -> Unit,
    onDestinationRelayChange: (String?) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Points relais", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        if (pickupMethod == "relay_deposit") {
            RelayDropdown("Relais de dépôt", relayPoints, originRelayId, onOriginRelayChange)
        }
        if (!homeDelivery) {
            RelayDropdown("Relais de livraison", relayPoints, destinationRelayId, onDestinationRelayChange)
        }
        if (pickupMethod == "home_pickup" && homeDelivery) {
            Text("Aucun relais requis pour ce mode.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RelayDropdown(
    label: String,
    relays: List<RelayPointDto>,
    selectedId: String?,
    onSelect: (String?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = relays.find { it.id == selectedId }

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected?.let { "${it.name} (${it.commune ?: ""})" } ?: "",
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(),
            shape = RoundedCornerShape(12.dp),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            relays.forEach { relay ->
                DropdownMenuItem(
                    text = { Text("${relay.name} — ${relay.commune ?: ""}") },
                    onClick = {
                        onSelect(relay.id)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun SummaryStep(
    senderName: String,
    recipientName: String,
    route: String,
    pickupMethod: String,
    homeDelivery: Boolean,
    paymentMethod: String,
    weight: String,
    gridType: String,
    packageType: String,
    priceFcfa: Int,
    onPaymentMethodChange: (String) -> Unit,
) {
    Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Récapitulatif", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("De : $senderName", style = MaterialTheme.typography.bodyMedium)
            Text("Pour : $recipientName", style = MaterialTheme.typography.bodyMedium)
            Text("Trajet : $route", style = MaterialTheme.typography.bodyMedium)
            Text(
                "Colis : ${if (gridType == "courier") "Courrier" else packageType} · ${weight} kg",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                "Mode : ${PricingHelper.deliveryModeCards.find { it.pickupMethod == pickupMethod && it.homeDelivery == homeDelivery }?.label ?: "—"}",
                style = MaterialTheme.typography.bodyMedium,
            )
            HorizontalDivider()
            Text(formatFcfa(priceFcfa), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = OrangePrimary)
        }
    }
    Text("Paiement", style = MaterialTheme.typography.labelMedium)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = paymentMethod == "relay_cash", onClick = { onPaymentMethodChange("relay_cash") }, label = { Text("Espèces relais") })
        FilterChip(selected = paymentMethod == "paystack", onClick = { onPaymentMethodChange("paystack") }, label = { Text("Carte") })
        FilterChip(selected = paymentMethod == "mobile_money", onClick = { onPaymentMethodChange("mobile_money") }, label = { Text("Mobile Money") })
    }
}
