import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useVehicles } from '../../hooks/useVehicles';
import { useLocations } from '../../hooks/useLocations';
import { useLiveGPSEvents } from '../../hooks/useLiveMap';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { useCompany } from '../../lib/CompanyContext';
import { getOperatingZone } from '../../lib/operatingZones';
import { formatMinutes } from '../../lib/format';
import type { Vehicle, VehicleStatus } from '../../lib/api/types';
import {
  Search, X,
  Truck, ChevronLeft, ChevronDown,
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

function terminalIcon(locationType: string): string {
  const common = 'width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ED642B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  if (locationType === 'port') {
    return `<svg ${common}><path d="M3 20h18M5 17h14M7 17V7h10v10M9 7V4h6v3M12 10v4"/></svg>`;
  }
  if (locationType === 'border_crossing') {
    return `<svg ${common}><path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-5h6v5M3 10h18"/></svg>`;
  }
  return `<svg ${common}><path d="M3 21h18M5 21V10l7-6 7 6v11M8 21v-6h3v6M13 15h3v6M8 11h8"/></svg>`;
}


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
  const [showRoutes] = useState<boolean>(true);
  const [showStops] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [vehicleCardExpanded, setVehicleCardExpanded] = useState<boolean>(false);
  const { config: companyConfig } = useCompany();
  const operatingZone = getOperatingZone(companyConfig?.operating_zone);

  // Queries
  const { data: vehicles } = useVehicles();
  const { data: locations } = useLocations();
  const { data: gpsPositions } = useLiveGPSEvents(8000);
  const { data: trips = [] } = useQuery({ queryKey: ['trips', 'corridor-tracker'], queryFn: apiClient.getTrips, staleTime: 30_000 });
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
      center: operatingZone.center,
      zoom: operatingZone.zoom,
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
      map.addSource('operating-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: operatingZone.label },
          geometry: { type: 'Polygon', coordinates: [operatingZone.polygon] },
        },
      });
      map.addSource('operating-zone-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: operatingZone.polygon } },
      });
      map.addLayer({
        id: 'operating-zone-fill',
        type: 'fill',
        source: 'operating-zone',
        paint: { 'fill-color': '#ED642B', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'operating-zone-outline',
        type: 'line',
        source: 'operating-zone-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ED642B', 'line-width': 4, 'line-dasharray': [2, 1], 'line-opacity': 1 },
      });
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
  }, [operatingZone]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const updateBoundary = () => {
      const source = map.getSource('operating-zone') as maplibregl.GeoJSONSource | undefined;
      const lineSource = map.getSource('operating-zone-line') as maplibregl.GeoJSONSource | undefined;
      if (!source || !lineSource) return;
      const boundary = {
        type: 'Feature',
        properties: { name: operatingZone.label },
        geometry: { type: 'Polygon', coordinates: [operatingZone.polygon] },
      } as GeoJSON.Feature<GeoJSON.Polygon>;
      source.setData(boundary);
      lineSource.setData({ type: 'Feature', properties: { name: operatingZone.label }, geometry: { type: 'LineString', coordinates: operatingZone.polygon } });
      map.flyTo({ center: operatingZone.center, zoom: operatingZone.zoom, duration: 800 });
    };
    if (!map.isStyleLoaded()) {
      map.once('load', updateBoundary);
      return () => map.off('load', updateBoundary);
    }
    updateBoundary();
  }, [operatingZone]);

  // Toggle corridor routes visibility
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
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        v.registration_number.toLowerCase().includes(q) ||
        (v.current_location_name && v.current_location_name.toLowerCase().includes(q)) ||
        v.vehicle_type.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesStatus && matchesSearch;
    });
  }, [vehicles, statusFilter, searchQuery]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (locations || []).filter(location => !q || location.name.toLowerCase().includes(q) || location.location_type.toLowerCase().includes(q));
  }, [locations, searchQuery]);

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
          ${terminalIcon(loc.location_type)}
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
      const isMoving = vh.status === 'in_transit' || (vh.status as string) === 'moving'; // 'moving' kept as legacy shim

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

  const handleFocusLocation = useCallback((location: { latitude: number; longitude: number }) => {
    mapInstanceRef.current?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 12,
      pitch: 20,
      duration: 1000,
    });
  }, []);

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

  const activeVehicleCount = (vehicles || []).filter(vehicle => ['active', 'in_transit', 'delayed'].includes(vehicle.status)).length;
  const movingVehicleCount = (vehicles || []).filter(vehicle => vehicle.status === 'in_transit').length;
  const completedShipmentCount = trips.filter(trip => trip.status === 'completed').length;
  const onTimeShipmentCount = trips.filter(trip => trip.status !== 'delayed').length;
  const onTimeShipmentRate = trips.length ? Math.round((onTimeShipmentCount / trips.length) * 1000) / 10 : 100;
  const activeCorridorCount = CORRIDOR_ROUTES_GEOJSON.features.length;
  const dashboardMetrics: Array<{ label: string; value: string | number; detail: string; icon: React.ElementType }> = [
    { label: 'Active Corridors', value: activeCorridorCount, detail: 'All major routes operational', icon: Route },
    { label: 'Active Vehicles', value: activeVehicleCount, detail: `${movingVehicleCount} currently moving`, icon: Truck },
    { label: 'Avg. Transit Time', value: '—', detail: 'Live route estimate pending', icon: Compass },
    { label: 'Total Shipments', value: trips.length, detail: `${completedShipmentCount} completed`, icon: MapPin },
    { label: 'On-Time Delivery', value: `${onTimeShipmentRate}%`, detail: `${onTimeShipmentCount} on time`, icon: Route },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-canvas flex flex-col">
      <header className="flex flex-col gap-4 border-b border-border-default bg-bg-surface px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#250C77]/20 text-[#8B5CF6]"><Route size={22} /></div><div><h1 className="text-xl font-bold tracking-tight text-text-primary">Corridor Tracker</h1><p className="text-xs text-text-secondary">Real-time monitoring of key logistics corridors across East Africa</p></div></div>
        <div className="flex items-center gap-2"><button className="h-9 rounded-lg border border-border-default bg-bg-surface-raised px-3 text-xs font-medium text-text-primary cursor-pointer">All Corridors <ChevronDown size={13} className="ml-2 inline" /></button><button className="h-9 rounded-lg border border-border-default bg-bg-surface-raised px-3 text-xs font-medium text-text-primary cursor-pointer">Filters</button><button onClick={handleResetView} className="h-9 rounded-lg bg-[#ED642B] px-3 text-xs font-bold text-white cursor-pointer">Live Map <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" /></button></div>
      </header>
      <div className="grid grid-cols-1 gap-3 bg-bg-canvas p-4 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardMetrics.map(({ label, value, detail, icon: Icon }) => <div key={label} className="min-w-0 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#250C77] text-white"><Icon size={17} /></div><div className="min-w-0"><p className="truncate text-[11px] text-text-secondary">{label}</p><p className="text-xl font-bold text-text-primary">{value}</p><p className="truncate text-[10px] text-text-tertiary">{detail}</p></div></div></div>)}
      </div>

      <div className="relative flex min-h-[620px] flex-1 w-full">
      {/* ── MAP CONTAINER (Direct MapLibre GL canvas) ── */}
      <div className="relative flex-1 h-full w-full min-h-[620px]">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '550px' }} />

        {/* Unified full-width search and filter bar */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 rounded-2xl border border-border-default bg-bg-surface/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search fleet or location"
              className="w-full rounded-xl border border-border-default bg-bg-surface-raised py-2.5 pl-9 pr-3 text-xs font-semibold text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
            />
          </div>
          <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-0.5">
            {([
              ['all', 'All'], ['in_transit', 'Transit'], ['active', 'Active'],
              ['idle', 'Idle'], ['delayed', 'Delayed'], ['maintenance', 'Service'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setStatusFilter(value)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${statusFilter === value ? 'bg-[#250C77] text-white' : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'}`}>
                {label}
              </button>
            ))}
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <div className="mt-2 grid gap-3 border-t border-border-default pt-2 md:grid-cols-2">
              <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{filteredVehicles.length} matching vehicles</p>
              <div className="space-y-1">
                {filteredVehicles.slice(0, 5).map(vehicle => (
                  <button key={vehicle.id} type="button" onClick={() => handleFocusVehicle(vehicle)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-bg-surface-raised">
                    <span className="min-w-0"><strong className="block truncate text-xs text-text-primary">{vehicle.registration_number}</strong><span className="block truncate text-[10px] text-text-tertiary">{vehicle.current_location_name || vehicle.vehicle_type}</span></span>
                    <span className="ml-2 shrink-0 text-[9px] font-bold uppercase text-text-tertiary">{vehicle.status.replace('_', ' ')}</span>
                  </button>
                ))}
                {!filteredVehicles.length && <p className="px-2.5 py-2 text-[11px] text-text-tertiary">No matching vehicles found.</p>}
              </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{filteredLocations.length} matching terminal nodes</p>
                <div className="space-y-1">
                  {filteredLocations.slice(0, 5).map(location => (
                    <button key={location.id} type="button" onClick={() => handleFocusLocation(location)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-bg-surface-raised">
                      <MapPin size={13} className="shrink-0 text-[#ED642B]" />
                      <span className="min-w-0"><strong className="block truncate text-xs text-text-primary">{location.name}</strong><span className="block truncate text-[10px] capitalize text-text-tertiary">{location.location_type.replace('_', ' ')}</span></span>
                    </button>
                  ))}
                  {!filteredLocations.length && <p className="px-2.5 py-2 text-[11px] text-text-tertiary">No matching terminal nodes found.</p>}
                </div>
              </div>
            </div>
          )}
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
                    <p className="font-numeric font-bold text-text-primary">{Math.round((activeVehicleGps as any).heading ?? 0)}°</p>
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
                  onClick={() => setStatusFilter(s === 'moving' ? 'in_transit' : s === 'stationary' ? 'idle' : s)}
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
                        vh.status === 'in_transit'
                          ? 'bg-status-good/15 text-status-good'
                          : vh.status === 'delayed'
                          ? 'bg-status-danger-bg text-status-danger'
                          : 'bg-bg-surface-raised text-text-tertiary'
                      }`}>
                        {vh.status === 'in_transit' ? 'In Transit' : vh.status === 'delayed' ? 'Delayed' : 'Stationary'}
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
    </div>
  );
};
