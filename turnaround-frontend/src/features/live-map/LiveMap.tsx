import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Truck, ShieldAlert } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVehicles } from '../../hooks/useVehicles';
import { useLocations } from '../../hooks/useLocations';
import { useLiveGPSEvents } from '../../hooks/useLiveMap';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { queryKeys } from '../../lib/query-keys';
import { vehicleMarkerHtml, injectMarkerAnimations } from '../../components/map/VehicleMarker';
import { geofenceCircleOptions, geofenceTooltipHtml } from '../../components/map/GeofenceOverlay';
import { delayBadgePopupHtml } from '../../components/map/DelayBadge';

export const LiveMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  // Use centralised hooks
  const { data: vehicles, isLoading: loadingVehicles } = useVehicles();
  const { data: locations, isLoading: loadingLocations } = useLocations();
  const { data: gpsPositions, isLoading: loadingGps } = useLiveGPSEvents(15_000);

  const { data: dwells } = useQuery({
    queryKey: queryKeys.vehicles.dwells('all'),
    queryFn: () => apiClient.getDwellEvents()
  });

  // Inject ping animation CSS once
  useEffect(() => { injectMarkerAnimations(); }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Nairobi center coordinates as default center
      const centerLat = -1.2921;
      const centerLng = 36.8219;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 7,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter tile layer for desaturated dark operations look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // Add zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
    } catch (err: any) {
      console.error('Leaflet initialization failed:', err);
      setMapError('Failed to initialize map system.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Geofence Circles and Vehicle Markers on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old items
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    circlesRef.current.forEach((c) => c.remove());
    circlesRef.current = [];

    // 1. Draw Geofences — styles from GeofenceOverlay per location type
    if (locations) {
      locations.forEach((loc) => {
        const circle = L.circle([loc.latitude, loc.longitude], {
          radius: loc.geofence_radius,
          ...geofenceCircleOptions(loc.location_type)
        }).addTo(map);

        circle.bindTooltip(geofenceTooltipHtml(loc), {
          sticky: true,
          className: 'leaflet-tooltip-dark',
          direction: 'top'
        });

        circlesRef.current.push(circle);
      });
    }

    // 2. Draw Vehicles — markers + popups from VehicleMarker / DelayBadge helpers
    if (vehicles && gpsPositions) {
      vehicles.forEach((vh) => {
        const gps = gpsPositions[vh.id];
        if (!gps) return;

        const activeDwell = dwells?.find((d) => d.vehicle_id === vh.id && !d.departure_time);

        const divIcon = L.divIcon({
          html: vehicleMarkerHtml({
            status: vh.status,
            registrationNumber: vh.registration_number,
          }),
          className: '',
          iconSize: [48, 52],
          iconAnchor: [24, 52],
        });

        const marker = L.marker([gps.latitude, gps.longitude], { icon: divIcon }).addTo(map);

        // Use DelayBadge for delayed vehicles, simple popup for others
        let popupHtml: string;
        if (vh.status === 'delayed' && activeDwell) {
          popupHtml = delayBadgePopupHtml({
            registrationNumber: vh.registration_number,
            locationName: vh.current_location_name || 'Unknown Location',
            elapsedMinutes: activeDwell.dwell_minutes,
            expectedMinutes: activeDwell.expected_minutes,
            vehicleId: vh.id,
          });
        } else {
          popupHtml = `
            <div style="background:#1A1C21;border:1px solid rgba(255,255,255,0.14);border-radius:12px;padding:14px 16px;font-family:Inter,sans-serif;min-width:200px">
              <div style="font-size:14px;font-weight:600;color:#F4F5F7;font-family:IBM Plex Mono,monospace;margin-bottom:4px">${vh.registration_number}</div>
              <div style="font-size:12px;color:#9CA3AF;margin-bottom:8px">${vh.vehicle_type}</div>
              <div style="font-size:11px;color:#6B7280">Location: <span style="color:#F4F5F7">${vh.current_location_name || '—'}</span></div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px">Speed: <span style="color:#F4F5F7;font-family:IBM Plex Mono,monospace">${gps.speed} km/h</span></div>
              <a href="/#/vehicles/${vh.id}" style="display:block;margin-top:10px;text-align:center;padding:6px;background:#4F7CFF14;color:#6E92FF;border:1px solid #4F7CFF30;border-radius:8px;font-size:12px;text-decoration:none">View Profile →</a>
            </div>
          `;
        }

        marker.bindPopup(popupHtml, { className: 'turnaround-popup', maxWidth: 280 });
        markersRef.current.push(marker);
      });
    }

    // Auto-bounds to fit all vehicles
    if (gpsPositions && Object.keys(gpsPositions).length > 0 && map) {
      const coords = Object.values(gpsPositions).map((p) => [p.latitude, p.longitude] as L.LatLngTuple);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vehicles, locations, gpsPositions, dwells]);

  // Handle redirects dispatched from markers
  useEffect(() => {
    const handleMapRedirect = (e: Event) => {
      const path = (e as CustomEvent).detail;
      // We'll set hashes to navigate locally if standard client route is bound
      window.location.hash = `#${path}`;
    };
    window.addEventListener('map-redirect', handleMapRedirect);
    return () => window.removeEventListener('map-redirect', handleMapRedirect);
  }, []);

  const totalDelays = vehicles?.filter((v) => v.status === 'delayed').length || 0;

  return (
    <div className="relative flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden border border-border-default bg-bg-surface">
      {/* Live Map Panel Title HUD overlay */}
      <div className="absolute top-4 left-4 z-[1000] max-w-sm pointer-events-auto">
        <div className="panel-elevated bg-bg-surface-raised p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-status-good animate-pulse"></div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Live Fleet Telemetry
            </h2>
          </div>
          <p className="text-lg font-bold text-text-primary mt-1">
            {vehicles?.length || 0} Assets Online
          </p>
          
          {totalDelays > 0 ? (
            <div className="mt-2.5 flex items-center gap-2 rounded bg-status-danger-bg border border-status-danger/20 px-2.5 py-1.5 text-xs text-status-danger">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                <b>{totalDelays} Delayed</b> trucks require operational review.
              </span>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-2 rounded bg-status-good-bg border border-status-good/20 px-2.5 py-1.5 text-xs text-status-good">
              <span>All active shipments clearing on time.</span>
            </div>
          )}
        </div>
      </div>

      {/* Mapbox Token warning if Mapbox was expected, showing we fall back gracefully */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto opacity-80 hover:opacity-100 transition-opacity">
        <div className="bg-bg-surface-raised border border-border-default rounded px-2.5 py-1 text-[10px] text-text-tertiary flex items-center gap-1.5 shadow-sm">
          <span>Map Provider: OpenStreetMap (CartoDB Dark Tile Layer)</span>
        </div>
      </div>

      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="w-full h-full z-10 bg-bg-canvas relative" />

      {/* Map styling helper in style block to override default Leaflet popup styles (Section 5) */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip {
          background: #1A1C21 !important; /* matches raised surface */
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
        }
        .leaflet-container {
          background-color: #0A0B0D !important;
        }
      `}</style>
    </div>
  );
};
