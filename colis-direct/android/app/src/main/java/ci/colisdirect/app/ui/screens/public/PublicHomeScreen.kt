package ci.colisdirect.app.ui.screens.public

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.R
import ci.colisdirect.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicHomeScreen(
    onNavigateToTab: (Int) -> Unit, // Tab index corresponding to bottom nav
    onSendColisClick: () -> Unit,
) {
    var calcFrom by remember { mutableStateOf("") }
    var calcTo by remember { mutableStateOf("") }
    var calcType by remember { mutableStateOf("relay") } // "relay" or "home"
    var calcSize by remember { mutableStateOf("Petit") } // "Petit", "Moyen", "Grand"
    var calculatedPrice by remember { mutableStateOf<Int?>(null) }
    var trackingNumber by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .verticalScroll(rememberScrollState())
    ) {
        // ── HERO BANNER ───────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.White)
        ) {
            // Background truck image
            Image(
                painter = painterResource(id = R.drawable.camion),
                contentDescription = null,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop
            )
            // White gradient overlay from left to right (since text is dark)
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.98f),
                                Color.White.copy(alpha = 0.90f),
                                Color.White.copy(alpha = 0.40f),
                                Color.White.copy(alpha = 0.10f),
                                Color.Transparent
                            )
                        )
                    )
            )

            // Content Stack (Stacks vertically on mobile)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 32.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Title and taglines
                Column(
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    val headingText = buildAnnotatedString {
                        append("Envoyez et recevez vos colis ")
                        withStyle(style = SpanStyle(color = OrangePrimary)) {
                            append("en toute sécurité")
                        }
                    }
                    Text(
                        text = headingText,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        lineHeight = 34.sp,
                        color = Gray900,
                        letterSpacing = (-0.8).sp
                    )

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        Button(
                            onClick = onSendColisClick,
                            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(44.dp)
                        ) {
                            Text("Envoyer un colis", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = { onNavigateToTab(3) }, // Relais tab is index 3
                            border = BorderStroke(1.5.dp, OrangePrimary),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = OrangePrimary),
                            modifier = Modifier.height(44.dp)
                        ) {
                            Icon(Icons.Default.Map, null, modifier = Modifier.size(16.dp), tint = OrangePrimary)
                            Spacer(Modifier.width(6.dp))
                            Text("Trouver un relais", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Calculator Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            "Calculer votre livraison",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = Gray900
                        )

                        // Ville de départ
                        Column {
                            Text("Ville de départ", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(bottom = 6.dp))
                            OutlinedTextField(
                                value = calcFrom,
                                onValueChange = { calcFrom = it; calculatedPrice = null },
                                placeholder = { Text("Ex : Abidjan", color = Gray400, fontSize = 13.sp) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OrangePrimary,
                                    unfocusedBorderColor = Gray300,
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                ),
                                textStyle = TextStyle(fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray900),
                                singleLine = true
                            )
                        }

                        // Ville d'arrivée
                        Column {
                            Text("Ville d'arrivée", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(bottom = 6.dp))
                            OutlinedTextField(
                                value = calcTo,
                                onValueChange = { calcTo = it; calculatedPrice = null },
                                placeholder = { Text("Ex : Bouaké", color = Gray400, fontSize = 13.sp) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OrangePrimary,
                                    unfocusedBorderColor = Gray300,
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                ),
                                textStyle = TextStyle(fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray900),
                                singleLine = true
                            )
                        }

                        // Type de livraison
                        Column {
                            Text("Type de livraison", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(bottom = 6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Button(
                                    onClick = { calcType = "relay"; calculatedPrice = null },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(38.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (calcType == "relay") OrangeLight else Color.White
                                    ),
                                    border = BorderStroke(1.5.dp, if (calcType == "relay") OrangePrimary else Gray300),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text("Point relais", fontFamily = InterFontFamily, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (calcType == "relay") OrangePrimary else Gray700)
                                }

                                Button(
                                    onClick = { calcType = "home"; calculatedPrice = null },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(38.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (calcType == "home") OrangeLight else Color.White
                                    ),
                                    border = BorderStroke(1.5.dp, if (calcType == "home") OrangePrimary else Gray300),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(0.dp)
                                ) {
                                    Text("Domicile", fontFamily = InterFontFamily, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (calcType == "home") OrangePrimary else Gray700)
                                }
                            }
                        }

                        // Taille du colis
                        Column {
                            Text("Taille du colis", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray500, modifier = Modifier.padding(bottom = 6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("Petit", "Moyen", "Grand").forEach { s ->
                                    Button(
                                        onClick = { calcSize = s; calculatedPrice = null },
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(38.dp),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (calcSize == s) OrangeLight else Color.White
                                        ),
                                        border = BorderStroke(1.5.dp, if (calcSize == s) OrangePrimary else Gray300),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Text(s, fontFamily = InterFontFamily, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (calcSize == s) OrangePrimary else Gray700)
                                    }
                                }
                            }
                        }

                        Button(
                            onClick = {
                                if (calcFrom.isNotBlank() && calcTo.isNotBlank()) {
                                    val isIntra = calcFrom.trim().equals(calcTo.trim(), ignoreCase = true)
                                    var price = if (calcSize == "Petit") {
                                        if (isIntra) 600 else 1000
                                    } else {
                                        if (isIntra) 1000 else 1500
                                    }
                                    if (calcType == "home") {
                                        price += 1000
                                    }
                                    calculatedPrice = price
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Voir les prix", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        // Price Result Banner
                        calculatedPrice?.let { price ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(OrangeLight)
                                    .border(1.dp, OrangePrimary.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Estimation du tarif :", fontFamily = InterFontFamily, fontSize = 12.sp, color = Gray700)
                                    Text("$price FCFA", fontFamily = InterFontFamily, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = OrangePrimary)
                                    Text(
                                        text = if (calcType == "home") "Supplément livraison domicile de 1000 FCFA inclus" else "Livraison de point à point",
                                        fontFamily = InterFontFamily, fontSize = 11.sp, color = Gray500,
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── TRUST STRIP ───────────────────────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, Gray300),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Trust Features in 2 columns
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        TrustFeatureItem(icon = Icons.Default.Security, title = "Livraison sécurisée", desc = "Vos colis sont protégés à chaque étape.")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        TrustFeatureItem(icon = Icons.Default.LocationOn, title = "Réseau de relais", desc = "Déposez et retirez près de chez vous.")
                    }
                }
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        TrustFeatureItem(icon = Icons.Default.People, title = "Livreurs agréés", desc = "Des livreurs fiables pour un service rapide.")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        TrustFeatureItem(icon = Icons.Default.CheckCircle, title = "Suivi en temps réel", desc = "Suivez votre colis à chaque étape.")
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── WHY COLISDIRECT ───────────────────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(22.dp),
            border = BorderStroke(1.dp, Gray300),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Text(
                    "Pourquoi choisir COLISDIRECT ?",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    color = Gray900,
                    textAlign = TextAlign.Center
                )

                // Stats Grid
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        StatBadgeItem(icon = Icons.Default.Map, number = "+500", label = "Points relais")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        StatBadgeItem(icon = Icons.Default.People, number = "+1000", label = "Livreurs agréés")
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.weight(1f)) {
                        StatBadgeItem(icon = Icons.Default.Inventory2, number = "+50 000", label = "Colis livrés")
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        StatBadgeItem(icon = Icons.Default.Phone, number = "24/7", label = "Support client")
                    }
                }

                HorizontalDivider(color = Gray300, modifier = Modifier.padding(vertical = 12.dp))

                Text(
                    "Comment ça marche ?",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = Gray900,
                    textAlign = TextAlign.Center
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    StepItem(1, "Créez votre envoi en ligne ou sur l'app.")
                    StepItem(2, "Choisissez le type de livraison.")
                    StepItem(3, "Déposez le colis au Point Relais.")
                    StepItem(4, "Un livreur agréé l'achemine.")
                    StepItem(5, "Suivez le colis en temps réel.")
                    StepItem(6, "Livré en toute sécurité !")
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── PARTNER CTA CARD (Dark Card) ──────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = NavyDark)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "DEVENEZ PARTENAIRE",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = OrangePrimary,
                    letterSpacing = 1.sp
                )

                Text(
                    "Rejoignez notre réseau de partenaires",
                    fontFamily = InterFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    color = Color.White,
                    lineHeight = 24.sp
                )

                Text(
                    "Devenez livreur agréé ou point relais et développez votre activité avec COLISDIRECT.",
                    fontFamily = InterFontFamily,
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.72f),
                    lineHeight = 20.sp
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onNavigateToTab(4) }, // Profile tab is index 4
                        colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.weight(1.1f).height(44.dp)
                    ) {
                        Text("Devenir livreur", fontFamily = InterFontFamily, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    OutlinedButton(
                        onClick = { onNavigateToTab(4) }, // Profile tab is index 4
                        border = BorderStroke(2.dp, Color.White),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        modifier = Modifier.weight(1f).height(44.dp)
                    ) {
                        Text("Devenir relais", fontFamily = InterFontFamily, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Partenaires Image
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(16.dp))
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.partenaires),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── DELIVERY OPTIONS (Domicile vs Relais) ──────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Gray50)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Nos options de livraison",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 20.sp,
                color = Gray900,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)
            )

            // Domicile Option Card
            Card(
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(2.dp, WarningAmber),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(WarningLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Home, null, tint = WarningAmber, modifier = Modifier.size(28.dp))
                        }
                        Column {
                            Text("Livraison à domicile", fontFamily = InterFontFamily, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Gray900)
                            Text("Service rapide et pratique", fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray500)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(20.dp))
                        Text("Livré le jour même", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Votre colis livré directement à votre domicile ou bureau le jour même. Idéal pour vos envois urgents.",
                        fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray600, lineHeight = 18.sp
                    )
                }
            }

            // Relais Option Card
            Card(
                shape = RoundedCornerShape(22.dp),
                border = BorderStroke(2.dp, InfoBlue),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(InfoLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Storefront, null, tint = InfoBlue, modifier = Modifier.size(28.dp))
                        }
                        Column {
                            Text("Livraison en point relais", fontFamily = InterFontFamily, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Gray900)
                            Text("Service fiable et économique", fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray500)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = InfoBlue, modifier = Modifier.size(20.dp))
                        Text("Livré le lendemain", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Gray900)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Votre colis disponible dans un point relais proche de chez vous dès le lendemain. Flexible et économique.",
                        fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray600, lineHeight = 18.sp
                    )
                }
            }
        }

        // ── TARIFS + QUICK TRACKING ──────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Des tarifs simples et accessibles",
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 20.sp,
                color = Gray900,
                textAlign = TextAlign.Center
            )

            val priceHeadline = buildAnnotatedString {
                append("À partir de ")
                withStyle(style = SpanStyle(color = OrangePrimary)) {
                    append("600 FCFA")
                }
                append(" seulement !")
            }
            Text(
                text = priceHeadline,
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = Gray900,
                textAlign = TextAlign.Center
            )

            // Tracking Box
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, Gray300),
                colors = CardDefaults.cardColors(containerColor = Gray50)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        "Entrez votre numéro de suivi",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Gray900
                    )

                    OutlinedTextField(
                        value = trackingNumber,
                        onValueChange = { trackingNumber = it },
                        placeholder = { Text("Ex : CD123456789CI", color = Gray400, fontSize = 13.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OrangePrimary,
                            unfocusedBorderColor = Gray300,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        textStyle = TextStyle(fontFamily = InterFontFamily, fontSize = 14.sp, color = Gray900),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            if (trackingNumber.isNotBlank()) {
                                // Redirect to tracking tab (index 2)
                                onNavigateToTab(2)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Search, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Text("Suivre mon colis", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun TrustFeatureItem(icon: ImageVector, title: String, desc: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(OrangeLight),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
        }
        Column {
            Text(title, fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Gray900, maxLines = 1)
            Text(desc, fontFamily = InterFontFamily, fontSize = 10.sp, color = Gray500, lineHeight = 14.sp)
        }
    }
}

@Composable
private fun StatBadgeItem(icon: ImageVector, number: String, label: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(OrangeLight),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = OrangePrimary, modifier = Modifier.size(18.dp))
        }
        Column {
            Text(number, fontFamily = InterFontFamily, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Gray900, lineHeight = 18.sp)
            Text(label, fontFamily = InterFontFamily, fontSize = 11.sp, color = Gray500)
        }
    }
}

@Composable
private fun StepItem(step: Int, text: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(OrangePrimary),
            contentAlignment = Alignment.Center
        ) {
            Text(
                step.toString(),
                fontFamily = InterFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                color = Color.White
            )
        }
        Text(
            text,
            fontFamily = InterFontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 13.sp,
            color = Gray900
        )
    }
}

