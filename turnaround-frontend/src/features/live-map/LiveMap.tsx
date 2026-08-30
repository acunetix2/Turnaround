import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

// Free high-performance map styles (zero API keys needed)
const MAP_STYLES = [
  {
    id: 'voyager',
    name: 'FedEx Logistics (Light)',
    style: {
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
    style: {
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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State
  const [selectedStyleId, setSelectedStyleId] = useState<string>('osm');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

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
  const activeVehicleDwell = activeVehicle && dwells ? dwells.find((d) => d.vehicle_id === activeVehicle.id && !d.departure_time) : null;

  return (
    <div className="relative h-[calc(100vh-80px)] w-full overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm flex">

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
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Toggle Stops */}
            <button
              onClick={() => setShowStops(!showStops)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-md transition-colors cursor-pointer backdrop-blur-md ${
                showStops
                  ? 'bg-[#250C77] text-white border-[#250C77]'
                  : 'bg-bg-surface/95 text-text-secondary border-border-default hover:text-text-primary'
              }`}
            >
              <MapPin size={14} className={showStops ? 'text-[#ED642B]' : ''} />
              <span>Stops</span>
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
              <span>Routes</span>
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

        {/* Selected vehicle quick card overlay (bottom right) */}
        {activeVehicle && activeVehicleGps && (
          <div className="absolute bottom-6 left-6 max-w-sm rounded-2xl bg-bg-surface/95 backdrop-blur-md border border-border-strong p-4 shadow-2xl space-y-2 z-20 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-2">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#250C77]" />
                <span className="font-numeric font-extrabold text-sm text-text-primary">
                  {activeVehicle.registration_number}
                </span>
              </div>
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="p-1 text-text-tertiary hover:text-text-primary cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>Type: <strong className="text-text-primary">{activeVehicle.vehicle_type}</strong></div>
              <div>Speed: <strong className="text-text-primary font-numeric">{Math.round(activeVehicleGps.speed)} km/h</strong></div>
            </div>

            {activeVehicleDwell && (
              <div className="p-2 rounded-xl bg-[#ED642B]/10 border border-[#ED642B]/20 text-[11px] text-[#ED642B] font-bold">
                Excess dwell at {activeVehicleDwell.location_name}: +{formatMinutes(activeVehicleDwell.excess_minutes)}
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <Link
                to={`/vehicles/${activeVehicle.id}`}
                className="text-xs font-bold text-[#ED642B] hover:underline flex items-center gap-1"
              >
                <span>Full Telematics Profile</span> <ArrowRight size={12} />
              </Link>
            </div>
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
