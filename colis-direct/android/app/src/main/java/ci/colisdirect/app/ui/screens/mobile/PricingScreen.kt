package ci.colisdirect.app.ui.screens.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PricingScreen(onBack: () -> Unit) {
    var intraTab by remember { mutableStateOf(true) }
    data class TariffRow(val emoji: String, val name: String, val weight: String, val intra: Int?, val inter: Int?)
    val tariffs = listOf(
        TariffRow("✉️", "Courrier", "< 2 kg", 600, 1000),
        TariffRow("📦", "Petit colis", "< 3 kg", 1000, 1500),
        TariffRow("🗃️", "Colis moyen", "3 – 10 kg", 1500, 2000),
        TariffRow("📫", "Grand colis", "10 – 30 kg", 2000, 2500),
        TariffRow("🏗️", "Hors norme", "> 30 kg", null, null),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tarifs", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
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
                    .background(Brush.linearGradient(listOf(NavyDark, Color(0xFF1A1A2E))))
                    .padding(24.dp),
            ) {
                Column {
                    Text("TARIFS TRANSPARENTS", color = OrangePrimary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("À partir de 600 FCFA", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "Expéditions partout en Côte d'Ivoire. Pas de frais cachés.",
                        color = Color.White.copy(0.65f),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .background(Gray50, RoundedCornerShape(14.dp))
                    .padding(4.dp),
            ) {
                FilterChip(
                    selected = intraTab,
                    onClick = { intraTab = true },
                    label = { Text("Même commune") },
                    modifier = Modifier.weight(1f),
                )
                FilterChip(
                    selected = !intraTab,
                    onClick = { intraTab = false },
                    label = { Text("Autre commune") },
                    modifier = Modifier.weight(1f),
                )
            }

            Card(
                modifier = Modifier.padding(horizontal = 16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column {
                    tariffs.forEachIndexed { index, row ->
                        val price = if (intraTab) row.intra else row.inter
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text("${row.emoji} ${row.name}", fontWeight = FontWeight.Bold)
                                Text(row.weight, fontSize = 12.sp, color = Gray500)
                            }
                            Text(
                                when (price) {
                                    null -> "Devis"
                                    else -> "$price F"
                                },
                                fontWeight = FontWeight.ExtraBold,
                                color = OrangePrimary,
                            )
                        }
                        if (index < tariffs.lastIndex) HorizontalDivider(color = Gray100)
                    }
                }
            }

            Text(
                "Options : fragile +500 F · assuré +500 F · ramassage +500 F · livraison domicile +1000 F",
                modifier = Modifier.padding(16.dp),
                fontSize = 12.sp,
                color = Gray500,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}
