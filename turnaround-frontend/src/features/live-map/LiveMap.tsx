import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useVehicles } from '../../hooks/useVehicles';
import { useLocations } from '../../hooks/useLocations';
import { useLiveGPSEvents } from '../../hooks/useLiveMap';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatMinutes } from '../../lib/format';
import type { Vehicle, VehicleStatus } from '../../lib/api/types';
import { useTheme } from '../../lib/ThemeContext';
import {
  Search, Layers, X,
  Truck, ChevronLeft, ChevronRight,
  Compass, MapPin, Route, ArrowRight
} from 'lucide-react';

// CARTO API Key for vector / raster basemap styles
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

const MAP_STYLES = [
  {
    id: 'voyager',
    name: 'FedEx Logistics (Light)',
    style: CARTO_KEY
      ? `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?key=${CARTO_KEY}`
      : {
          version: 8,
          sources: {
            'carto-voyager': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap © CARTO',
            },
          },
          layers: [{ id: 'carto-voyager-layer', type: 'raster', source: 'carto-voyager', minzoom: 0, maxzoom: 19 }],
        },
  },
  {
    id: 'dark',
    name: 'Night Corridor (Dark)',
    style: CARTO_KEY
      ? `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json?key=${CARTO_KEY}`
      : {
          version: 8,
          sources: {
            'carto-dark': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap © CARTO',
            },
          },
          layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 19 }],
        },
  },
  {
    id: 'osm',
    name: 'OpenStreetMap Standard',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }],
    },
  },
];


// East Africa Major Commercial Logistics Corridors GeoJSON
const CORRIDOR_ROUTES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Northern Corridor (Mombasa - Nairobi - Malaba)' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [39.6682, -4.0435], // Mombasa Kilindini Port
          [39.5500, -3.9500], // Changamwe
          [38.5630, -3.3975], // Voi
          [38.1667, -2.6833], // Mtito Andei
          [37.6500, -2.1833], // Sultan Hamud
          [37.0500, -1.5500], // Machakos Junction
          [36.9800, -1.4500], // Athi River Depot
          [36.8850, -1.3250], // Nairobi ICD
          [36.4300, -0.7200], // Naivasha Inland Dry Port
          [36.0700, -0.2800], // Nakuru Junction
          [35.2700, 0.5200],  // Eldoret Logistics Hub
          [34.7700, 0.6200],  // Webuye
          [34.2760, 0.6340],  // Malaba OSBP Border
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Namanga Southern Link (Nairobi - Namanga Border)' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [36.8850, -1.3250], // Nairobi ICD
          [36.9800, -1.4500], // Athi River
          [36.8700, -1.8500], // Kajiado
          [36.7800, -2.5450], // Namanga OSBP Border
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Western Lake Link (Nakuru - Kericho - Kisumu Port)' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [36.0700, -0.2800], // Nakuru
          [35.2800, -0.3700], // Kericho
          [34.7500, -0.1000], // Kisumu Container Pier
        ],
      },
    },
  ],
};

export const LiveMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Theme available for future use
  useTheme();

  // Read URL params — ?focus=vehicleId&origin_lat=...&dest_lat=... etc.
  const [searchParams] = useSearchParams();
  const focusVehicleId = searchParams.get('focus');
  const originLat  = parseFloat(searchParams.get('origin_lat') || '');
  const originLng  = parseFloat(searchParams.get('origin_lng') || '');
  const destLat    = parseFloat(searchParams.get('dest_lat') || '');
  const destLng    = parseFloat(searchParams.get('dest_lng') || '');
  const originName = searchParams.get('origin_name') ? decodeURIComponent(searchParams.get('origin_name')!) : null;
  const destName   = searchParams.get('dest_name')   ? decodeURIComponent(searchParams.get('dest_name')!)   : null;
  const hasRoute   = !isNaN(originLat) && !isNaN(originLng) && !isNaN(destLat) && !isNaN(destLng);

  // Build a Google Maps directions URL (opens in new tab as fallback or iframe src)
  const googleMapsDirectionsUrl = hasRoute
    ? `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`
    : null;

  const googleMapsEmbedUrl = hasRoute && import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving`
    : null;

  const [showDirections, setShowDirections] = useState(hasRoute);

  // State
  const [selectedStyleId, setSelectedStyleId] = useState<string>('osm');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [vehicleCardExpanded, setVehicleCardExpanded] = useState<boolean>(false);

  // Queries
  const { data: vehicles } = useVehicles();
  const { data: locations } = useLocations();
  const { data: gpsPositions } = useLiveGPSEvents(8000);
  const { data: dwells } = useQuery({
    queryKey: ['dwellEvents', 'map'],
    queryFn: () => apiClient.getDwellEvents(),
  });

  // 1. Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialStyleObj = (MAP_STYLES.find(s => s.id === 'osm') || MAP_STYLES[0]).style;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleObj as any,
      center: [37.2, -0.8],
      zoom: 6.8,
      pitch: 20,
      bearing: 0,
      attributionControl: false,
      transformRequest: (url: string) => {
        if (CARTO_KEY && url.includes('cartocdn.com') && !url.includes('key=')) {
          const sep = url.includes('?') ? '&' : '?';
          return { url: `${url}${sep}key=${CARTO_KEY}` };
        }
        return { url };
      },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      // Add delivery routes
      if (!map.getSource('corridor-routes')) {
        map.addSource('corridor-routes', {
          type: 'geojson',
          data: CORRIDOR_ROUTES_GEOJSON,
        });

        // Route casing / glow
        map.addLayer({
          id: 'corridor-routes-casing',
          type: 'line',
          source: 'corridor-routes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#250C77',
            'line-width': 7,
            'line-opacity': 0.8,
          },
        });

        // Route express dash line
        map.addLayer({
          id: 'corridor-routes-core',
          type: 'line',
          source: 'corridor-routes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ED642B',
            'line-width': 3.2,
            'line-dasharray': [2, 2],
            'line-opacity': 0.95,
          },
        });
      }
    });

    mapInstanceRef.current = map;

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Change style when user selects a layer
  const handleStyleChange = (styleId: string) => {
    setSelectedStyleId(styleId);
    setShowLayerMenu(false);
    const map = mapInstanceRef.current;
    if (!map) return;

    const chosen = MAP_STYLES.find(s => s.id === styleId) || MAP_STYLES[0];
    map.setStyle(chosen.style as any);

    // Re-attach corridor lines after style reload
    map.once('style.load', () => {
      if (!map.getSource('corridor-routes')) {
        map.addSource('corridor-routes', {
          type: 'geojson',
          data: CORRIDOR_ROUTES_GEOJSON,
        });
        map.addLayer({
          id: 'corridor-routes-casing',
          type: 'line',
          source: 'corridor-routes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#250C77', 'line-width': 7, 'line-opacity': 0.8 },
        });
        map.addLayer({
          id: 'corridor-routes-core',
          type: 'line',
          source: 'corridor-routes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ED642B', 'line-width': 3.2, 'line-dasharray': [2, 2], 'line-opacity': 0.95 },
        });
      }
    });
  };

  // 3. Toggle corridor routes visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const visibility = showRoutes ? 'visible' : 'none';
    if (map.getLayer('corridor-routes-casing')) {
      map.setLayoutProperty('corridor-routes-casing', 'visibility', visibility);
    }
    if (map.getLayer('corridor-routes-core')) {
      map.setLayoutProperty('corridor-routes-core', 'visibility', visibility);
    }
  }, [showRoutes]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return (vehicles || []).filter((v) => {
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        v.registration_number.toLowerCase().includes(q) ||
        (v.current_location_name && v.current_location_name.toLowerCase().includes(q)) ||
        v.vehicle_type.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  // 4. Render Terminal & Stop Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old stop markers
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    if (!showStops || !locations) return;

    locations.forEach((loc) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer flex flex-col items-center';
      el.innerHTML = `
        <div class="h-6 w-6 rounded-full bg-[#250C77] text-white border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ED642B" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 rounded bg-[#180B4A]/90 text-white text-[9.5px] font-bold border border-white/20 whitespace-nowrap shadow-md">
          ${loc.name}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
        <div style="padding: 6px; font-family: Plus Jakarta Sans, sans-serif; font-size: 11px; color: #111827;">
          <div style="font-weight: 800; font-size: 12px; margin-bottom: 2px; color: #250C77;">${loc.name}</div>
          <div>Type: <strong>${loc.location_type.replace('_', ' ')}</strong></div>
          <div>Target SLA: <strong>${formatMinutes(loc.expected_dwell_minutes)}</strong></div>
          <div>Operating Radius: <strong>${loc.geofence_radius}m</strong></div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map);

      stopMarkersRef.current.push(marker);
    });
  }, [locations, showStops]);

  // 5. Render Vehicle Telematics Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove markers for vehicles that are no longer filtered
    Object.keys(vehicleMarkersRef.current).forEach((id) => {
      if (!filteredVehicles.some(v => v.id === id)) {
        vehicleMarkersRef.current[id].remove();
        delete vehicleMarkersRef.current[id];
      }
    });

    filteredVehicles.forEach((vh) => {
      const gps = gpsPositions ? gpsPositions[vh.id] : null;
      if (!gps) return;

      const isSelected = selectedVehicleId === vh.id;
      const isDelayed = vh.status === 'delayed';
      const isMoving = vh.status === 'moving';

      const bg = isDelayed ? '#EF4444' : isMoving ? '#10B981' : '#250C77';
      const ring = isSelected ? 'ring-4 ring-[#ED642B]' : '';

      const el = document.createElement('div');
      el.className = `cursor-pointer flex flex-col items-center transition-transform ${ring}`;
      el.innerHTML = `
        <div style="background-color: ${bg}; color: white; padding: 2px 7px; border-radius: 8px; font-size: 10.5px; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
          <span>🚛</span>
          <span>${vh.registration_number}</span>
        </div>
        ${isMoving && gps.speed > 0 ? `<div style="margin-top: 1px; background: rgba(0,0,0,0.8); color: white; padding: 1px 4px; border-radius: 4px; font-size: 8.5px; font-weight: 700;">${Math.round(gps.speed)} km/h</div>` : ''}
      `;

      el.addEventListener('click', () => {
        setSelectedVehicleId(vh.id);
        map.flyTo({ center: [gps.longitude, gps.latitude], zoom: 13, duration: 1000 });
      });

      if (vehicleMarkersRef.current[vh.id]) {
        vehicleMarkersRef.current[vh.id].setLngLat([gps.longitude, gps.latitude]);
      } else {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([gps.longitude, gps.latitude])
          .addTo(map);

        vehicleMarkersRef.current[vh.id] = marker;
      }
    });
  }, [filteredVehicles, gpsPositions, selectedVehicleId]);

  // Focus vehicle from sidebar
  const handleFocusVehicle = useCallback((vh: Vehicle) => {
    setSelectedVehicleId(vh.id);
    const gps = gpsPositions ? gpsPositions[vh.id] : null;
    if (gps && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [gps.longitude, gps.latitude],
        zoom: 13,
        pitch: 30,
        duration: 1000,
      });
    }
  }, [gpsPositions]);

  // Reset to East Africa overview
  const handleResetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [37.2, -0.8],
        zoom: 6.8,
        pitch: 20,
        bearing: 0,
        duration: 1000,
      });
    }
    setSelectedVehicleId(null);
  }, []);

  const activeVehicle = (vehicles || []).find((v) => v.id === selectedVehicleId);
  const activeVehicleGps = selectedVehicleId && gpsPositions ? gpsPositions[selectedVehicleId] : null;
  const activeVehicleDwell = activeVehicle && dwells
    ? dwells.find((d: any) => d.vehicle_id === activeVehicle.id && !d.departure_time)
    : null;

  // Auto-focus vehicle from ?focus= URL param
  useEffect(() => {
    if (!focusVehicleId || !vehicles) return;
    const vh = vehicles.find(v => v.id === focusVehicleId);
    if (vh) handleFocusVehicle(vh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusVehicleId, vehicles]);

  // Draw origin→destination line on map when route params are present
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasRoute) return;

    const addRouteLayer = () => {
      // Remove existing trip-route layer if any
      if (map.getLayer('trip-route-line')) map.removeLayer('trip-route-line');
      if (map.getLayer('trip-route-points')) map.removeLayer('trip-route-points');
      if (map.getSource('trip-route')) map.removeSource('trip-route');

      map.addSource('trip-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [originLng, originLat],
                  [destLng, destLat],
                ],
              },
            },
          ],
        },
      });

      map.addLayer({
        id: 'trip-route-line',
        type: 'line',
        source: 'trip-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ED642B',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      });

      // Fit map to show origin and destination
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([originLng, originLat]);
      bounds.extend([destLng, destLat]);
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    };

    if (map.isStyleLoaded()) {
      addRouteLayer();
    } else {
      map.once('load', addRouteLayer);
    }

    return () => {
      const m = mapInstanceRef.current;
      if (!m) return;
      if (m.getLayer('trip-route-line')) m.removeLayer('trip-route-line');
      if (m.getSource('trip-route')) m.removeSource('trip-route');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute, originLat, originLng, destLat, destLng]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-bg-surface flex">

      {/* ── MAP CONTAINER (Direct MapLibre GL canvas) ── */}
      <div className="relative flex-1 h-full w-full min-h-[550px]">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '550px' }} />

        {/* ── TOP MAP CONTROLS OVERLAY BAR ── */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
          {/* Left Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-bg-surface/95 backdrop-blur-md border border-border-default text-text-primary hover:bg-bg-surface-raised shadow-md transition-colors cursor-pointer"
              title="Toggle Directory"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <button
              onClick={handleResetView}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-surface/95 backdrop-blur-md border border-border-default text-xs font-bold text-text-primary hover:bg-bg-surface-raised shadow-md transition-colors cursor-pointer"
            >
              <Compass size={14} className="text-[#ED642B]" />
              <span>Reset Overview</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-end">

            {/* ── Fleet Status Filter Pills ── */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-bg-surface/95 backdrop-blur-md border border-border-default shadow-md">
              {([
                { value: 'all',         label: 'All',        dot: 'bg-text-tertiary' },
                { value: 'moving',      label: 'Transit',    dot: 'bg-emerald-500'  },
                { value: 'in_transit',  label: 'Dispatch',   dot: 'bg-[#250C77]'    },
                { value: 'stationary',  label: 'Stationary', dot: 'bg-amber-400'    },
                { value: 'delayed',     label: 'Delayed',    dot: 'bg-red-500'      },
                { value: 'idle',        label: 'Idle',       dot: 'bg-gray-400'     },
                { value: 'maintenance', label: 'Maint.',     dot: 'bg-yellow-500'   },
              ] as const).map(({ value, label, dot }) => {
                const count = value === 'all'
                  ? (vehicles || []).length
                  : (vehicles || []).filter(v => v.status === value).length;
                if (count === 0 && value !== 'all') return null;
                const isActive = statusFilter === value;
                return (
                  <button key={value} onClick={() => setStatusFilter(value as any)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap leading-none ${
                      isActive ? 'bg-[#250C77] text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised'
                    }`}>
                    <span className={`h-1 w-1 rounded-full ${dot}`} />
                    {label}
                    <span className={`font-numeric text-[9px] ${isActive ? 'opacity-60' : 'text-text-tertiary'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Toggle Transit Nodes */}
            <button
              onClick={() => setShowStops(!showStops)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors cursor-pointer backdrop-blur-md ${
                showStops
                  ? 'bg-[#250C77] text-white border-[#250C77]'
                  : 'bg-bg-surface/95 text-text-secondary border-border-default hover:text-text-primary'
              }`}
            >
              <MapPin size={14} className={showStops ? 'text-[#ED642B]' : ''} />
              <span>Transit Nodes</span>
            </button>

            {/* Toggle Delivery Routes */}
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors cursor-pointer backdrop-blur-md ${
                showRoutes
                  ? 'bg-[#ED642B] text-white border-[#ED642B]'
                  : 'bg-bg-surface/95 text-text-secondary border-border-default hover:text-text-primary'
              }`}
            >
              <Route size={14} />
              <span>Corridors</span>
            </button>

            {/* Style Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-surface/95 backdrop-blur-md border border-border-default text-xs font-bold text-text-primary hover:bg-bg-surface-raised shadow-md transition-colors cursor-pointer"
              >
                <Layers size={14} className="text-[#250C77]" />
                <span>Theme</span>
              </button>

              {showLayerMenu && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-bg-surface border border-border-strong p-1.5 shadow-2xl space-y-1 z-50">
                  {MAP_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleStyleChange(style.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedStyleId === style.id
                          ? 'bg-[#ED642B] text-white'
                          : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TRIP ROUTE PANEL (shown when navigating from TripDetail) ── */}
        {hasRoute && showDirections && (
          <div className="absolute top-16 left-4 z-20 w-72 rounded-2xl bg-bg-surface/97 backdrop-blur-md border border-border-strong shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-[#250C77]/10">
              <div className="flex items-center gap-2">
                <Route size={14} className="text-[#ED642B]" />
                <span className="text-xs font-bold text-text-primary">Trip Route</span>
              </div>
              <button onClick={() => setShowDirections(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer">
                <X size={13} />
              </button>
            </div>
            {/* Route stops */}
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                  <div className="w-px flex-1 bg-border-default mt-1 mb-1" style={{ minHeight: 24 }} />
                  <div className="h-3 w-3 rounded-full bg-[#ED642B] shrink-0" />
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Origin</p>
                    <p className="text-xs font-semibold text-text-primary truncate">{originName || `${originLat.toFixed(4)}, ${originLng.toFixed(4)}`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Destination</p>
                    <p className="text-xs font-semibold text-text-primary truncate">{destName || `${destLat.toFixed(4)}, ${destLng.toFixed(4)}`}</p>
                  </div>
                </div>
              </div>

              {/* Google Maps Directions button */}
              <a
                href={googleMapsDirectionsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Google Maps
                <ArrowRight size={12} />
              </a>

              {/* Embed if API key is set */}
              {googleMapsEmbedUrl && (
                <div className="rounded-xl overflow-hidden border border-border-default" style={{ height: 180 }}>
                  <iframe
                    title="Trip Directions"
                    src={googleMapsEmbedUrl}
                    width="100%"
                    height="180"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              {!googleMapsEmbedUrl && (
                <p className="text-[10px] text-text-tertiary text-center">
                  Add <code className="bg-bg-surface-raised px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to .env for the embedded directions view.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Selected vehicle quick card overlay (bottom-left) */}
        {activeVehicle && activeVehicleGps && (
          <div className="absolute bottom-6 left-6 w-72 rounded-2xl bg-bg-surface/97 backdrop-blur-md border border-border-strong shadow-2xl z-20 pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-[#250C77]/8">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-[#250C77] flex items-center justify-center shrink-0">
                  <Truck size={14} className="text-[#ED642B]" />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-sm font-extrabold text-text-primary block truncate">{activeVehicle.registration_number}</span>
                  <span className="text-[10px] text-text-tertiary truncate">{activeVehicle.vehicle_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setVehicleCardExpanded(e => !e)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
                  title={vehicleCardExpanded ? 'Collapse' : 'Expand details'}>
                  <ChevronLeft size={13} className={`transition-transform ${vehicleCardExpanded ? '-rotate-90' : 'rotate-90'}`} />
                </button>
                <button onClick={() => { setSelectedVehicleId(null); setVehicleCardExpanded(false); }}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Always-visible summary */}
            <div className="px-4 py-2.5 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-numeric font-bold text-text-primary">{Math.round(activeVehicleGps.speed ?? 0)} km/h</span>
              </div>
              {activeVehicle.driver_name && (
                <span className="text-text-secondary truncate">{activeVehicle.driver_name}</span>
              )}
              {activeVehicleDwell && (
                <span className="ml-auto text-[10px] font-bold text-[#ED642B]">+{formatMinutes((activeVehicleDwell as any).excess_minutes ?? 0)}</span>
              )}
            </div>

            {/* Expandable detail panel */}
            {vehicleCardExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border-default pt-3">
                {/* Location */}
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-[#ED642B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Current Position</p>
                    <p className="text-xs font-semibold text-text-primary font-numeric">
                      {activeVehicleGps.latitude?.toFixed(5)}, {activeVehicleGps.longitude?.toFixed(5)}
                    </p>
                    {activeVehicleGps.recorded_at && (
                      <p className="text-[10px] text-text-tertiary">Updated: {new Date(activeVehicleGps.recorded_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                    )}
                  </div>
                </div>

                {/* Active dwell */}
                {activeVehicleDwell && (
                  <div className="p-2.5 rounded-xl bg-[#ED642B]/10 border border-[#ED642B]/20 text-[11px]">
                    <p className="font-bold text-[#ED642B]">Dwell: {(activeVehicleDwell as any).location_name}</p>
                    <p className="text-text-secondary mt-0.5">Excess: +{formatMinutes((activeVehicleDwell as any).excess_minutes ?? 0)}</p>
                  </div>
                )}

                {/* Load / Container */}
                {(activeVehicle.container_number || activeVehicle.cargo_type) && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/8 border border-indigo-500/20 text-[11px]">
                    <p className="font-bold text-indigo-500">
                      {activeVehicle.container_number ? `Container: ${activeVehicle.container_number}` : 'Load assigned'}
                    </p>
                    {activeVehicle.cargo_type && <p className="text-text-secondary mt-0.5">{activeVehicle.cargo_type}</p>}
                    {(activeVehicle as any).capacity && (
                      <p className="text-text-secondary font-numeric">{(activeVehicle as any).capacity}T capacity</p>
                    )}
                  </div>
                )}

                {/* Telematics grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-text-tertiary">Speed</p>
                    <p className="font-numeric font-bold text-text-primary">{Math.round(activeVehicleGps.speed ?? 0)} km/h</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-tertiary">Heading</p>
                    <p className="font-numeric font-bold text-text-primary">{Math.round(activeVehicleGps.heading ?? 0)}°</p>
                  </div>
                  {activeVehicle.fuel_level != null && (
                    <div>
                      <p className="text-[10px] text-text-tertiary">Fuel</p>
                      <p className={`font-numeric font-bold ${activeVehicle.fuel_level < 20 ? 'text-red-500' : 'text-text-primary'}`}>{activeVehicle.fuel_level}%</p>
                    </div>
                  )}
                  {activeVehicle.capacity && (
                    <div>
                      <p className="text-[10px] text-text-tertiary">Capacity</p>
                      <p className="font-numeric font-bold text-text-primary">{activeVehicle.capacity}T</p>
                    </div>
                  )}
                </div>

                <Link to={`/vehicles/${activeVehicle.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-bold transition-colors">
                  Full Asset Profile <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── COLLAPSIBLE FLEET DIRECTORY SIDEBAR ── */}
      {sidebarOpen && (
        <div className="w-80 h-full border-l border-border-default bg-bg-surface flex flex-col shrink-0 z-20">
          {/* Header */}
          <div className="p-4 border-b border-border-default space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-text-primary">Live Fleet Directory</h2>
                <p className="text-[11px] text-text-secondary">Click any unit to focus and track</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter plate or stop..."
                className="w-full bg-bg-surface-raised border border-border-default rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1">
              {(['all', 'moving', 'delayed', 'stationary'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-colors cursor-pointer ${
                    statusFilter === s
                      ? 'bg-[#250C77] text-white'
                      : 'bg-bg-surface-raised text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'moving' ? 'Transit' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredVehicles.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-tertiary">
                No vehicles matching filter.
              </div>
            ) : (
              filteredVehicles.map((vh) => {
                const gps = gpsPositions ? gpsPositions[vh.id] : null;
                const isSelected = selectedVehicleId === vh.id;

                return (
                  <div
                    key={vh.id}
                    onClick={() => handleFocusVehicle(vh)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#ED642B] bg-[#ED642B]/10 shadow-md ring-1 ring-[#ED642B]'
                        : 'border-border-default bg-bg-surface hover:bg-bg-surface-raised/80 hover:border-[#ED642B]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className={isSelected ? 'text-[#ED642B]' : 'text-[#250C77]'} />
                        <span className="font-numeric text-xs font-extrabold text-text-primary">
                          {vh.registration_number}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                        vh.status === 'moving'
                          ? 'bg-status-good/15 text-status-good'
                          : vh.status === 'delayed'
                          ? 'bg-status-danger-bg text-status-danger'
                          : 'bg-bg-surface-raised text-text-tertiary'
                      }`}>
                        {vh.status === 'moving' ? 'In Transit' : vh.status === 'delayed' ? 'Delayed' : 'Stationary'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span className="truncate">{vh.vehicle_type}</span>
                      {gps && (
                        <span className="font-numeric font-bold text-text-primary">
                          {Math.round(gps.speed)} km/h
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
