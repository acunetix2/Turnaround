import React, { useState } from 'react';
import {
  MapPin, CheckCircle2
} from 'lucide-react';

interface Flashcard {
  id: string;
  tag: string;
  tagColor: string;
  image: string;
  location: string;
  vehicle: string;
  problem: {
    title: string;
    dwellTime: string;
    excessCost: string;
    impact: string;
  };
  solution: {
    action: string;
    timeRecovered: string;
    costSaved: string;
    outcome: string;
  };
}

const CARDS: Flashcard[] = [
  {
    id: 'card-1',
    tag: 'Port Demurrage Risk',
    tagColor: '#EF4444',
    image: '/port-terminal.jpg',
    location: 'Kilindini Port · Gate 14',
    vehicle: 'Heavy Haulier · Scania G460',
    problem: {
      title: 'Discharge crane delay hold',
      dwellTime: 'Excess dwell vs baseline',
      excessCost: 'Detention penalty accruing',
      impact: 'Container gate exit at risk of penalty',
    },
    solution: {
      action: 'Dispatcher reroute to alternative bay',
      timeRecovered: 'Dwell cut to SLA baseline',
      costSaved: 'Penalty avoided',
      outcome: 'Container gate exit logged with 0 penalty',
    },
  },
  {
    id: 'card-2',
    tag: 'Border Clearance Hold',
    tagColor: '#F59E0B',
    image: '/border-clearance.jpg',
    location: 'Malaba OSBP · Weighbridge',
    vehicle: 'Transit Lorry · Actros 3340',
    problem: {
      title: 'Axle inspection queue backlog',
      dwellTime: 'Excess dwell vs baseline',
      excessCost: 'Driver duty hours exceeded',
      impact: 'Transit hours exceeded on border crossing',
    },
    solution: {
      action: 'Digital green-lane pre-clearance',
      timeRecovered: 'Dwell cut to SLA baseline',
      costSaved: 'Clearance cost avoided',
      outcome: 'Cleared weighbridge on priority fast-track lane',
    },
  },
  {
    id: 'card-3',
    tag: 'Inland Depot Bottleneck',
    tagColor: '#3B82F6',
    image: '/hero-fleet.jpg',
    location: 'Nairobi ICD · Embakasi',
    vehicle: 'Distribution Lorry · Volvo FH16',
    problem: {
      title: 'Forklift offload bay backlog',
      dwellTime: 'Excess dwell vs baseline',
      excessCost: 'Idle driver salary burn',
      impact: 'Missed scheduled retail delivery window',
    },
    solution: {
      action: 'Pre-allocated bay slot schedule',
      timeRecovered: 'Dwell cut to SLA baseline',
      costSaved: 'Idle cost recovered',
      outcome: 'Same-day return trip cleared on Athi River corridor',
    },
  },
  {
    id: 'card-4',
    tag: 'Warehouse Overtime Burn',
    tagColor: '#8B5CF6',
    image: '/warehouse-docks.jpg',
    location: 'Athi River Logistics Park',
    vehicle: 'Logistics Lorry · Mercedes Arocs',
    problem: {
      title: 'Weekend receiving congestion',
      dwellTime: 'Excess dwell vs baseline',
      excessCost: 'Overtime idle cost accruing',
      impact: 'Truck out of service for next dispatch',
    },
    solution: {
      action: 'Dynamic geofence SLA alert trigger',
      timeRecovered: 'Dwell cut to SLA baseline',
      costSaved: 'Overtime cost avoided',
      outcome: 'Priority dock receiving completed on schedule',
    },
  },
];

export const OperationalFlashcards: React.FC = () => {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="relative py-28 overflow-hidden z-10 border-t border-white/[0.08]">
      {/* Background with continuous cinematic movement */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/highway-trucks.jpg"
          alt="Freight operations"
          className="h-full w-full object-cover brightness-[0.70] contrast-[1.10] animate-cinematic-dolly"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/95 via-[#07080A]/85 to-[#07080A]/95" />
        <div className="absolute inset-0 cinematic-vignette opacity-80" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        
        {/* Section Header (Clean, direct, without tutorial guidelines) */}
        <div className="max-w-2xl space-y-3 mb-16">
          <span className="text-xs font-mono font-bold text-[#ED642B] tracking-wider uppercase">
            Operational Intelligence
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Corridor bottlenecks and verified cost recovery.
          </h2>
          <p className="text-sm sm:text-base text-white/75 leading-relaxed">
            Real-time geofence events translated directly into operational decisions and recovered driving hours.
          </p>
        </div>

        {/* 4 Clean Half-Image 3D Flip Flashcards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CARDS.map((card) => {
            const isFlipped = !!flipped[card.id];

            return (
              <div
                key={card.id}
                onClick={() => toggleFlip(card.id)}
                className="group relative h-[420px] cursor-pointer [perspective:1000px]"
              >
                {/* 3D Flip Container */}
                <div
                  className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
                    isFlipped ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* ── FRONT OF CARD: BOTTLENECK INCIDENT ── */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl border border-white/15 bg-[#140938]/90 overflow-hidden flex flex-col justify-between [backface-visibility:hidden] shadow-2xl hover:border-[#ED642B]/50 transition-colors">
                    
                    {/* Top 45% Real Photograph Container */}
                    <div className="relative h-[45%] w-full overflow-hidden shrink-0">
                      <img
                        src={card.image}
                        alt={card.location}
                        className="w-full h-full object-cover brightness-[0.88] contrast-[1.08] group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12141C] via-transparent to-black/40" />

                      {/* Pill Badge on Top of Image */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <span
                          className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border backdrop-blur-md"
                          style={{
                            color: card.tagColor,
                            borderColor: `${card.tagColor}50`,
                            backgroundColor: 'rgba(10, 14, 23, 0.85)',
                          }}
                        >
                          {card.tag}
                        </span>
                        <span className="text-[10px] font-mono text-white bg-black/75 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 font-bold">
                          {card.vehicle.split('·')[0]}
                        </span>
                      </div>

                      {/* Location text on image bottom */}
                      <div className="absolute bottom-2 left-3 right-3 flex items-center gap-1 text-xs font-semibold text-white/90">
                        <MapPin size={12} className="text-[#ED642B] shrink-0" />
                        <span className="truncate">{card.location}</span>
                      </div>
                    </div>

                    {/* Bottom 55% Problem Data Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {card.problem.title}
                        </h4>

                        {/* Problem Metrics Grid */}
                        <div className="space-y-1.5 bg-black/50 rounded-xl p-2.5 border border-white/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Dwell time</span>
                            <span className="font-mono font-semibold text-amber-300">
                              {card.problem.dwellTime}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Loss accrual</span>
                            <span className="font-mono font-bold text-red-400">
                              {card.problem.excessCost}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-white/60 leading-relaxed pt-1">
                          {card.problem.impact}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* ── BACK OF CARD: RESOLUTION & SAVINGS (Rotated 180deg) ── */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl border border-emerald-500/30 bg-[#0B1713] overflow-hidden flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-2xl">
                    
                    {/* Top 45% Image Container with Emerald Green Tone */}
                    <div className="relative h-[45%] w-full overflow-hidden shrink-0">
                      <img
                        src={card.image}
                        alt={card.location}
                        className="w-full h-full object-cover brightness-[0.75] contrast-[1.10]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1713] via-emerald-950/30 to-black/50" />

                      {/* Success Pill on Top */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-500/50 bg-[#0A1A12]/90 backdrop-blur-md text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} /> OPTIMIZED
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-black/75 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                          SLA SAVED
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-3 right-3 text-xs font-semibold text-emerald-300 truncate">
                        {card.vehicle}
                      </div>
                    </div>

                    {/* Bottom 55% Resolution Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Turnaround Action</span>
                        <h4 className="text-sm font-bold text-white mt-0.5 leading-snug">
                          {card.solution.action}
                        </h4>

                        {/* Savings Readout */}
                        <div className="space-y-1.5 bg-black/60 rounded-xl p-2.5 border border-emerald-500/20">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">Time recovered</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {card.solution.timeRecovered}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">Savings</span>
                            <span className="font-mono font-bold text-emerald-300">
                              {card.solution.costSaved}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-white/75 leading-relaxed pt-1">
                          {card.solution.outcome}
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
