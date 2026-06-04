package ci.colisdirect.app.ui.screens.public

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import ci.colisdirect.app.data.api.model.RelayPointDto
import ci.colisdirect.app.ui.components.RelayMapView
import ci.colisdirect.app.ui.theme.*
import kotlinx.coroutines.launch
import ci.colisdirect.app.ui.navigation.appClientViewModel
import ci.colisdirect.app.viewmodel.ClientViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicRelayMapScreen(
    viewModel: ClientViewModel = appClientViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var searchQuery by remember { mutableStateOf("") }
    var selectedCommune by remember { mutableStateOf("Tout") }
    var selectedRelayId by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        viewModel.loadRelayPoints()
    }

    // Get unique communes from list
    val communesList = remember(state.relayPoints) {
        val list = mutableListOf("Tout")
        val uniqueCommunes = state.relayPoints.mapNotNull { it.commune }.distinct().sorted()
        list.addAll(uniqueCommunes)
        list
    }

    // Filter relay points
    val filteredRelays = remember(state.relayPoints, searchQuery, selectedCommune) {
        state.relayPoints.filter { rp ->
            val matchesSearch = searchQuery.isBlank() || 
                    rp.name.contains(searchQuery, ignoreCase = true) ||
                    (rp.address?.contains(searchQuery, ignoreCase = true) ?: false) ||
                    (rp.commune?.contains(searchQuery, ignoreCase = true) ?: false) ||
                    (rp.quartier?.contains(searchQuery, ignoreCase = true) ?: false)

            val matchesCommune = selectedCommune == "Tout" || rp.commune == selectedCommune

            matchesSearch && matchesCommune
        }
    }

    Scaffold(
        containerColor = Gray50,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.isLoading && state.relayPoints.isNotEmpty(),
            onRefresh = { viewModel.loadRelayPoints() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Points relais",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = Gray900,
                    )
                    Text(
                        "${state.relayPoints.size} relais",
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        color = OrangePrimary,
                    )
                }

                RelayMapView(
                    relays = filteredRelays,
                    selectedRelayId = selectedRelayId,
                    onRelaySelected = { id ->
                        selectedRelayId = id
                        val index = filteredRelays.indexOfFirst { it.id == id }
                        if (index >= 0) {
                            scope.launch { listState.animateScrollToItem(index) }
                        }
                    },
                )

                // Search & Filter Section
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Search box
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = {
                            Text("Rechercher par commune, quartier...", fontFamily = InterFontFamily, fontSize = 14.sp)
                        },
                        leadingIcon = {
                            Icon(Icons.Default.Search, null, tint = Gray500, modifier = Modifier.size(20.dp))
                        },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Default.Clear, null, tint = Gray500, modifier = Modifier.size(18.dp))
                                }
                            }
                        },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OrangePrimary,
                            unfocusedBorderColor = Gray300,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                        )
                    )

                    // Commune Chips List
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(communesList) { commune ->
                            val isSelected = selectedCommune == commune
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (isSelected) OrangePrimary else Color.White)
                                    .border(
                                        1.dp,
                                        if (isSelected) OrangePrimary else Gray300,
                                        RoundedCornerShape(20.dp)
                                    )
                                    .clickable { selectedCommune = commune }
                                    .padding(horizontal = 14.dp, vertical = 6.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    commune,
                                    fontFamily = InterFontFamily,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.sp,
                                    color = if (isSelected) Color.White else Gray900
                                )
                            }
                        }
                    }
                }

                // Relay Points List
                if (state.isLoading && state.relayPoints.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = OrangePrimary)
                    }
                } else if (filteredRelays.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Default.LocationOff, null, modifier = Modifier.size(48.dp), tint = Gray500)
                            Text("Aucun point relais trouvé", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, color = Gray900)
                            Text("Réessayez avec une autre recherche", fontFamily = InterFontFamily, fontSize = 13.sp, color = Gray500)
                        }
                    }
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filteredRelays, key = { it.id }) { r ->
                            RelayPointItemCard(
                                relay = r,
                                highlighted = r.id == selectedRelayId,
                                onCallClick = { phone ->
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                    context.startActivity(intent)
                                },
                                onDirectionsClick = { lat, lng ->
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng(${r.name})"))
                                    intent.setPackage("com.google.android.apps.maps")
                                    if (intent.resolveActivity(context.packageManager) != null) {
                                        context.startActivity(intent)
                                    } else {
                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$lat,$lng"))
                                        context.startActivity(browserIntent)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RelayPointItemCard(
    relay: RelayPointDto,
    highlighted: Boolean = false,
    onCallClick: (String) -> Unit,
    onDirectionsClick: (Double, Double) -> Unit,
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(if (highlighted) 2.dp else 1.dp, if (highlighted) OrangePrimary else Gray300),
        colors = CardDefaults.cardColors(containerColor = if (highlighted) Color(0xFFFFF8F2) else Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Header: Name + type tag
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        relay.name,
                        fontFamily = InterFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Gray900
                    )
                    Row(
                        modifier = Modifier.padding(top = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            relay.commune ?: "",
                            fontFamily = InterFontFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            color = OrangePrimary
                        )
                        if (!relay.quartier.isNullOrBlank()) {
                            Text(" • ", color = Gray300, fontSize = 12.sp)
                            Text(
                                relay.quartier,
                                fontFamily = InterFontFamily,
                                fontSize = 12.sp,
                                color = Gray500
                            )
                        }
                    }
                }
            }

            // Info rows
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                // Address
                if (!relay.address.isNullOrBlank()) {
                    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.LocationOn, null, tint = Gray500, modifier = Modifier.size(15.dp))
                        Text(
                            relay.address,
                            fontFamily = InterFontFamily,
                            fontSize = 12.sp,
                            color = Gray900
                        )
                    }
                }

                // Hours
                if (!relay.hours.isNullOrBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.AccessTime, null, tint = Gray500, modifier = Modifier.size(15.dp))
                        Text(
                            relay.hours,
                            fontFamily = InterFontFamily,
                            fontSize = 12.sp,
                            color = SuccessGreen,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Action Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Call button
                if (!relay.phone.isNullOrBlank()) {
                    OutlinedButton(
                        onClick = { onCallClick(relay.phone) },
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, OrangePrimary),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = OrangePrimary)
                    ) {
                        Icon(Icons.Default.Phone, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Appeler", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                // Directions button
                if (relay.latitude != null && relay.longitude != null) {
                    Button(
                        onClick = { onDirectionsClick(relay.latitude, relay.longitude) },
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary)
                    ) {
                        Icon(Icons.Default.Navigation, null, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Itinéraire", fontFamily = InterFontFamily, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
