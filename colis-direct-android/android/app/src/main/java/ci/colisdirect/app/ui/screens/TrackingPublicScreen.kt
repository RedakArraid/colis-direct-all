package ci.colisdirect.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.ui.components.StatusBadge
import ci.colisdirect.app.ui.components.statusLabel
import ci.colisdirect.app.ui.theme.*
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel
import java.text.SimpleDateFormat
import java.util.*

// ── Step Definitions ──────────────────────────────────────────────────────────

data class StepDef(
    val id: String,
    val label: String,
    val sublabel: String,
    val statuses: List<String>
)

val RELAY_STEPS = listOf(
    StepDef("created", "Commande créée", "En attente de dépôt", listOf("READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY")),
    StepDef("origin_relay", "Déposé au relais", "Pris en charge au départ", listOf("RELAY_ORIGIN_RECEIVED", "PAYMENT_RECEIVED_AT_RELAY")),
    StepDef("transit", "En transit", "Acheminement en cours", listOf("CARRIER_COLLECTED", "IN_TRANSIT")),
    StepDef("dest_relay", "Au relais de livraison", "Disponible au retrait", listOf("RELAY_FINAL_RECEIVED", "AVAILABLE_FOR_PICKUP")),
    StepDef("done", "Retiré", "Livraison terminée", listOf("PICKED_UP_BY_CUSTOMER"))
)

val HOME_STEPS_RELAY = listOf(
    StepDef("created", "Commande créée", "En attente de dépôt", listOf("READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY")),
    StepDef("origin_relay", "Déposé au relais", "Pris en charge au départ", listOf("RELAY_ORIGIN_RECEIVED", "PAYMENT_RECEIVED_AT_RELAY")),
    StepDef("transit", "En transit", "Acheminement en cours", listOf("CARRIER_COLLECTED", "IN_TRANSIT")),
    StepDef("done", "Livré à domicile", "Livraison terminée", listOf("DELIVERED", "DELIVERED_TO_CUSTOMER"))
)

val HOME_PICKUP_STEPS_RELAY = listOf(
    StepDef("created", "Commande créée", "En attente de ramassage", listOf("PICKUP_PENDING", "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP")),
    StepDef("pickup", "Ramassage", "Collecté chez l'expéditeur", listOf("CARRIER_COLLECTED")),
    StepDef("transit", "En transit", "En route vers le relais de livraison", listOf("IN_TRANSIT")),
    StepDef("dest_relay", "Au relais de livraison", "Disponible au retrait", listOf("RELAY_FINAL_RECEIVED", "AVAILABLE_FOR_PICKUP")),
    StepDef("done", "Retiré", "Livraison terminée", listOf("PICKED_UP_BY_CUSTOMER"))
)

val HOME_STEPS_DIRECT = listOf(
    StepDef("created", "Commande créée", "En attente de ramassage", listOf("PICKUP_PENDING", "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP")),
    StepDef("pickup", "Ramassage", "Collecté chez l'expéditeur", listOf("CARRIER_COLLECTED")),
    StepDef("transit", "En transit", "Acheminement en cours", listOf("IN_TRANSIT")),
    StepDef("done", "Livré à domicile", "Livraison terminée", listOf("DELIVERED", "DELIVERED_TO_CUSTOMER"))
)

val STEP_DONE_STATUSES = setOf(
    "READY_FOR_DROP_OFF", "PAYMENT_AWAITING_VALIDATION", "PAYMENT_CONFIRMED_AWAITING_DROP", "PAYMENT_PENDING_AT_RELAY",
    "PICKUP_PENDING",
    "RELAY_ORIGIN_RECEIVED",
    "PICKED_UP_BY_CUSTOMER", "DELIVERED", "DELIVERED_TO_CUSTOMER"
)

fun getStepIndex(steps: List<StepDef>, currentStatus: String): Int {
    val upper = currentStatus.uppercase()
    val idx = steps.indexOfFirst { s -> s.statuses.contains(upper) }
    if (idx == -1) return 1
    return if (STEP_DONE_STATUSES.contains(upper)) idx + 1 else idx
}

val RELAY_ICONS = listOf(Icons.Default.Inventory2, Icons.Default.Store, Icons.Default.LocalShipping, Icons.Default.Store, Icons.Default.CheckCircle)
val HOME_ICONS_RELAY = listOf(Icons.Default.Inventory2, Icons.Default.Store, Icons.Default.LocalShipping, Icons.Default.Home)
val HOME_ICONS_DIRECT = listOf(Icons.Default.Inventory2, Icons.Default.Home, Icons.Default.LocalShipping, Icons.Default.Home)
val HOME_PICKUP_ICONS_RELAY = listOf(Icons.Default.Inventory2, Icons.Default.Home, Icons.Default.LocalShipping, Icons.Default.Store, Icons.Default.CheckCircle)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackingPublicScreen(
    onBack: () -> Unit,
    initialTrackingNumber: String? = null,
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    var trackingInput by remember { mutableStateOf(initialTrackingNumber?.uppercase() ?: "") }

    LaunchedEffect(initialTrackingNumber) {
        val tn = initialTrackingNumber?.trim()?.uppercase()
        if (!tn.isNullOrEmpty()) {
            trackingInput = tn
            viewModel.trackPublic(tn)
        }
    }

    Scaffold(
        containerColor = Color.White,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
                .verticalScroll(rememberScrollState()),
        ) {
            // ── Hero Banner with Search (matches web TrackingPage.tsx style) ────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(
                            colors = listOf(OrangePrimary, Color(0xFFFF8C33))
                        )
                    )
                    .statusBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 40.dp),
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f)),
                    ) {
                        Icon(Icons.Default.ArrowBack, "Retour", tint = Color.White, modifier = Modifier.size(20.dp))
                    }

                    Text(
                        "Suivez votre colis en temps réel",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        color = Color.White,
                        letterSpacing = (-0.5).sp
                    )

                    Text(
                        "Entrez votre numéro de suivi pour connaître l'avancement de votre livraison.",
                        fontFamily = InterFontFamily,
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.95f)
                    )

                    Spacer(Modifier.height(8.dp))

                    // Search input card
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = trackingInput,
                                onValueChange = { trackingInput = it.uppercase().trim() },
                                placeholder = {
                                    Text(
                                        "Ex: CD12345678ABCD",
                                        fontFamily = InterFontFamily,
                                        fontSize = 14.sp,
                                        color = Gray500
                                    )
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Search
                                ),
                                keyboardActions = KeyboardActions(onSearch = {
                                    focusManager.clearFocus()
                                    if (trackingInput.isNotBlank()) viewModel.trackPublic(trackingInput)
                                }),
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(horizontal = 4.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color.Transparent,
                                    unfocusedBorderColor = Color.Transparent,
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent
                                ),
                                textStyle = androidx.compose.ui.text.TextStyle(
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Gray900
                                )
                            )

                            Button(
                                onClick = {
                                    focusManager.clearFocus()
                                    if (trackingInput.isNotBlank()) viewModel.trackPublic(trackingInput)
                                },
                                enabled = trackingInput.isNotBlank() && !state.isLoading,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Black,
                                    contentColor = Color.White
                                ),
                                modifier = Modifier.height(44.dp)
                            ) {
                                if (state.isLoading) {
                                    CircularProgressIndicator(
                                        color = Color.White,
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(Icons.Default.Search, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        "Rechercher",
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }

                    // Error Box
                    state.error?.let {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.White.copy(alpha = 0.15f))
                                .border(1.dp, Color.White.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Error, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text(
                                it,
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // ── Empty State ──────────────────────────────────────────────────────────
            if (state.tracking == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(horizontal = 24.dp)
                    ) {
                        Icon(
                            Icons.Default.Inventory2,
                            null,
                            modifier = Modifier.size(56.dp),
                            tint = Gray300
                        )
                        Text(
                            "Entrez un numéro de suivi pour commencer",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Gray500,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // ── Tracking Results View ───────────────────────────────────────────────
            state.tracking?.let { tracking ->
                val shipment = tracking.shipment
                val currentStatus = (tracking.currentStatus ?: shipment?.currentStatus ?: "").uppercase()
                val isHomeDelivery = shipment?.homeDelivery == true
                val isHomePickup = shipment?.pickupMethod == "home_pickup"
                val hasOriginRelay = !shipment?.originRelayId.isNullOrBlank()

                // Routing steps matching TrackingPage.tsx
                val steps = when {
                    isHomePickup -> if (isHomeDelivery) HOME_STEPS_DIRECT else HOME_PICKUP_STEPS_RELAY
                    else -> if (isHomeDelivery) HOME_STEPS_RELAY else RELAY_STEPS
                }

                val stepIcons = when {
                    isHomePickup -> if (isHomeDelivery) HOME_ICONS_DIRECT else HOME_PICKUP_ICONS_RELAY
                    else -> if (isHomeDelivery) HOME_ICONS_RELAY else RELAY_ICONS
                }

                val activeStep = getStepIndex(steps, currentStatus)
                val isCancelled = currentStatus == "CANCELLED"
                val isReturn = currentStatus == "RETURN_TO_SENDER"
                val isException = isCancelled || isReturn

                val formattedDate = formatDateFrench(shipment?.createdAt)

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 1. Package Header Card
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                        elevation = CardDefaults.cardElevation(0.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(Icons.Default.Inventory2, null, tint = OrangePrimary, modifier = Modifier.size(16.dp))
                                        Text(
                                            "NUMÉRO DE SUIVI",
                                            fontFamily = InterFontFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp,
                                            color = Gray500
                                        )
                                    }
                                    Text(
                                        tracking.trackingNumber,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = Gray900,
                                        letterSpacing = 0.5.sp
                                    )
                                }

                                // Badges column
                                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    // Delivery Mode Badge
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = if (isHomeDelivery) Color(0xFFEFF6FF) else Color(0xFFFAF5FF),
                                        border = BorderStroke(1.dp, if (isHomeDelivery) Color(0xFFBFDBFE) else Color(0xFFE9D5FF)),
                                        modifier = Modifier.wrapContentSize()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(
                                                if (isHomeDelivery) Icons.Default.Home else Icons.Default.Store,
                                                null,
                                                tint = if (isHomeDelivery) Color(0xFF1D4ED8) else Color(0xFF7E22CE),
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Text(
                                                if (isHomeDelivery) "À Domicile" else "Point Relais",
                                                fontFamily = InterFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp,
                                                color = if (isHomeDelivery) Color(0xFF1D4ED8) else Color(0xFF7E22CE)
                                            )
                                        }
                                    }

                                    // Payment Badge
                                    val payStatus = shipment?.paymentStatus ?: "pending"
                                    val isPaid = payStatus.lowercase() == "paid"
                                    val isCancelledPayment = payStatus.lowercase() == "cancelled"
                                    val payBg = if (isPaid) Color(0xFFF0FDF4) else if (isCancelledPayment) Color(0xFFFEF2F2) else Color(0xFFFFFBEB)
                                    val payBorder = if (isPaid) Color(0xFFBBF7D0) else if (isCancelledPayment) Color(0xFFFECACA) else Color(0xFFFEF3C7)
                                    val payText = if (isPaid) Color(0xFF16A34A) else if (isCancelledPayment) Color(0xFFDC2626) else Color(0xFFD97706)

                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = payBg,
                                        border = BorderStroke(1.dp, payBorder),
                                        modifier = Modifier.wrapContentSize()
                                    ) {
                                        Text(
                                            text = if (isPaid) "Payé" else if (isCancelledPayment) "Annulé" else "En attente",
                                            fontFamily = InterFontFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 10.sp,
                                            color = payText,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                            }

                            if (formattedDate.isNotEmpty()) {
                                HorizontalDivider(color = Color(0xFFF0F0F0))
                                Text(
                                    "Créé le $formattedDate",
                                    fontFamily = InterFontFamily,
                                    fontSize = 12.sp,
                                    color = Gray500
                                )
                            }
                        }
                    }

                    // 2. Exception Warning Box (if cancelled or return)
                    if (isException) {
                        val cardBg = if (isCancelled) Color(0xFFFEF2F2) else Color(0xFFFFFBEB)
                        val cardBorder = if (isCancelled) Color(0xFFFCA5A5) else Color(0xFFFDE68A)
                        val textTitle = if (isCancelled) Color(0xFFB91C1C) else Color(0xFFB45309)
                        val textDesc = if (isCancelled) Color(0xFFEF4444) else Color(0xFFD97706)

                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = cardBg),
                            border = BorderStroke(1.5.dp, cardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(18.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    if (isCancelled) Icons.Default.Cancel else Icons.Default.KeyboardReturn,
                                    null,
                                    tint = textTitle,
                                    modifier = Modifier.size(28.dp)
                                )
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        if (isCancelled) "Envoi annulé" else "Retour à l'expéditeur",
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = textTitle
                                    )
                                    Text(
                                        if (isCancelled)
                                            "Cet envoi a été annulé. Contactez le service client pour plus d'informations."
                                        else
                                            "Ce colis est en cours de retour vers l'expéditeur.",
                                        fontFamily = InterFontFamily,
                                        fontSize = 13.sp,
                                        color = textDesc
                                    )
                                }
                            }
                        }
                    }

                    // 3. Progress Timeline Card (if not exception)
                    if (!isException) {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                            elevation = CardDefaults.cardElevation(0.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(18.dp)
                            ) {
                                Text(
                                    "Progression du colis",
                                    fontFamily = InterFontFamily,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Gray900
                                )

                                // Vertical Timeline Steps (ideal for mobile view)
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    steps.forEachIndexed { idx, step ->
                                        val isDone = idx < activeStep
                                        val isActive = idx == activeStep && activeStep < steps.size
                                        val isUpcoming = idx > activeStep
                                        val isLast = idx == steps.size - 1
                                        val stepIcon = stepIcons.getOrNull(idx) ?: Icons.Default.Inventory2

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                                        ) {
                                            // Circle indicator and line column
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier.width(36.dp)
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(36.dp)
                                                        .clip(CircleShape)
                                                        .background(if (isDone) OrangePrimary else Color.White)
                                                        .border(
                                                            2.dp,
                                                            if (isDone || isActive) OrangePrimary else Gray300,
                                                            CircleShape
                                                        ),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    if (isDone) {
                                                        Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                                    } else {
                                                        Icon(
                                                            stepIcon,
                                                            null,
                                                            tint = if (isActive) OrangePrimary else Gray400,
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                    }
                                                }

                                                if (!isLast) {
                                                    Box(
                                                        modifier = Modifier
                                                            .width(2.dp)
                                                            .height(32.dp)
                                                            .background(if (isDone) OrangePrimary else Gray300)
                                                    )
                                                }
                                            }

                                            // Content
                                            Column(
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .padding(top = 2.dp, bottom = if (isLast) 0.dp else 16.dp),
                                                verticalArrangement = Arrangement.spacedBy(2.dp)
                                            ) {
                                                Text(
                                                    step.label,
                                                    fontFamily = InterFontFamily,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 14.sp,
                                                    color = if (isActive) OrangePrimary else if (isDone) Gray900 else Gray400
                                                )
                                                Text(
                                                    step.sublabel,
                                                    fontFamily = InterFontFamily,
                                                    fontSize = 12.sp,
                                                    color = Gray500
                                                )
                                                if (isActive) {
                                                    Surface(
                                                        shape = RoundedCornerShape(10.dp),
                                                        color = OrangeLight,
                                                        modifier = Modifier
                                                            .wrapContentSize()
                                                            .padding(top = 4.dp)
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                        ) {
                                                            Icon(Icons.Default.AccessTime, null, tint = OrangePrimary, modifier = Modifier.size(12.dp))
                                                            Text(
                                                                "Étape en cours",
                                                                fontFamily = InterFontFamily,
                                                                fontWeight = FontWeight.Bold,
                                                                fontSize = 10.sp,
                                                                color = OrangePrimary
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Active step alert banner
                                val activeStepObj = steps.getOrNull(activeStep)
                                if (activeStepObj != null) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(OrangeLight)
                                            .border(1.dp, Color(0xFFFFE3CC), RoundedCornerShape(12.dp))
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(OrangePrimary)
                                        )
                                        Column {
                                            Text(
                                                "Étape actuelle : ${activeStepObj.label}",
                                                fontFamily = InterFontFamily,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = OrangePrimary
                                            )
                                            val subtext = if (currentStatus == "RELAY_FINAL_RECEIVED") {
                                                "Arrivé au relais, mise à disposition en cours"
                                            } else {
                                                activeStepObj.sublabel
                                            }
                                            Text(
                                                subtext,
                                                fontFamily = InterFontFamily,
                                                fontSize = 11.sp,
                                                color = OrangePrimary.copy(alpha = 0.85f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 4. Event Log Card
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                        elevation = CardDefaults.cardElevation(0.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Text(
                                "Historique des événements",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Gray900
                            )

                            val events = tracking.events ?: emptyList()
                            if (events.isEmpty()) {
                                Text(
                                    "Aucun événement pour l'instant",
                                    fontFamily = InterFontFamily,
                                    fontSize = 13.sp,
                                    color = Gray500,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 16.dp)
                                )
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    events.reversed().forEachIndexed { idx, ev ->
                                        val isLatest = idx == 0
                                        val dateFormatted = formatEventTimestamp(ev.timestamp)

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            // Left Dot & Line (mini version)
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier.width(20.dp)
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(20.dp)
                                                        .clip(CircleShape)
                                                        .background(if (isLatest) OrangePrimary else Color.White)
                                                        .border(
                                                            2.dp,
                                                            if (isLatest) OrangePrimary else Gray300,
                                                            CircleShape
                                                        ),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        if (isLatest) Icons.Default.Check else Icons.Default.FiberManualRecord,
                                                        null,
                                                        tint = if (isLatest) Color.White else Gray400,
                                                        modifier = Modifier.size(if (isLatest) 10.dp else 6.dp)
                                                    )
                                                }
                                            }

                                            // Event Box Content
                                            Card(
                                                shape = RoundedCornerShape(12.dp),
                                                colors = CardDefaults.cardColors(
                                                    containerColor = if (isLatest) OrangeLight else Color(0xFFF9FAFB)
                                                ),
                                                border = BorderStroke(
                                                    1.dp,
                                                    if (isLatest) Color(0xFFFFE3CC) else Color(0xFFF3F4F6)
                                                ),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                Column(modifier = Modifier.padding(12.dp)) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.Top
                                                    ) {
                                                        Text(
                                                            statusLabel(ev.status),
                                                            fontFamily = InterFontFamily,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 13.sp,
                                                            color = if (isLatest) OrangePrimary else Gray900,
                                                            modifier = Modifier.weight(1f)
                                                        )
                                                        Text(
                                                            dateFormatted,
                                                            fontFamily = InterFontFamily,
                                                            fontSize = 11.sp,
                                                            color = Gray500,
                                                            textAlign = TextAlign.End
                                                        )
                                                    }
                                                    if (!ev.notes.isNullOrBlank()) {
                                                        Spacer(Modifier.height(4.dp))
                                                        Text(
                                                            ev.notes,
                                                            fontFamily = InterFontFamily,
                                                            fontSize = 12.sp,
                                                            color = Gray600
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 5. Sender & Recipient Cards
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Sender Card
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(26.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFF3F4F6)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.LocationOn, null, tint = Gray500, modifier = Modifier.size(12.dp))
                                    }
                                    Text(
                                        "EXPÉDITEUR",
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        color = Gray500
                                    )
                                }
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(
                                        "${shipment?.senderFirstName ?: ""} ${shipment?.senderLastName ?: ""}".trim(),
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Gray900
                                    )
                                    Text(
                                        shipment?.senderCommune ?: "—",
                                        fontFamily = InterFontFamily,
                                        fontSize = 12.sp,
                                        color = Gray500
                                    )
                                    if (!shipment?.senderPhone.isNullOrBlank()) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.Phone, null, tint = Gray400, modifier = Modifier.size(12.dp))
                                            Text(
                                                shipment?.senderPhone ?: "",
                                                fontFamily = InterFontFamily,
                                                fontSize = 11.sp,
                                                color = Gray500
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Recipient Card
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(26.dp)
                                            .clip(CircleShape)
                                            .background(OrangeLight),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.LocationOn, null, tint = OrangePrimary, modifier = Modifier.size(12.dp))
                                    }
                                    Text(
                                        "DESTINATAIRE",
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        color = Gray500
                                    )
                                }
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(
                                        "${shipment?.recipientFirstName ?: ""} ${shipment?.recipientLastName ?: ""}".trim(),
                                        fontFamily = InterFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Gray900
                                    )
                                    Text(
                                        shipment?.recipientCommune ?: "—",
                                        fontFamily = InterFontFamily,
                                        fontSize = 12.sp,
                                        color = Gray500
                                    )
                                    if (!shipment?.recipientPhone.isNullOrBlank()) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.Phone, null, tint = Gray400, modifier = Modifier.size(12.dp))
                                            Text(
                                                shipment?.recipientPhone ?: "",
                                                fontFamily = InterFontFamily,
                                                fontSize = 11.sp,
                                                color = Gray500
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 6. Relay point info blocks
                    if (shipment?.originRelay != null || shipment?.destinationRelay != null) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            shipment.originRelay?.let { relay ->
                                RelayInfoCard(
                                    title = "Relais de dépôt",
                                    name = relay.name ?: "",
                                    address = relay.address ?: "",
                                    commune = relay.commune ?: "",
                                    quartier = relay.quartier,
                                    phone = relay.phone,
                                    isDest = false,
                                    onCall = { p ->
                                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$p"))
                                        context.startActivity(intent)
                                    }
                                )
                            }
                            shipment.destinationRelay?.let { relay ->
                                RelayInfoCard(
                                    title = "Relais de livraison",
                                    name = relay.name ?: "",
                                    address = relay.address ?: "",
                                    commune = relay.commune ?: "",
                                    quartier = relay.quartier,
                                    phone = relay.phone,
                                    isDest = true,
                                    showWithdrawalWarning = currentStatus == "AVAILABLE_FOR_PICKUP",
                                    onCall = { p ->
                                        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$p"))
                                        context.startActivity(intent)
                                    }
                                )
                            }
                        }
                    }

                    // 7. Package Info specs Grid
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFFF0F0F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(
                                "Détails du colis",
                                fontFamily = InterFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Gray900
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                SpecGridItem("Format", shipment?.packageType?.replaceFirstChar { it.uppercase() } ?: "—", Modifier.weight(1f))
                                SpecGridItem("Poids", if (shipment?.weight != null) "${shipment.weight} kg" else "—", Modifier.weight(1f))
                                SpecGridItem("Tarif", if (shipment?.price != null) "${shipment.price.toInt()} FCFA" else "—", Modifier.weight(1f), isPrice = true)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun RelayInfoCard(
    title: String,
    name: String,
    address: String,
    commune: String,
    quartier: String?,
    phone: String?,
    isDest: Boolean,
    showWithdrawalWarning: Boolean = false,
    onCall: (String) -> Unit
) {
    val cardBorder = if (isDest) BorderStroke(1.dp, Color(0xFFFFD4B2)) else BorderStroke(1.dp, Color(0xFFEFF6FF))
    val cardBg = if (isDest) Color(0xFFFFFBF7) else Color.White

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardBg),
        border = cardBorder,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(26.dp)
                        .clip(CircleShape)
                        .background(if (isDest) OrangeLight else Color(0xFFEFF6FF)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Store,
                        null,
                        tint = if (isDest) OrangePrimary else Color(0xFF1D4ED8),
                        modifier = Modifier.size(12.dp)
                    )
                }
                Text(
                    title.uppercase(),
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp,
                    color = if (isDest) OrangePrimary else Color(0xFF1D4ED8)
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(name, fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Gray900)
                Text(address, fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500)
                Text("$commune${if (!quartier.isNullOrBlank()) ", $quartier" else ""}", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500)

                if (!phone.isNullOrBlank()) {
                    Row(
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .clickable { onCall(phone) },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(Icons.Default.Phone, null, tint = OrangePrimary, modifier = Modifier.size(14.dp))
                        Text(
                            phone,
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = OrangePrimary
                        )
                    }
                }

                if (showWithdrawalWarning) {
                    Spacer(Modifier.height(6.dp))
                    HorizontalDivider(color = Color(0xFFFFE3CC))
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Warning, null, tint = OrangePrimary, modifier = Modifier.size(14.dp))
                        Text(
                            "Présentez-vous avec une pièce d'identité et le code de retrait.",
                            fontFamily = InterFontFamily,
                            fontSize = 11.sp,
                            color = OrangePrimary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SpecGridItem(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    isPrice: Boolean = false
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPrice) OrangeLight else Color(0xFFF9FAFB)
        ),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, fontFamily = InterFontFamily, fontSize = 11.sp, color = if (isPrice) OrangePrimary.copy(alpha = 0.8f) else Gray500)
            Text(
                value,
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = if (isPrice) OrangePrimary else Gray900
            )
        }
    }
}

private fun formatEventTimestamp(ts: String?): String {
    if (ts == null) return ""
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val date = parser.parse(ts) ?: return ts.take(16)
        SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        ts.take(16)
    }
}

private fun formatDateFrench(isoDate: String?): String {
    if (isoDate == null) return ""
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val date = parser.parse(isoDate) ?: return isoDate.take(10)
        SimpleDateFormat("d MMMM yyyy", Locale.FRENCH).format(date)
    } catch (e: Exception) {
        isoDate.take(10)
    }
}
