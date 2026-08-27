import React from 'react';

export const AnimatedFleetBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Headlamp cone */}
          <linearGradient id="headlampBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>

          {/* Road 1: Northern Corridor A109 (Mombasa -> Nairobi -> Malaba) */}
          <path
            id="corridorA109"
            d="M -60,750 C 260,710 440,540 720,460 C 1000,380 1180,240 1520,180"
          />

          {/* Road 1 Inbound (Return Lane) */}
          <path
            id="corridorA109Return"
            d="M 1520,200 C 1180,260 1000,400 720,480 C 440,560 260,730 -60,770"
          />

          {/* Road 2: Great North Bypass Route (Namanga -> Nairobi -> Eldoret) */}
          <path
            id="corridorNorth"
            d="M 160,940 C 400,680 660,600 860,360 C 1060,120 1320,60 1500,-60"
          />

          {/* Road 3: Port Access Link Road */}
          <path
            id="corridorPort"
            d="M -40,320 C 320,280 580,700 920,640 C 1220,580 1380,760 1520,810"
          />
        </defs>

        {/* ── 1. REAL ASPHALT ROADS ── */}

        {/* Road 1: A109 Dual-Carriageway Highway */}
        {/* Road Bed / Asphalt Base */}
        <use href="#corridorA109" stroke="#0F172A" strokeWidth="36" strokeLinecap="round" />
        <use href="#corridorA109" stroke="#1E293B" strokeWidth="30" strokeLinecap="round" />
        {/* Road Shoulder Edges */}
        <use href="#corridorA109" stroke="#334155" strokeWidth="26" strokeLinecap="round" />
        <use href="#corridorA109" stroke="#0F172A" strokeWidth="22" strokeLinecap="round" />
        {/* Yellow Center Divider Line */}
        <use href="#corridorA109" stroke="#EAB308" strokeWidth="1.5" strokeOpacity="0.8" />
        {/* White Dashed Lane Markings */}
        <use href="#corridorA109" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="12 16" strokeOpacity="0.5" />

        {/* Road 2: Great North Highway */}
        <use href="#corridorNorth" stroke="#0F172A" strokeWidth="28" strokeLinecap="round" />
        <use href="#corridorNorth" stroke="#1E293B" strokeWidth="22" strokeLinecap="round" />
        <use href="#corridorNorth" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="10 14" strokeOpacity="0.45" />

        {/* Road 3: Port Access Highway */}
        <use href="#corridorPort" stroke="#0F172A" strokeWidth="26" strokeLinecap="round" />
        <use href="#corridorPort" stroke="#1E293B" strokeWidth="20" strokeLinecap="round" />
        <use href="#corridorPort" stroke="#38BDF8" strokeWidth="1" strokeDasharray="8 12" strokeOpacity="0.4" />

        {/* ── 2. TERMINAL GEOFENCE RADAR HUBS ALONG THE ROADS ── */}

        {/* Mombasa Port Gate 14 (Located right at start of A109 highway) */}
        <g transform="translate(260, 710)">
          <circle r="36" fill="#3B82F6" fillOpacity="0.08" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 4" />
          <circle r="18" fill="#3B82F6" fillOpacity="0.2" />
          <circle r="4.5" fill="#60A5FA" />
          <g transform="translate(24, -10)">
            <rect x="0" y="-8" width="130" height="20" rx="4" fill="#0A0E17" stroke="#3B82F6" strokeWidth="0.8" />
            <text x="8" y="6" fill="#93C5FD" fontSize="8" fontFamily="monospace" fontWeight="bold">
              Mombasa Port · Gate 14
            </text>
          </g>
        </g>

        {/* Nairobi ICD Inland Depot (Located along central A109 interchange) */}
        <g transform="translate(720, 460)">
          <circle r="40" fill="#10B981" fillOpacity="0.08" stroke="#10B981" strokeWidth="1" strokeDasharray="4 4" />
          <circle r="20" fill="#10B981" fillOpacity="0.2" />
          <circle r="4.5" fill="#34D399" />
          <g transform="translate(-138, -12)">
            <rect x="0" y="-8" width="130" height="20" rx="4" fill="#0A0E17" stroke="#10B981" strokeWidth="0.8" />
            <text x="8" y="6" fill="#86EFAC" fontSize="8" fontFamily="monospace" fontWeight="bold">
              Nairobi ICD · Inland Hub
            </text>
          </g>
        </g>

        {/* Malaba OSBP Border Crossing (Located at western highway terminus) */}
        <g transform="translate(1200, 235)">
          <circle r="38" fill="#F59E0B" fillOpacity="0.08" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" />
          <circle r="18" fill="#F59E0B" fillOpacity="0.2" />
          <circle r="4.5" fill="#FBBF24" />
          <g transform="translate(-144, -20)">
            <rect x="0" y="-8" width="136" height="20" rx="4" fill="#0A0E17" stroke="#F59E0B" strokeWidth="0.8" />
            <text x="8" y="6" fill="#FDE68A" fontSize="8" fontFamily="monospace" fontWeight="bold">
              Malaba OSBP · Customs
            </text>
          </g>
        </g>

        {/* ── 3. TRUCKS ANIMATED DIRECTLY ON TOP OF ROADS (W3C animateMotion) ── */}

        {/* Truck 1: Scania 40ft Haulier on A109 Outbound */}
        <g>
          <animateMotion dur="20s" repeatCount="indefinite" rotate="auto">
            <mpath href="#corridorA109" />
          </animateMotion>
          
          {/* Headlamp beam */}
          <polygon points="16,-4 50,-16 50,16 16,4" fill="url(#headlampBeam)" />
          
          {/* Tail lights */}
          <circle cx="-24" cy="-5" r="2" fill="#EF4444" />
          <circle cx="-24" cy="5" r="2" fill="#EF4444" />

          {/* 40ft Container Chassis */}
          <rect x="-24" y="-7" width="28" height="14" rx="2" fill="#1E293B" stroke="#3B82F6" strokeWidth="1.2" />
          <rect x="-22" y="-6" width="24" height="12" rx="1" fill="#2563EB" />
          
          {/* Tractor Cab */}
          <rect x="5" y="-5.5" width="10" height="11" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="0.8" />
          <rect x="9" y="-3.5" width="4" height="7" rx="1" fill="#0F172A" />

          {/* Wheels */}
          <rect x="-20" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-20" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="6.5" width="4" height="2" fill="#050811" />

          {/* Floating Tag */}
          <g transform="translate(0, -18)">
            <rect x="-26" y="-7" width="52" height="14" rx="3" fill="#0A0E17" stroke="#3B82F6" strokeWidth="0.8" />
            <text x="0" y="3" fill="#93C5FD" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              KDB 914Y · 68 km/h
            </text>
          </g>
        </g>

        {/* Truck 2: Following Haulier (Delayed start) */}
        <g>
          <animateMotion dur="24s" begin="9s" repeatCount="indefinite" rotate="auto">
            <mpath href="#corridorA109" />
          </animateMotion>
          
          <polygon points="16,-4 50,-16 50,16 16,4" fill="url(#headlampBeam)" />
          <circle cx="-24" cy="-5" r="2" fill="#EF4444" />
          <circle cx="-24" cy="5" r="2" fill="#EF4444" />

          <rect x="-24" y="-7" width="28" height="14" rx="2" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.2" />
          <rect x="-22" y="-6" width="24" height="12" rx="1" fill="#D97706" />
          
          <rect x="5" y="-5.5" width="10" height="11" rx="2" fill="#F8FAFC" stroke="#475569" strokeWidth="0.8" />
          <rect x="9" y="-3.5" width="4" height="7" rx="1" fill="#0F172A" />

          <rect x="-20" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-20" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="6.5" width="4" height="2" fill="#050811" />

          <g transform="translate(0, -18)">
            <rect x="-26" y="-7" width="52" height="14" rx="3" fill="#0A0E17" stroke="#F59E0B" strokeWidth="0.8" />
            <text x="0" y="3" fill="#FDE68A" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              KCA 210P · 62 km/h
            </text>
          </g>
        </g>

        {/* Truck 3: Inbound Haulier traveling towards Mombasa on Return Lane */}
        <g>
          <animateMotion dur="22s" begin="3s" repeatCount="indefinite" rotate="auto">
            <mpath href="#corridorA109Return" />
          </animateMotion>
          
          <polygon points="16,-4 50,-16 50,16 16,4" fill="url(#headlampBeam)" />
          <circle cx="-24" cy="-5" r="2" fill="#EF4444" />
          <circle cx="-24" cy="5" r="2" fill="#EF4444" />

          <rect x="-24" y="-7" width="28" height="14" rx="2" fill="#1E293B" stroke="#10B981" strokeWidth="1.2" />
          <rect x="-22" y="-6" width="24" height="12" rx="1" fill="#059669" />
          
          <rect x="5" y="-5.5" width="10" height="11" rx="2" fill="#F1F5F9" stroke="#475569" strokeWidth="0.8" />
          <rect x="9" y="-3.5" width="4" height="7" rx="1" fill="#0F172A" />

          <rect x="-20" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-20" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="6.5" width="4" height="2" fill="#050811" />

          <g transform="translate(0, -18)">
            <rect x="-26" y="-7" width="52" height="14" rx="3" fill="#0A0E17" stroke="#10B981" strokeWidth="0.8" />
            <text x="0" y="3" fill="#86EFAC" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              KBZ 482T · 74 km/h
            </text>
          </g>
        </g>

        {/* Truck 4: Great North Highway Corridor Haulier */}
        <g>
          <animateMotion dur="26s" begin="2s" repeatCount="indefinite" rotate="auto">
            <mpath href="#corridorNorth" />
          </animateMotion>
          
          <polygon points="16,-4 50,-16 50,16 16,4" fill="url(#headlampBeam)" />
          <circle cx="-24" cy="-5" r="2" fill="#EF4444" />
          <circle cx="-24" cy="5" r="2" fill="#EF4444" />

          <rect x="-24" y="-7" width="28" height="14" rx="2" fill="#1E293B" stroke="#8B5CF6" strokeWidth="1.2" />
          <rect x="-22" y="-6" width="24" height="12" rx="1" fill="#7C3AED" />
          
          <rect x="5" y="-5.5" width="10" height="11" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="0.8" />
          <rect x="9" y="-3.5" width="4" height="7" rx="1" fill="#0F172A" />

          <rect x="-20" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-20" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="-6" y="6.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="-8.5" width="4" height="2" fill="#050811" />
          <rect x="8" y="6.5" width="4" height="2" fill="#050811" />

          <g transform="translate(0, -18)">
            <rect x="-26" y="-7" width="52" height="14" rx="3" fill="#0A0E17" stroke="#8B5CF6" strokeWidth="0.8" />
            <text x="0" y="3" fill="#C4B5FD" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              KDD 531M · 55 km/h
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
