/**
 * GeofenceOverlay — configuration helpers for Leaflet circle overlays.
 * Each location gets a translucent circle at its (lat, lng) with
 * radius = geofence_radius (metres from the API).
 */

import type { Location } from '../../lib/api/types';

export type LocationType = Location['location_type'];

/** Returns Leaflet circle options for a given location type */
export function geofenceCircleOptions(type: LocationType): L.CircleOptions {
  const styles: Record<string, L.CircleOptions> = {
    warehouse: { color: '#4F7CFF', fillColor: '#4F7CFF', fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' },
    distribution_center: { color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' },
    border_crossing: { color: '#F5A524', fillColor: '#F5A524', fillOpacity: 0.10, weight: 1.5, dashArray: '6 3' },
    port: { color: '#9C6ADE', fillColor: '#9C6ADE', fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' },
    customer_site: { color: '#6B7280', fillColor: '#6B7280', fillOpacity: 0.06, weight: 1 },
    depot: { color: '#FFB020', fillColor: '#FFB020', fillOpacity: 0.08, weight: 1.5, dashArray: '4 4' },
  };
  return styles[type] ?? { color: '#6B7280', fillColor: '#6B7280', fillOpacity: 0.06, weight: 1 };
}

/** Tooltip HTML for a location geofence on hover */
export function geofenceTooltipHtml(location: Location): string {
  const typeLabel = location.location_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `
    <div style="
      background:#1A1C21;border:1px solid rgba(255,255,255,0.14);
      border-radius:10px;padding:10px 14px;font-family:Inter,sans-serif;
    ">
      <div style="font-size:12px;font-weight:600;color:#F4F5F7;margin-bottom:2px">${location.name}</div>
      <div style="font-size:11px;color:#6B7280">${typeLabel}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px">
        Expected dwell: <span style="color:#F4F5F7;font-family:IBM Plex Mono,monospace">${location.expected_dwell_minutes} min</span>
      </div>
    </div>
  `;
}
