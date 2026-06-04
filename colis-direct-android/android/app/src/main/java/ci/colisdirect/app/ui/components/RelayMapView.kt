package ci.colisdirect.app.ui.components

import android.graphics.drawable.GradientDrawable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import ci.colisdirect.app.data.api.model.RelayPointDto
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
/** Carte OSM des relais — aligné Leaflet Capacitor renderMap() */
@Composable
fun RelayMapView(
    relays: List<RelayPointDto>,
    selectedRelayId: String?,
    onRelaySelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val geoRelays = remember(relays) {
        relays.mapNotNull { r ->
            val lat = r.latitude ?: return@mapNotNull null
            val lng = r.longitude ?: return@mapNotNull null
            if (!lat.isFinite() || !lng.isFinite()) return@mapNotNull null
            if (lat < 4.0 || lat > 11.0 || lng < -9.0 || lng > -2.4) return@mapNotNull null
            r to GeoPoint(lat, lng)
        }
    }

    val mapView = remember {
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(6.0)
            controller.setCenter(GeoPoint(7.54, -5.55))
        }
    }

    DisposableEffect(Unit) {
        mapView.onResume()
        onDispose {
            mapView.onPause()
            mapView.onDetach()
        }
    }

    LaunchedEffect(geoRelays, selectedRelayId) {
        mapView.overlays.clear()
        geoRelays.forEach { (relay, point) ->
            val marker = Marker(mapView).apply {
                position = point
                title = relay.name
                snippet = relay.commune
                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                icon = markerDrawable(context, relay.id == selectedRelayId)
                setOnMarkerClickListener { _, _ ->
                    onRelaySelected(relay.id)
                    true
                }
            }
            mapView.overlays.add(marker)
        }
        if (geoRelays.isNotEmpty()) {
            val lats = geoRelays.map { it.second.latitude }
            val lngs = geoRelays.map { it.second.longitude }
            val pad = 0.08
            val box = BoundingBox(
                lats.max() + pad,
                lngs.max() + pad,
                lats.min() - pad,
                lngs.min() - pad,
            )
            mapView.post { mapView.zoomToBoundingBox(box, true) }
        }
        mapView.invalidate()
    }

    AndroidView(
        factory = { mapView },
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp),
        update = { it.invalidate() },
    )
}

private fun markerDrawable(context: android.content.Context, selected: Boolean): android.graphics.drawable.Drawable {
    val size = if (selected) 36 else 28
    return GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(if (selected) 0xFFFF6C00.toInt() else 0xFF16A34A.toInt())
        setSize(size, size)
    }
}
