/**
 * VehicleMarker — generates a Leaflet DivIcon HTML string for a vehicle.
 * Used inside LiveMap.tsx with L.divIcon({ html: vehicleMarkerHtml(...) })
 *
 * Design spec:
 *  - moving    → brand blue (#4F7CFF)
 *  - stationary → neutral (#6B7280)
 *  - delayed   → danger red (#F0464C) + pulsing ring animation
 */

export type VehicleStatus = 'moving' | 'stationary' | 'delayed';

interface VehicleMarkerOptions {
  status: VehicleStatus;
  registrationNumber: string;
  /** Show a pulsing ring (auto-enabled for delayed) */
  pulse?: boolean;
}

const STATUS_COLOR: Record<VehicleStatus, string> = {
  moving: '#4F7CFF',
  stationary: '#6B7280',
  delayed: '#F0464C',
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  moving: 'Moving',
  stationary: 'Stationary',
  delayed: 'Delayed',
};

/** Returns an HTML string for L.divIcon */
export function vehicleMarkerHtml({
  status,
  registrationNumber,
  pulse,
}: VehicleMarkerOptions): string {
  const color = STATUS_COLOR[status];
  const shouldPulse = pulse ?? status === 'delayed';

  const pulseRing = shouldPulse
    ? `<span style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2px solid ${color};opacity:0.5;
        animation:turnaround-ping 1.4s ease-in-out infinite;
      "></span>`
    : '';

  return `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none">
      <div style="
        position:relative;
        width:32px;height:32px;border-radius:50%;
        background:${color}22;border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 10px ${color}55;
      ">
        ${pulseRing}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 3h15l3 6H1V3zm0 7h18l1.5 3H1v-3zm0 4h20v7H6l-5-2V14zm4 3a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z"/>
        </svg>
      </div>
      <div style="
        margin-top:4px;padding:2px 5px;
        background:#121317;border:1px solid ${color}40;border-radius:4px;
        font-size:10px;font-family:IBM Plex Mono,monospace;
        color:${color};white-space:nowrap;line-height:1.4;
      ">${registrationNumber}</div>
    </div>
  `;
}

/** CSS keyframes injected once into the document head for the ping animation */
export function injectMarkerAnimations(): void {
  const id = 'turnaround-marker-anim';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes turnaround-ping {
      0%   { transform: scale(1);   opacity: 0.5; }
      70%  { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export { STATUS_COLOR, STATUS_LABEL };
