package ci.colisdirect.app.ui.screens.client

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ci.colisdirect.app.data.api.model.DispatchDriverDto
import ci.colisdirect.app.data.api.model.DispatchStatusDto
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.data.api.model.ShipmentDto
import ci.colisdirect.app.ui.theme.*
import kotlinx.coroutines.delay

/** Recherche livreur — parité `DriverSearch.tsx`. */
@Composable
fun DriverSearchSection(
    dispatch: DispatchStatusDto?,
    modifier: Modifier = Modifier,
) {
    val state = dispatch?.state ?: "searching"
    if (state == "not_applicable") return

    var elapsed by remember { mutableIntStateOf(0) }
    LaunchedEffect(state) {
        if (state == "searching") {
            while (true) {
                delay(1000)
                elapsed++
            }
        }
    }

    Card(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(Color.White),
    ) {
        Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            when (state) {
                "searching" -> {
                    CircularProgressIndicator(color = OrangePrimary, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Recherche d'un livreur…", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(
                        "Nous contactons les livreurs disponibles près de votre adresse.",
                        fontSize = 13.sp,
                        color = Gray600,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                    val mm = elapsed / 60
                    val ss = elapsed % 60
                    Text(
                        buildString {
                            append("%02d:%02d".format(mm, ss))
                            dispatch?.offersSent?.takeIf { it > 0 }?.let {
                                append(" · $it livreur(s) contacté(s)")
                            }
                        },
                        fontSize = 12.sp,
                        color = Gray500,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                "no_driver" -> {
                    Icon(Icons.Default.Warning, null, tint = Color(0xFFD97706), modifier = Modifier.size(40.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("Aucun livreur disponible pour l'instant", fontWeight = FontWeight.Bold)
                    Text(
                        "Notre équipe assignera un livreur manuellement. Vous serez notifié.",
                        fontSize = 13.sp,
                        color = Gray600,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                "assigned" -> {
                    val driver = dispatch?.driver
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Default.CheckCircle, null, tint = SuccessGreen, modifier = Modifier.size(28.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Livreur assigné", fontWeight = FontWeight.Bold, color = SuccessGreen)
                            driver?.let { DriverInfoRows(it) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DriverInfoRows(driver: DispatchDriverDto) {
    val context = LocalContext.current
    val name = listOfNotNull(driver.firstName, driver.lastName).joinToString(" ").trim()
    if (name.isNotBlank()) {
        Text(name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.padding(top = 4.dp))
    }
    driver.vehicleType?.let {
        Text("Véhicule : $it", fontSize = 12.sp, color = Gray600)
    }
    driver.licensePlate?.let {
        Text("Immat. : $it", fontSize = 12.sp, color = Gray600)
    }
    driver.phone?.let { phone ->
        TextButton(
            onClick = {
                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
            },
        ) {
            Icon(Icons.Default.Phone, null, Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text("Appeler le livreur")
        }
    }
}

/** Points relais de dépôt — parité `DepositRelayFinder.tsx` (liste simplifiée). */
@Composable
fun DepositRelayHintSection(
    shipment: ShipmentDto,
    relayPoints: List<RelayPointDto>,
    modifier: Modifier = Modifier,
) {
    if (shipment.homeDelivery == true) return
    val destId = shipment.destinationRelayId
    val highlighted = relayPoints.filter { destId != null && it.id == destId }
    val others = relayPoints.filter { it.isActive != false && (destId == null || it.id != destId) }.take(5)

    Card(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(Color.White),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Store, null, tint = OrangePrimary)
                Text("Point relais de dépôt", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Text(
                "Déposez votre colis au point relais indiqué après paiement.",
                fontSize = 13.sp,
                color = Gray600,
            )
            highlighted.forEach { relay -> RelayPointRow(relay, highlight = true) }
            if (highlighted.isEmpty() && others.isNotEmpty()) {
                others.forEach { relay -> RelayPointRow(relay, highlight = false) }
            }
        }
    }
}

@Composable
private fun RelayPointRow(relay: RelayPointDto, highlight: Boolean) {
    val context = LocalContext.current
    Card(
        colors = CardDefaults.cardColors(if (highlight) OrangeLight else Gray50),
        shape = RoundedCornerShape(12.dp),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(relay.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(
                listOfNotNull(relay.commune, relay.quartier, relay.address).joinToString(" · "),
                fontSize = 12.sp,
                color = Gray600,
            )
            relay.phone?.let { phone ->
                TextButton(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                    },
                ) {
                    Icon(Icons.Default.Phone, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(phone, fontSize = 13.sp)
                }
            }
        }
    }
}
