import { useEffect, useRef, useState } from 'react';

interface ZoneMapSelectorProps {
  onZoneSelected: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  initialBounds?: { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number } | null;
}

export default function ZoneMapSelector({ onZoneSelected, initialBounds }: ZoneMapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const rectangleRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const drawingStateRef = useRef<{
    isDrawing: boolean;
    startPoint: any | null;
    currentRect: any | null;
  }>({
    isDrawing: false,
    startPoint: null,
    currentRect: null,
  });

  // Abidjan center coordinates
  const ABIDJAN_CENTER: [number, number] = [5.316667, -4.033333];
  const DEFAULT_ZOOM = 11;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let mounted = true;
    let Leaflet: any = null;

    const initMap = async () => {
      try {
        // Dynamic import Leaflet
        const leafletModule = await import('leaflet');
        Leaflet = leafletModule.default;
        await import('leaflet/dist/leaflet.css');
        
        if (!mounted || !mapRef.current) return;

        // Fix Leaflet default icon issue
        delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
        Leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        const map = Leaflet.map(mapRef.current).setView(ABIDJAN_CENTER, DEFAULT_ZOOM);
        mapInstanceRef.current = map;

        // Add épuré CartoDB Positron tile layer
        Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }).addTo(map);

        // If initial bounds exist, draw rectangle
        if (initialBounds && initialBounds.minLat && initialBounds.maxLat && initialBounds.minLng && initialBounds.maxLng) {
          const bounds = Leaflet.latLngBounds(
            [initialBounds.minLat, initialBounds.minLng],
            [initialBounds.maxLat, initialBounds.maxLng]
          );
          const rect = Leaflet.rectangle(bounds, {
            color: '#FF6C00',
            fillColor: '#FF6C00',
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(map);
          rectangleRef.current = rect;
          map.fitBounds(bounds);
        }

        // Drawing handlers
        let mouseDownTime = 0;
        let mouseDownPos: any = null;

        const startDrawing = (e: any) => {
          // Only start drawing if drawing mode is enabled
          if (!drawingMode) return;
          
          mouseDownTime = Date.now();
          mouseDownPos = e.latlng;
          drawingStateRef.current.isDrawing = true;
          drawingStateRef.current.startPoint = e.latlng;
          setIsDrawing(true);
          map.dragging.disable();
        };

        const updateDrawing = (e: any) => {
          if (drawingStateRef.current.isDrawing && drawingStateRef.current.startPoint && drawingMode) {
            const bounds = Leaflet.latLngBounds([drawingStateRef.current.startPoint, e.latlng]);
            
            if (drawingStateRef.current.currentRect) {
              map.removeLayer(drawingStateRef.current.currentRect);
            }
            
            drawingStateRef.current.currentRect = Leaflet.rectangle(bounds, {
              color: '#FF6C00',
              fillColor: '#FF6C00',
              fillOpacity: 0.3,
              weight: 2,
              dashArray: '5, 5',
            }).addTo(map);
          }
        };

        const finishDrawing = (e: any) => {
          if (drawingStateRef.current.isDrawing && drawingStateRef.current.startPoint && drawingMode) {
            const timeDiff = Date.now() - mouseDownTime;
            const distance = mouseDownPos ? e.latlng.distanceTo(mouseDownPos) : 0;
            
            // Only finish if it was a drag (not just a click) and took more than 100ms
            if (timeDiff > 100 && distance > 100) {
              const bounds = Leaflet.latLngBounds([drawingStateRef.current.startPoint!, e.latlng]);
              
              // Remove temporary rectangle
              if (drawingStateRef.current.currentRect) {
                map.removeLayer(drawingStateRef.current.currentRect);
                drawingStateRef.current.currentRect = null;
              }
              
              // Remove old rectangle if exists
              if (rectangleRef.current) {
                map.removeLayer(rectangleRef.current);
              }
              
              // Create final rectangle
              const rect = Leaflet.rectangle(bounds, {
                color: '#FF6C00',
                fillColor: '#FF6C00',
                fillOpacity: 0.3,
                weight: 2,
              }).addTo(map);
              
              rectangleRef.current = rect;
              
              // Get bounds
              const rectBounds = rect.getBounds();
              const minLat = rectBounds.getSouth();
              const maxLat = rectBounds.getNorth();
              const minLng = rectBounds.getWest();
              const maxLng = rectBounds.getEast();
              
              onZoneSelected({ minLat, maxLat, minLng, maxLng });
              
              // Disable drawing mode after successful selection
              setDrawingMode(false);
            }
            
            drawingStateRef.current.isDrawing = false;
            drawingStateRef.current.startPoint = null;
            setIsDrawing(false);
            map.dragging.enable();
          }
        };

        // Add event listeners only when drawing mode is enabled
        const enableDrawingListeners = () => {
          map.on('mousedown', startDrawing);
          map.on('mousemove', updateDrawing);
          map.on('mouseup', finishDrawing);
          map.on('mouseleave', () => {
            if (drawingStateRef.current.isDrawing) {
              drawingStateRef.current.isDrawing = false;
              drawingStateRef.current.startPoint = null;
              if (drawingStateRef.current.currentRect) {
                map.removeLayer(drawingStateRef.current.currentRect);
                drawingStateRef.current.currentRect = null;
              }
              setIsDrawing(false);
              map.dragging.enable();
            }
          });
        };

        // Initial setup - enable drawing listeners
        enableDrawingListeners();

        // Store map reference for cleanup
        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update drawing mode and re-enable/disable event listeners
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    
    // Remove all existing listeners
    map.off('mousedown');
    map.off('mousemove');
    map.off('mouseup');
    map.off('mouseleave');

    if (drawingMode) {
      // Enable drawing mode
      let mouseDownTime = 0;
      let mouseDownPos: any = null;

      const startDrawing = (e: any) => {
        mouseDownTime = Date.now();
        mouseDownPos = e.latlng;
        drawingStateRef.current.isDrawing = true;
        drawingStateRef.current.startPoint = e.latlng;
        setIsDrawing(true);
        map.dragging.disable();
      };

      const updateDrawing = (e: any) => {
        if (drawingStateRef.current.isDrawing && drawingStateRef.current.startPoint) {
          const leafletModule = (window as any).leaflet || null;
          if (!leafletModule) return;
          
          const Leaflet = leafletModule;
          const bounds = Leaflet.latLngBounds([drawingStateRef.current.startPoint, e.latlng]);
          
          if (drawingStateRef.current.currentRect) {
            map.removeLayer(drawingStateRef.current.currentRect);
          }
          
          drawingStateRef.current.currentRect = Leaflet.rectangle(bounds, {
            color: '#FF6C00',
            fillColor: '#FF6C00',
            fillOpacity: 0.3,
            weight: 2,
            dashArray: '5, 5',
          }).addTo(map);
        }
      };

      const finishDrawing = async (e: any) => {
        if (drawingStateRef.current.isDrawing && drawingStateRef.current.startPoint) {
          const leafletModule = await import('leaflet');
          const Leaflet = leafletModule.default;
          
          const timeDiff = Date.now() - mouseDownTime;
          const distance = mouseDownPos ? e.latlng.distanceTo(mouseDownPos) : 0;
          
          if (timeDiff > 100 && distance > 100) {
            const bounds = Leaflet.latLngBounds([drawingStateRef.current.startPoint!, e.latlng]);
            
            if (drawingStateRef.current.currentRect) {
              map.removeLayer(drawingStateRef.current.currentRect);
              drawingStateRef.current.currentRect = null;
            }
            
            if (rectangleRef.current) {
              map.removeLayer(rectangleRef.current);
            }
            
            const rect = Leaflet.rectangle(bounds, {
              color: '#FF6C00',
              fillColor: '#FF6C00',
              fillOpacity: 0.3,
              weight: 2,
            }).addTo(map);
            
            rectangleRef.current = rect;
            
            const rectBounds = rect.getBounds();
            const minLat = rectBounds.getSouth();
            const maxLat = rectBounds.getNorth();
            const minLng = rectBounds.getWest();
            const maxLng = rectBounds.getEast();
            
            onZoneSelected({ minLat, maxLat, minLng, maxLng });
            setDrawingMode(false);
          }
          
          drawingStateRef.current.isDrawing = false;
          drawingStateRef.current.startPoint = null;
          setIsDrawing(false);
          map.dragging.enable();
        }
      };

      const cancelDrawing = () => {
        if (drawingStateRef.current.isDrawing) {
          drawingStateRef.current.isDrawing = false;
          drawingStateRef.current.startPoint = null;
          if (drawingStateRef.current.currentRect) {
            map.removeLayer(drawingStateRef.current.currentRect);
            drawingStateRef.current.currentRect = null;
          }
          setIsDrawing(false);
          map.dragging.enable();
        }
      };

      map.on('mousedown', startDrawing);
      map.on('mousemove', updateDrawing);
      map.on('mouseup', finishDrawing);
      map.on('mouseleave', cancelDrawing);
    } else {
      // Ensure dragging is enabled when not in drawing mode
      map.dragging.enable();
    }
  }, [drawingMode]);

  // Re-draw rectangle when initialBounds change
  useEffect(() => {
    const updateBounds = async () => {
      try {
        const leafletModule = await import('leaflet');
        const Leaflet = leafletModule.default;
        
        if (mapInstanceRef.current && initialBounds && 
            initialBounds.minLat && initialBounds.maxLat && 
            initialBounds.minLng && initialBounds.maxLng) {
          const bounds = Leaflet.latLngBounds(
            [initialBounds.minLat, initialBounds.minLng],
            [initialBounds.maxLat, initialBounds.maxLng]
          );
          
          if (rectangleRef.current) {
            mapInstanceRef.current.removeLayer(rectangleRef.current);
          }
          
          const rect = Leaflet.rectangle(bounds, {
            color: '#FF6C00',
            fillColor: '#FF6C00',
            fillOpacity: 0.3,
            weight: 2,
          }).addTo(mapInstanceRef.current);
          
          rectangleRef.current = rect;
          mapInstanceRef.current.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error updating bounds:', error);
      }
    };
    updateBounds();
  }, [initialBounds]);

  const handleClear = async () => {
    if (rectangleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(rectangleRef.current);
      rectangleRef.current = null;
      onZoneSelected({ minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 });
    }
  };

  const toggleDrawingMode = () => {
    setDrawingMode(!drawingMode);
    if (drawingStateRef.current.isDrawing) {
      drawingStateRef.current.isDrawing = false;
      drawingStateRef.current.startPoint = null;
      if (drawingStateRef.current.currentRect && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(drawingStateRef.current.currentRect);
        drawingStateRef.current.currentRect = null;
      }
      setIsDrawing(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dragging.enable();
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[#3A3A3A]">
          Sélectionner la zone sur la carte d'Abidjan
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDrawingMode}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              drawingMode
                ? 'bg-[#FF6C00] text-white hover:bg-[#e66100]'
                : 'bg-[#F6F7F9] text-[#3A3A3A] hover:bg-[#E6E6E6]'
            }`}
          >
            {drawingMode ? 'Mode dessin actif' : 'Activer le dessin'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Effacer
          </button>
        </div>
      </div>
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border-2 border-[#D1D5DB]"
          style={{ zIndex: 1 }}
        />
        {isDrawing && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-[1000]">
            <p className="text-sm font-medium">Dessinez un rectangle</p>
            <p className="text-xs mt-1">Maintenez et glissez pour définir la zone</p>
          </div>
        )}
        {drawingMode && !isDrawing && (
          <div className="absolute top-2 left-2 bg-[#FF6C00] text-white px-3 py-2 rounded-lg shadow-lg z-[1000]">
            <p className="text-xs font-medium">Mode dessin activé - Cliquez et glissez pour dessiner</p>
          </div>
        )}
      </div>
      <p className="text-xs text-[#6B7280]">
        {drawingMode
          ? 'Mode dessin activé : Cliquez et glissez sur la carte pour dessiner un rectangle délimitant la zone de livraison'
          : 'Cliquez sur "Activer le dessin" pour pouvoir dessiner une zone sur la carte. Vous pouvez déplacer la carte normalement.'}
      </p>
    </div>
  );
}
