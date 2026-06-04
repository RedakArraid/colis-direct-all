package ci.colisdirect.app.ui.screens.client

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.domain.formatFcfa
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodScreen(
    trackingNumber: String,
    amountFcfa: Int,
    routeLabel: String,
    onBack: () -> Unit,
    onMobileMoney: (operator: String) -> Unit,
    onCard: () -> Unit,
    onCashDone: () -> Unit,
) {
    var selected by remember { mutableStateOf("om") }
    val methods = listOf(
        Triple("om", "Orange Money", Color(0xFFFF7900)),
        Triple("mtn", "MTN MoMo", Color(0xFFFFCC00)),
        Triple("wave", "Wave", Color(0xFF1DC8FF)),
        Triple("moov", "Moov Money", Color(0xFF0066B3)),
        Triple("card", "Carte bancaire", Gray500),
        Triple("cash", "Espèces à la livraison", SuccessGreen),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paiement") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            PaymentAmountCard(routeLabel = routeLabel, amountFcfa = amountFcfa)
            Text(
                "Choisissez un moyen de paiement",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            methods.forEach { (id, label, color) ->
                val sel = selected == id
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 5.dp)
                        .clickable { selected = id },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(if (sel) OrangeLight else Color.White),
                    border = BorderStroke(1.5.dp, if (sel) OrangePrimary else Gray200),
                ) {
                    Row(
                        Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Box(
                            Modifier
                                .size(44.dp)
                                .background(color.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label.take(3).uppercase(),
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 11.sp,
                                color = color,
                            )
                        }
                        Column(Modifier.weight(1f)) {
                            Text(label, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(
                                if (id == "cash") "Payé par le destinataire" else "Paiement instantané",
                                fontSize = 12.sp,
                                color = Gray500,
                            )
                        }
                        RadioButton(selected = sel, onClick = { selected = id })
                    }
                }
            }
            Row(
                Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Default.Shield, null, tint = SuccessGreen, modifier = Modifier.size(16.dp))
                Text("Paiement 100% sécurisé et chiffré", fontSize = 12.sp, color = Gray500)
            }
            Button(
                onClick = {
                    when (selected) {
                        "card" -> onCard()
                        "cash" -> onCashDone()
                        else -> onMobileMoney(selected)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                Text("Continuer", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
fun PaymentAmountCard(routeLabel: String, amountFcfa: Int) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(OrangeLight),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (routeLabel.isNotBlank()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(routeLabel, fontSize = 13.sp, color = Gray700)
                    Text(formatFcfa(amountFcfa), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            HorizontalDivider(color = OrangePrimary.copy(alpha = 0.3f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Total à payer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    formatFcfa(amountFcfa),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 22.sp,
                    color = OrangePrimary,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PayMobileMoneyScreen(
    trackingNumber: String,
    amountFcfa: Int,
    operator: String,
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()
    var phone by remember { mutableStateOf("") }
    val opLabel = when (operator) {
        "mtn" -> "MTN MoMo"
        "wave" -> "Wave"
        "moov" -> "Moov Money"
        else -> "Orange Money"
    }
    val opColor = when (operator) {
        "mtn" -> Color(0xFFFFCC00)
        "wave" -> Color(0xFF1DC8FF)
        "moov" -> Color(0xFF0066B3)
        else -> Color(0xFFFF7900)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paiement") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Box(
                Modifier
                    .size(56.dp)
                    .background(opColor.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(opLabel.take(2), fontWeight = FontWeight.ExtraBold, color = opColor)
            }
            Text("Paiement $opLabel", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            Text(
                "Vous recevrez une demande de confirmation sur votre téléphone",
                fontSize = 13.sp,
                color = Gray500,
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it.filter { c -> c.isDigit() || c == ' ' } },
                label = { Text("Numéro $opLabel") },
                placeholder = { Text("07 XX XX XX XX") },
                prefix = { Text("+225 ", fontWeight = FontWeight.Bold) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                shape = RoundedCornerShape(12.dp),
            )
            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(Gray50)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Comment ça marche", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    listOf(
                        "Saisissez votre numéro $opLabel",
                        "Validez le montant de ${formatFcfa(amountFcfa)}",
                        "Confirmez avec votre code secret",
                    ).forEachIndexed { i, t ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(
                                Modifier
                                    .size(24.dp)
                                    .background(OrangePrimary, RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("${i + 1}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            Text(t, fontSize = 13.sp, color = Gray700)
                        }
                    }
                }
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    viewModel.initiatePaystackPayment(
                        trackingNumber = trackingNumber,
                        onPaystackUrl = { url ->
                            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
                        },
                    )
                },
                enabled = phone.length >= 8 && !state.isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Ouvrir ${formatFcfa(amountFcfa)}", fontWeight = FontWeight.Bold)
                }
            }
            OutlinedButton(
                onClick = onSuccess,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text("J'ai terminé le paiement", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PayCardScreen(
    trackingNumber: String,
    amountFcfa: Int,
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val context = LocalContext.current
    val state by viewModel.uiState.collectAsState()
    var cardNumber by remember { mutableStateOf("") }
    var expiry by remember { mutableStateOf("") }
    var cvv by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Carte bancaire") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            PaymentAmountCard(routeLabel = "Paiement carte", amountFcfa = amountFcfa)
            OutlinedTextField(
                value = cardNumber,
                onValueChange = { if (it.length <= 19) cardNumber = it.filter { c -> c.isDigit() || c == ' ' } },
                label = { Text("Numéro de carte") },
                placeholder = { Text("4242 4242 4242 4242") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = expiry,
                    onValueChange = { if (it.length <= 5) expiry = it },
                    label = { Text("MM/AA") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = cvv,
                    onValueChange = { if (it.length <= 4) cvv = it.filter { c -> c.isDigit() } },
                    label = { Text("CVV") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp),
                )
            }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    viewModel.initiatePaystackPayment(
                        trackingNumber = trackingNumber,
                        onPaystackUrl = { url ->
                            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
                        },
                    )
                },
                enabled = cardNumber.length >= 12 && expiry.length >= 4 && cvv.length >= 3 && !state.isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                Text("Ouvrir le paiement sécurisé", fontWeight = FontWeight.Bold)
            }
            OutlinedButton(
                onClick = onSuccess,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text("J'ai terminé le paiement", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun PaySuccessScreen(
    trackingNumber: String,
    isRelayCashCheckout: Boolean = false,
    onTrackShipment: (String) -> Unit,
    onDone: () -> Unit,
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val shipment = state.checkoutShipment

    LaunchedEffect(trackingNumber) {
        if (!isRelayCashCheckout) {
            viewModel.confirmPaymentAfterCheckout(trackingNumber)
        } else {
            viewModel.loadCheckout(trackingNumber)
        }
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.stopDispatchPolling() }
    }

    val title = when {
        isRelayCashCheckout -> "Colis enregistré"
        state.paymentVerified == false -> "Paiement en attente"
        else -> "Paiement réussi !"
    }
    val subtitle = when {
        isRelayCashCheckout && shipment?.pickupMethod == "home_pickup" ->
            "Réglez au relais ou en ligne pour lancer la recherche de livreur."
        isRelayCashCheckout ->
            "Réglez lors du dépôt au point relais."
        else -> "Votre colis est enregistré."
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(64.dp))
        Spacer(Modifier.height(16.dp))
        Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
        Text(subtitle, fontSize = 14.sp, color = Gray500, modifier = Modifier.padding(top = 6.dp))
        Spacer(Modifier.height(16.dp))
        Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(Gray50), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Numéro de suivi", fontSize = 12.sp, color = Gray500)
                Text(trackingNumber, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = OrangePrimary)
            }
        }

        if (state.checkoutLoading) {
            Spacer(Modifier.height(24.dp))
            CircularProgressIndicator(color = OrangePrimary)
        }

        shipment?.let { s ->
            Spacer(Modifier.height(16.dp))
            if (s.pickupMethod == "home_pickup" && !isRelayCashCheckout) {
                DriverSearchSection(state.dispatchStatus, Modifier.fillMaxWidth())
            } else if (s.pickupMethod == "home_pickup" && isRelayCashCheckout) {
                Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(OrangeLight)) {
                    Text(
                        "Après paiement, la recherche de livreur démarrera automatiquement.",
                        Modifier.padding(16.dp),
                        fontSize = 13.sp,
                        color = Gray700,
                    )
                }
            }
            if (s.homeDelivery != true && s.pickupMethod == "relay_deposit") {
                DepositRelayHintSection(s, state.relayPoints, Modifier.fillMaxWidth())
            }
        }

        Spacer(Modifier.height(20.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { onTrackShipment(trackingNumber) },
                modifier = Modifier.weight(1f),
            ) {
                Text("Suivre", fontSize = 13.sp)
            }
            Button(
                onClick = onDone,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
            ) {
                Text("Accueil", fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
