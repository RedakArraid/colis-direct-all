package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.CommuneDropdown
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.viewmodel.AuthViewModel
import ci.colisdirect.app.viewmodel.PartnerViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartnerScreen(
    onBack: () -> Unit,
    initialPartnerType: String? = null,
    authViewModel: AuthViewModel = hiltViewModel(),
    partnerViewModel: PartnerViewModel = hiltViewModel(),
) {
    val authState by authViewModel.uiState.collectAsState()
    val partnerState by partnerViewModel.uiState.collectAsState()
    val user = authState.user
    var showForm by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(initialPartnerType) {
        when (initialPartnerType?.lowercase()) {
            "livreur", "relais" -> showForm = initialPartnerType.lowercase()
        }
    }

    LaunchedEffect(partnerState.successMessage) {
        partnerState.successMessage?.let {
            showForm = null
            snackbarHostState.showSnackbar(it)
            partnerViewModel.clearMessages()
        }
    }

    LaunchedEffect(partnerState.error) {
        partnerState.error?.let {
            snackbarHostState.showSnackbar(it)
            partnerViewModel.clearMessages()
        }
    }

    if (showForm != null) {
        PartnerApplicationSheet(
            type = showForm!!,
            defaultName = user?.let { "${it.firstName} ${it.lastName}".trim() } ?: "",
            defaultPhone = user?.phone?.replace("+225", "")?.trim() ?: "",
            defaultEmail = user?.email ?: "",
            defaultCommune = user?.commune ?: "",
            isSubmitting = partnerState.isSubmitting,
            formError = partnerState.error,
            onDismiss = {
                showForm = null
                partnerViewModel.clearMessages()
            },
            onSubmitTransporter = { name, phone, email, commune, vehicle ->
                partnerViewModel.submitTransporter(name, phone, email, commune, vehicle)
            },
            onSubmitRelay = { name, phone, email, commune, quartier, address, shop, bizType ->
                partnerViewModel.submitRelay(name, phone, email, commune, quartier, address, shop, bizType)
            },
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Devenir partenaire", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(listOf(OrangePrimary, Color(0xFFFF8533))))
                    .padding(32.dp),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Rejoignez ColisDirect",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 22.sp,
                        color = Color.White,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Développez votre activité avec notre réseau de livraison en Côte d'Ivoire.",
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.85f),
                    )
                }
            }

            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                PartnerOptionCard(
                    iconBg = Brush.linearGradient(listOf(OrangePrimary, Color(0xFFFF8533))),
                    icon = { Icon(Icons.Default.DirectionsBike, null, tint = Color.White, modifier = Modifier.size(26.dp)) },
                    title = "Devenir livreur",
                    subtitle = "Livreur agréé ColisDirect",
                    benefits = listOf(
                        "Travaillez à votre rythme",
                        "Revenus complémentaires",
                        "Formation et équipement fournis",
                        "Application de gestion dédiée",
                    ),
                    buttonLabel = "Postuler comme livreur",
                    buttonColor = OrangePrimary,
                    onApply = { showForm = "livreur" },
                )
                PartnerOptionCard(
                    iconBg = Brush.linearGradient(listOf(Color(0xFF2F6BE0), Color(0xFF4F8DF7))),
                    icon = { Icon(Icons.Default.Store, null, tint = Color.White, modifier = Modifier.size(26.dp)) },
                    title = "Ouvrir un relais",
                    subtitle = "Point relais partenaire",
                    benefits = listOf(
                        "Revenus complémentaires garantis",
                        "Sans investissement matériel",
                        "Formation et support inclus",
                        "Réseau national de relais",
                    ),
                    buttonLabel = "Devenir point relais",
                    buttonColor = Color(0xFF2F6BE0),
                    onApply = { showForm = "relais" },
                )
            }
        }
    }
}

@Composable
private fun PartnerOptionCard(
    iconBg: Brush,
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
    benefits: List<String>,
    buttonLabel: String,
    buttonColor: Color,
    onApply: () -> Unit,
) {
    Card(shape = RoundedCornerShape(20.dp)) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(iconBg, RoundedCornerShape(16.dp)),
                    contentAlignment = Alignment.Center,
                ) { icon() }
                Column {
                    Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                    Text(subtitle, fontSize = 13.sp, color = Gray500)
                }
            }
            benefits.forEach { benefit ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF16A34A), modifier = Modifier.size(14.dp))
                    Text(benefit, fontSize = 13.sp, color = Gray900)
                }
            }
            Button(
                onClick = onApply,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text(buttonLabel, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PartnerApplicationSheet(
    type: String,
    defaultName: String,
    defaultPhone: String,
    defaultEmail: String,
    defaultCommune: String,
    isSubmitting: Boolean,
    formError: String?,
    onDismiss: () -> Unit,
    onSubmitTransporter: (String, String, String, String, String) -> Unit,
    onSubmitRelay: (String, String, String, String, String, String, String, String) -> Unit,
) {
    var name by remember { mutableStateOf(defaultName) }
    var phone by remember { mutableStateOf(defaultPhone) }
    var email by remember { mutableStateOf(defaultEmail) }
    var commune by remember { mutableStateOf(defaultCommune) }
    var quartier by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var shopName by remember { mutableStateOf("") }
    var businessType by remember { mutableStateOf("boutique") }
    var vehicle by remember { mutableStateOf("Moto") }
    var localError by remember { mutableStateOf<String?>(null) }
    val isRelay = type == "relais"
    val displayError = localError ?: formError

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                if (isRelay) "Candidature point relais" else "Candidature livreur",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
            Text(
                "Remplissez ce formulaire et notre équipe vous contactera sous 48h.",
                fontSize = 13.sp,
                color = Gray500,
            )
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Nom complet *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isSubmitting,
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Téléphone *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone),
                enabled = !isSubmitting,
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email),
                enabled = !isSubmitting,
            )
            CommuneDropdown("Commune *", commune, onSelect = { commune = it })
            if (isRelay) {
                OutlinedTextField(
                    value = shopName,
                    onValueChange = { shopName = it },
                    label = { Text("Nom du commerce *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isSubmitting,
                )
                var bizExpanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = bizExpanded, onExpandedChange = { bizExpanded = it }) {
                    OutlinedTextField(
                        value = businessType.replaceFirstChar { it.uppercase() },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Type d'établissement *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(bizExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        enabled = !isSubmitting,
                    )
                    ExposedDropdownMenu(expanded = bizExpanded, onDismissRequest = { bizExpanded = false }) {
                        listOf("boutique", "kiosque", "supérette", "cybercafé", "imprimerie", "autre").forEach { t ->
                            DropdownMenuItem(
                                text = { Text(t.replaceFirstChar { it.uppercase() }) },
                                onClick = { businessType = t; bizExpanded = false },
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = quartier,
                    onValueChange = { quartier = it },
                    label = { Text("Quartier *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isSubmitting,
                )
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Adresse précise *") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isSubmitting,
                )
            } else {
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                    OutlinedTextField(
                        value = vehicle,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Véhicule *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        enabled = !isSubmitting,
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        listOf("Moto", "Voiture", "Vélo", "À pied").forEach { v ->
                            DropdownMenuItem(
                                text = { Text(v) },
                                onClick = { vehicle = v; expanded = false },
                            )
                        }
                    }
                }
            }
            displayError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }
            Button(
                onClick = {
                    localError = null
                    if (name.isBlank() || phone.isBlank() || email.isBlank() || commune.isBlank()) {
                        localError = "Remplissez les champs obligatoires"
                        return@Button
                    }
                    if (isRelay) {
                        if (shopName.isBlank() || quartier.isBlank() || address.isBlank()) {
                            localError = "Commerce, quartier et adresse sont requis"
                            return@Button
                        }
                        onSubmitRelay(name, phone, email, commune, quartier, address, shopName, businessType)
                    } else {
                        onSubmitTransporter(name, phone, email, commune, vehicle)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Envoyer ma candidature", fontWeight = FontWeight.Bold)
                }
            }
            TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth(), enabled = !isSubmitting) {
                Text("Annuler")
            }
        }
    }
}
