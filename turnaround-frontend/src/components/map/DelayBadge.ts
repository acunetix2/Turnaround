/**
 * DelayBadge — generates the popup HTML for delayed vehicles on the map.
 * Shown as a click-through popover when a delayed marker is clicked.
 */

import { formatMinutes, formatCurrency } from '../../lib/format';

interface DelayBadgeOptions {
  registrationNumber: string;
  locationName: string;
  elapsedMinutes: number;
  expectedMinutes: number;
  vehicleId: string;
}

export function delayBadgePopupHtml({
  registrationNumber,
  locationName,
  elapsedMinutes,
  expectedMinutes,
  vehicleId,
}: DelayBadgeOptions): string {
  const excessMinutes = Math.max(0, elapsedMinutes - expectedMinutes);
  const estimatedCost = Math.round((excessMinutes / 60) * 2500); // KES 2,500/hr approx
  const isOverdue = elapsedMinutes > expectedMinutes;

  const statusColor = isOverdue ? '#F0464C' : '#F5A524';
  const statusLabel = isOverdue ? '⚠ DELAYED' : '● APPROACHING LIMIT';

  return `
    <div style="
      background:#1A1C21;border:1px solid rgba(240,70,76,0.3);
      border-radius:12px;padding:14px 16px;
      font-family:Inter,sans-serif;min-width:220px;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="
          background:rgba(240,70,76,0.14);color:${statusColor};
          font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;
          border:1px solid ${statusColor}30;letter-spacing:0.05em;
        ">${statusLabel}</span>
      </div>

      <div style="font-size:14px;font-weight:600;color:#F4F5F7;margin-bottom:2px;
                  font-family:IBM Plex Mono,monospace">
        ${registrationNumber}
      </div>
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:10px">${locationName}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:2px">ELAPSED</div>
          <div style="font-size:13px;font-weight:600;color:#F4F5F7;
                      font-family:IBM Plex Mono,monospace">${formatMinutes(elapsedMinutes)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:2px">EXPECTED</div>
          <div style="font-size:13px;font-weight:600;color:#9CA3AF;
                      font-family:IBM Plex Mono,monospace">${formatMinutes(expectedMinutes)}</div>
        </div>
        ${excessMinutes > 0 ? `
        <div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:2px">EXCESS</div>
          <div style="font-size:13px;font-weight:600;color:${statusColor};
                      font-family:IBM Plex Mono,monospace">${formatMinutes(excessMinutes)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#6B7280;margin-bottom:2px">EST. COST</div>
          <div style="font-size:13px;font-weight:600;color:#FFB020;
                      font-family:IBM Plex Mono,monospace">${formatCurrency(estimatedCost)}</div>
        </div>
        ` : ''}
      </div>

      <a href="/#/vehicles/${vehicleId}"
         style="
           display:block;text-align:center;padding:7px;
           background:#4F7CFF14;color:#6E92FF;border:1px solid #4F7CFF30;
           border-radius:8px;font-size:12px;font-weight:500;text-decoration:none;
           transition:background 0.15s;
         "
         onmouseover="this.style.background='#4F7CFF25'"
         onmouseout="this.style.background='#4F7CFF14'"
      >
        View Vehicle Profile →
      </a>
    </div>
  `;
}
