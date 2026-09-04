import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, TrendingDown, Zap, MapPin, Shield,
  Clock, DollarSign, ChevronRight, ChevronDown, CheckCircle2,
  Radio, Cpu, Layers, Server, Moon, Sun
} from 'lucide-react';
import { AnimatedFleetBackground } from '../components/landing/AnimatedFleetBackground';
import { OperationalFlashcards } from '../components/landing/OperationalFlashcards';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../lib/ThemeContext';



const FEATURES = [
  {
    icon: MapPin,
    color: '#ED642B',
    bg: 'rgba(237,100,43,0.16)',
    title: 'Live Fleet Tracking & Telemetry',
    desc: 'Real-time vehicle GPS positions with automatic geofence detection. Instant alerts the moment a truck exceeds expected dwell.',
  },
  {
    icon: TrendingDown,
    color: '#F5A524',
    bg: 'rgba(245,165,36,0.16)',
    title: 'Dwell & Turnaround Analytics',
    desc: 'Measure exact time spent at every customer site, depot, border post, and port. Quantify idle waste against configured baselines.',
  },
  {
    icon: DollarSign,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.16)',
    title: 'Financial Loss Quantification',
    desc: 'Translate delay hours directly into KES cost impact using vehicle operating rates, demurrage risk, and driver idle expenses.',
  },
  {
    icon: Zap,
    color: '#9C6ADE',
    bg: 'rgba(156,106,222,0.16)',
    title: 'Bottleneck Root-Cause Engine',
    desc: 'Identifies recurring congestion patterns by day, time-of-day, and loading bay to prevent predictable supply chain hold-ups.',
  },
  {
    icon: Shield,
    color: '#F0464C',
    bg: 'rgba(240,70,76,0.16)',
    title: 'Role-Based Team Views',
    desc: 'Tailored consoles for Fleet Managers, Dispatchers, and Financial Analysts so everyone works from the same live source of truth.',
  },
  {
    icon: Clock,
    color: '#FFB020',
    bg: 'rgba(255,176,32,0.16)',
    title: 'Corridor & Route Benchmarks',
    desc: 'Compare transit and terminal times across Mombasa, Nairobi, Malaba, and regional distribution routes with historical series.',
  },
];



export const Landing: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const menuTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = (menuKey: string) => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setActiveMenu(menuKey);
  };

  const handleMouseLeave = () => {
    menuTimeoutRef.current = window.setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`relative min-h-screen overflow-x-hidden selection:bg-[#ED642B]/30 ${theme === 'dark' ? 'bg-[#0A051B] text-[#F4F5F7]' : 'bg-[#F5F3FB] text-[#250C77]'}`}>

      {/* ── FLEXPORT-STYLE SYSTEM MEGA-NAVBAR ── */}
      <header
        className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.08] bg-[#07051A]/80 backdrop-blur-2xl transition-all"
        onMouseLeave={handleMouseLeave}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          
          {/* Clean Solid Vector Brand Logo */}
          <Link to="/" className="group shrink-0">
            <BrandLogo size={36} showText={true} />
          </Link>

          {/* System-Specific Navigation Links with Mega-Menu Trigger */}
          <nav className="hidden lg:flex items-center gap-1">
            
            {/* Nav 1: Platform & Fleet OS */}
            <div className="relative" onMouseEnter={() => handleMouseEnter('platform')}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'platform' ? null : 'platform')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  activeMenu === 'platform' ? 'text-[#ED642B] bg-white/[0.06]' : 'text-[#D1D5DB] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Platform & Fleet OS
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === 'platform' ? 'rotate-180 text-[#ED642B]' : 'text-[#6B7280]'}`} />
              </button>
            </div>

            {/* Nav 2: Freight Corridors */}
            <div className="relative" onMouseEnter={() => handleMouseEnter('corridors')}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'corridors' ? null : 'corridors')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  activeMenu === 'corridors' ? 'text-[#ED642B] bg-white/[0.06]' : 'text-[#D1D5DB] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Freight Corridors
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === 'corridors' ? 'rotate-180 text-[#ED642B]' : 'text-[#6B7280]'}`} />
              </button>
            </div>

            {/* Nav 3: Cost & Loss Engine */}
            <div className="relative" onMouseEnter={() => handleMouseEnter('cost-engine')}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'cost-engine' ? null : 'cost-engine')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  activeMenu === 'cost-engine' ? 'text-[#ED642B] bg-white/[0.06]' : 'text-[#D1D5DB] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Cost & Loss Engine
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === 'cost-engine' ? 'rotate-180 text-[#ED642B]' : 'text-[#6B7280]'}`} />
              </button>
            </div>

            {/* Nav 4: Integrations */}
            <div className="relative" onMouseEnter={() => handleMouseEnter('integrations')}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'integrations' ? null : 'integrations')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                  activeMenu === 'integrations' ? 'text-[#ED642B] bg-white/[0.06]' : 'text-[#D1D5DB] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Telematics & Hardware
                <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === 'integrations' ? 'rotate-180 text-[#ED642B]' : 'text-[#6B7280]'}`} />
              </button>
            </div>

          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 hover:text-white cursor-pointer">{theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}</button>
            <Link to="/login" className="text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="flex items-center gap-1.5 rounded-xl bg-[#ED642B] px-4 py-2 text-xs font-bold text-white hover:bg-[#D4521D] shadow-lg shadow-[#ED642B]/25 transition-all cursor-pointer"
            >
              Register fleet <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* ── MEGA-MENU DROPDOWN DRAWER (FLEXPORT STYLE) ── */}
        {activeMenu && (
          <div
            className="border-t border-white/[0.08] bg-[#140938]/95 shadow-2xl transition-all duration-200 ease-out"
            onMouseEnter={() => handleMouseEnter(activeMenu)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="mx-auto max-w-7xl p-8">
              
              {/* MENU 1: Platform & Fleet OS */}
              {activeMenu === 'platform' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-[#ED642B] uppercase font-mono tracking-wider">Core telemetry & live ops</h4>
                      <div className="space-y-3">
                        <Link to="/login" className="block p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-[#ED642B]" />
                            <span className="text-sm font-semibold text-white group-hover:text-[#ED642B] transition-colors">Live fleet radar</span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                            Continuous real-time GPS tracking with dark-matter cartography and dynamic speed telemetry.
                          </p>
                        </Link>
                        <Link to="/login" className="block p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2">
                            <Layers size={16} className="text-emerald-400" />
                            <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">Automated geofence engine</span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                            Zero-driver-input arrival & departure detection across 500+ warehouses, ICDs, and border checkpoints.
                          </p>
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-[#6E92FF] uppercase font-mono tracking-wider">Intelligence & insights</h4>
                      <div className="space-y-3">
                        <Link to="/login" className="block p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-amber-400" />
                            <span className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">Dwell event analyzer</span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                            Precise breakdown of terminal turnaround time versus planned baseline SLA allowances.
                          </p>
                        </Link>
                        <Link to="/login" className="block p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2">
                            <Zap size={16} className="text-purple-400" />
                            <span className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">Bottleneck root-cause engine</span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                            Identifies chronic terminal congestion hours and recommends optimal gate dispatch windows.
                          </p>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Featured Card with Real Warehouse Photo */}
                  <div className="col-span-4 rounded-2xl border border-white/10 overflow-hidden bg-[#141721] flex flex-col justify-between">
                    <div className="relative h-32 overflow-hidden">
                      <img src="/warehouse-docks.jpg" alt="Warehouse loading docks" className="w-full h-full object-cover brightness-95" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141721] via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 bg-[#0B0F17]/80 backdrop-blur-md text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                        Terminal dispatch
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h5 className="text-xs font-bold text-white uppercase font-mono">Warehouse dock baselines</h5>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        Configure terminal turnaround thresholds per depot or distribution facility.
                      </p>
                      <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-[#ED642B] hover:underline pt-1">
                        Explore platform features &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* MENU 2: Freight Corridors */}
              {activeMenu === 'corridors' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 grid grid-cols-3 gap-5">
                    
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Northern Corridor A109</span>
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono">680 km</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Mombasa Port → Voi → Nairobi ICD → Eldoret → Malaba.</p>
                      <span className="text-[11px] font-mono text-amber-300 font-semibold block pt-1">High border dwell potential</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Kilindini Container Port</span>
                        <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-mono">Gate 14/18</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Container crane offloading, berth interchange & rail interchange.</p>
                      <span className="text-[11px] font-mono text-red-400 font-semibold block pt-1">Demurrage risk: Monitor closely</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Malaba OSBP Border</span>
                        <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-mono">Weighbridge</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Customs document verification & axle load inspection station.</p>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold block pt-1">Border delay reduction tracked</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Nairobi ICD Dry Port</span>
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono">Embakasi</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Inland container distribution and customs clearance yard.</p>
                      <span className="text-[11px] font-mono text-white font-semibold block pt-1">High-volume inland hub</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Namanga Customs Post</span>
                        <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-mono">Cross-border</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Kenya - Tanzania bilateral trade highway corridor.</p>
                      <span className="text-[11px] font-mono text-amber-300 font-semibold block pt-1">Clearance time monitored</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Busia Border Crossing</span>
                        <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-mono">Western hub</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Bulk commodities and regional cross-border transit artery.</p>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold block pt-1">Cross-border telemetry ready</span>
                    </div>

                  </div>

                  {/* Real Port Photo Column */}
                  <div className="col-span-4 rounded-2xl border border-white/10 overflow-hidden bg-[#141721] flex flex-col justify-between">
                    <div className="relative h-36 overflow-hidden">
                      <img src="/port-terminal.jpg" alt="Port container terminal" className="w-full h-full object-cover brightness-95" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141721] via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 bg-[#0B0F17]/80 backdrop-blur-md text-[10px] font-mono text-[#6E92FF] px-2 py-0.5 rounded border border-blue-500/30">
                        Kilindini harbour
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h5 className="text-xs font-bold text-white uppercase font-mono">Port turnaround metrics</h5>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        Track container offloading and gate passage times to avoid container demurrage penalties.
                      </p>
                      <Link to="/login" className="inline-flex items-center gap-1 text-xs font-bold text-[#ED642B] hover:underline pt-1">
                        View live corridor telemetry &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* MENU 3: Cost & Loss Engine */}
              {activeMenu === 'cost-engine' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-[#6E92FF] uppercase font-mono tracking-wider">Quantified waste calculation</h4>
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-sm font-semibold text-white">Demurrage penalty ledger</span>
                          <p className="text-xs text-[#9CA3AF]">Automatic accrual estimation when containers exceed free storage time at port gates.</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-sm font-semibold text-white">Driver idle salary burn</span>
                          <p className="text-xs text-[#9CA3AF]">Compute wage loss per hour when lorries are stranded at unassigned loading bays.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-[#6E92FF] uppercase font-mono tracking-wider">Financial optimization</h4>
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-sm font-semibold text-white">Terminal rate benchmarking</span>
                          <p className="text-xs text-[#9CA3AF]">Compare cost per turnaround across 3PL warehouses and negotiate with data.</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-sm font-semibold text-white">Fleet utilization index</span>
                          <p className="text-xs text-[#9CA3AF]">Turn idle truck hours back into revenue-generating transit trips.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real Border Clearance Photo Card */}
                  <div className="col-span-4 rounded-2xl border border-white/10 overflow-hidden bg-[#141721] flex flex-col justify-between">
                    <div className="relative h-36 overflow-hidden">
                      <img src="/border-clearance.jpg" alt="Border clearance and weighbridge" className="w-full h-full object-cover brightness-95" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141721] via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 bg-[#0B0F17]/80 backdrop-blur-md text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                        Weighbridge loss engine
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h5 className="text-xs font-bold text-white uppercase font-mono">Recover lost margin</h5>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        Fleet operators using Turnaround recover idle hours and reduce demurrage exposure across their haulier network.
                      </p>
                      <Link to="/signup" className="inline-flex items-center gap-1 text-xs font-bold text-[#ED642B] hover:underline pt-1">
                        Calculate your fleet savings &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* MENU 4: Telematics & Hardware */}
              {activeMenu === 'integrations' && (
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 grid grid-cols-3 gap-5">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Radio size={16} className="text-[#4F7CFF]" />
                        <span className="text-sm font-bold text-white">Geotab & Webfleet</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Native API sync for enterprise telematics boxes. Ingest speed and coordinates automatically.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu size={16} className="text-emerald-400" />
                        <span className="text-sm font-bold text-white">Teltonika & Tramigo</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Universal protocol support for Teltonika FMB920, FMC130, and OBD-II tracker hardware.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-purple-400" />
                        <span className="text-sm font-bold text-white">ERP & TMS Webhooks</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF]">Forward real-time geofence milestones into SAP, Oracle Transport, or proprietary TMS.</p>
                    </div>
                  </div>

                  <div className="col-span-4 rounded-2xl border border-white/10 bg-[#141721] p-5 space-y-3">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Plug-and-play setup</span>
                    <h5 className="text-sm font-bold text-white">Connect telematics in 10 mins</h5>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      No hardware changes required. Link your existing GPS provider credentials to activate automated dwell tracking immediately.
                    </p>
                    <Link to="/signup" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F7CFF] hover:underline pt-2">
                      View hardware integration guide &rarr;
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 z-10">
        
        {/* Crisp, clear background photo with subtle parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div ref={heroRef} className="absolute inset-0 scale-105 transition-transform duration-700 ease-out">
            <img
              src="/hero-fleet.jpg"
              alt="Commercial freight lorries and distribution hub at dusk"
              className="h-full w-full object-cover object-center brightness-[0.88] contrast-[1.06] animate-cinematic-crane"
            />
          </div>
          {/* Directional gradient and cinematic vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#07051A]/95 via-[#07051A]/68 to-[#07051A]/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080A] via-transparent to-[#07080A]/30" />
          <div className="absolute inset-0 cinematic-vignette opacity-70" />
          {/* Subtle Anamorphic Optical Flare Sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-[45%] h-full bg-gradient-to-r from-transparent via-[#4F7CFF]/10 to-transparent animate-anamorphic-flare blur-xl" />
          </div>
        </div>

        {/* ── MOVING TRUCKS ON ASPHALT ROADS ANIMATION LAYER ── */}
        <AnimatedFleetBackground />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy Column */}
            <div className="lg:col-span-7 space-y-6 lg:pr-8">

              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white leading-[1.04] sm:text-5xl lg:text-[4.35rem]">
                Stop losing money at <span className="text-[#ED642B]">loading docks</span> and border crossings.
              </h1>

              <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
                Turnaround automatically maps vehicle geofences, computes turnaround delays, and translates idle truck hours into measurable KES savings.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 items-center">
                <Link
                  to="/signup"
                  className="flex items-center gap-2 rounded-xl bg-[#ED642B] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#ED642B]/35 hover:bg-[#D4521D] hover:shadow-[#ED642B]/50 transition-all cursor-pointer"
                >
                  Register your fleet <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-xl border border-white/25 bg-black/50 backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer"
                >
                  Open operations dashboard <ChevronRight size={16} />
                </Link>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/65">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Plug-and-play GPS feeds</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Automated geofence entry/exit</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Real-time cost readouts</span>
              </div>
            </div>

            {/* Right — capabilities highlight grid */}
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: MapPin, label: 'Live GPS tracking', sub: 'Real-time vehicle positions' },
                  { icon: Clock, label: 'Dwell monitoring', sub: 'Entry/exit time measurement' },
                  { icon: TrendingDown, label: 'Cost tracking', sub: 'Idle time cost quantification' },
                  { icon: Shield, label: 'Role-based access', sub: 'Fleet managers & dispatchers' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-[#140938]/80 backdrop-blur-md p-5 space-y-3 hover:border-[#ED642B]/40 transition-all">
                    <div className="h-10 w-10 rounded-xl bg-[#ED642B]/15 border border-[#ED642B]/25 flex items-center justify-center">
                      <Icon size={18} className="text-[#ED642B]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{label}</h3>
                      <p className="text-xs text-white/60 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── LIVE OPERATIONS METRICS RAIL ── */}
      <section className="relative z-20 -mt-10 px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0E0A2C]/85 shadow-2xl shadow-black/30 backdrop-blur-xl md:grid-cols-5">
          {[
            { value: '28+', label: 'Freight stations', detail: 'Across East Africa', color: '#9C6ADE' },
            { value: '2,450+', label: 'Shipments delivered', detail: 'This month', color: '#ED642B' },
            { value: '98.2%', label: 'On-time delivery', detail: 'Performance', color: '#6E92FF' },
            { value: 'KES 12.4M+', label: 'Revenue processed', detail: 'This month', color: '#22C55E' },
            { value: '200+', label: 'Active partners', detail: 'On the platform', color: '#4F7CFF' },
          ].map((metric) => (
            <div key={metric.label} className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:flex" style={{ color: metric.color, borderColor: `${metric.color}45`, backgroundColor: `${metric.color}18` }}>
                <Radio size={16} />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-lg font-bold text-white sm:text-xl">{metric.value}</strong>
                <span className="block truncate text-[10px] font-semibold text-white/75 sm:text-xs">{metric.label}</span>
                <span className="block truncate text-[10px] text-white/45">{metric.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* ── PHOTO SHOWCASE CORRIDOR SECTION ── */}
      <section id="corridors" className="relative py-28 overflow-hidden z-10">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/highway-trucks.jpg"
            alt="Articulated lorries and haulage trucks on freight highway corridor"
            className="h-full w-full object-cover brightness-[0.75] contrast-[1.10] animate-cinematic-dolly"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/90 via-[#07080A]/40 to-[#07080A]/90" />
          <div className="absolute inset-0 cinematic-vignette opacity-70" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono font-bold text-[#ED642B] tracking-wider uppercase">Freight corridors</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Continuous visibility from inland depots to deepwater ports.
            </h2>
            <p className="text-sm sm:text-base text-white/80 mt-3 leading-relaxed">
              Designed specifically for heavy hauliers operating across long-haul transit arteries where every idle hour burns fuel, driver time, and vehicle availability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                corridor: 'Northern Corridor',
                route: 'Mombasa → Nairobi → Malaba → Kampala',
                highlight: 'High border dwell risk & customs delay',
                metric: 'Border delay reduction tracked',
              },
              {
                corridor: 'Great North Highway',
                route: 'Namanga → Nairobi → Isiolo → Moyale',
                highlight: 'Checkpoint congestion & weighbridge holds',
                metric: 'Real-time bottleneck alerts',
              },
              {
                corridor: 'Coastal Inland Logistics',
                route: 'Kilindini Port → Mariakani Weighbridge → Athi River',
                highlight: 'Demurrage & container gate congestion',
                metric: 'Demurrage exposure monitored',
              },
            ].map((c) => (
              <div
                key={c.corridor}
                className="rounded-2xl border border-white/15 bg-[#140938]/75 backdrop-blur-md p-6 space-y-4 hover:border-[#ED642B]/60 hover:bg-[#140938]/90 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-numeric text-xs font-bold text-[#ED642B] uppercase">{c.corridor}</span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">Active</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{c.route}</h3>
                  <p className="text-xs text-white/70 mt-1">{c.highlight}</p>
                </div>
                <div className="pt-3 border-t border-white/10 font-['IBM_Plex_Mono'] text-xs font-semibold text-amber-300">
                  {c.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE OPERATIONAL INTELLIGENCE FLASHCARDS ── */}
      <OperationalFlashcards />

      {/* ── FEATURES SECTION: Warehouse Logistics Backdrop (Clear, Crisp Image) ── */}
      <section id="features" className="relative py-28 overflow-hidden z-10 border-t border-white/[0.08]">
        {/* Clear Warehouse Loading Docks Photography */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/warehouse-docks.jpg"
            alt="Warehouse loading docks and commercial trucks"
            className="h-full w-full object-cover brightness-[0.82] contrast-[1.10] animate-cinematic-push"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/90 via-[#07080A]/60 to-[#07080A]/90" />
          <div className="absolute inset-0 cinematic-vignette opacity-70" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-mono font-bold text-[#ED642B] tracking-wider uppercase">Built for dispatchers & fleet directors</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Every tool required to eliminate invisible terminal delays.
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed">
              Replace fragmented WhatsApp calls and outdated driver log sheets with automated geofenced turnarounds.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/15 bg-black/75 backdrop-blur-md p-7 hover:border-[#4F7CFF]/50 hover:bg-black/85 transition-all duration-200"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="text-lg font-semibold text-[#F4F5F7] mb-2">{title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: Port & Container Terminal Backdrop (Clear, Crisp Image) ── */}
      <section id="workflow" className="relative py-28 overflow-hidden z-10 border-t border-white/[0.08]">
        {/* Clear Port container lorries background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/port-terminal.jpg"
            alt="Container port terminal with heavy haulage lorries"
            className="h-full w-full object-cover brightness-[0.84] contrast-[1.12] animate-cinematic-crane"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080A]/90 via-[#07080A]/55 to-[#07080A]/90" />
          <div className="absolute inset-0 cinematic-vignette opacity-70" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-3">
            <span className="text-xs font-mono font-bold text-[#ED642B] tracking-wider uppercase">Operational workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              From GPS beacon to cost recovery in 3 steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Automatic geofence ingestion',
                desc: 'Vehicles enter warehouses, container yards, or border crossings. Entry timestamps and terminal coordinates are logged automatically without driver intervention.',
                icon: Layers,
              },
              {
                step: '02',
                title: 'Dwell & turnaround computation',
                desc: 'The engine evaluates elapsed minutes against planned terminal allowances. Any delay triggers instant alert notifications on the dispatcher console.',
                icon: Clock,
              },
              {
                step: '03',
                title: 'Actionable cost intelligence',
                desc: 'Quantified KES loss, bay congestion rankings, and operational recommendations are surfaced in real-time to save the trip before demurrage accrues.',
                icon: DollarSign,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div
                key={step}
                className="relative rounded-2xl border border-white/15 bg-black/75 backdrop-blur-md p-8 text-left space-y-4 hover:border-white/35 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F7CFF]/15 border border-[#4F7CFF]/30">
                    <Icon size={20} className="text-[#6E92FF]" />
                  </div>
                  <span className="font-['IBM_Plex_Mono'] text-2xl font-bold text-white/50">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-white/75 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── FINAL CTA: Clear Dusk Fleet Backdrop ── */}
      <section className="relative py-28 overflow-hidden z-10 border-t border-white/[0.08]">
        {/* Clear, sharp background photo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src="/hero-fleet.jpg"
            alt="Turnaround fleet distribution yard"
            className="w-full h-full object-cover brightness-[0.86] contrast-[1.10] animate-cinematic-push"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080A]/95 via-[#07080A]/60 to-[#07080A]/95" />
          <div className="absolute inset-0 cinematic-vignette opacity-70" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Ready to eliminate invisible fleet delays?
          </h2>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Register your fleet organisation today to start tracking dwell costs and recover lost driving hours.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/signup"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#ED642B] px-8 py-4 text-base font-bold text-white shadow-2xl shadow-[#ED642B]/30 hover:bg-[#D4521D] transition-all cursor-pointer"
            >
              Register fleet account <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-black/50 backdrop-blur-md px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Sign in to existing fleet
            </Link>
          </div>
        </div>
      </section>

      {/* ── MODERN RICH FOOTER ── */}
      <footer className="border-t border-white/[0.10] bg-[#040507] pt-16 pb-12 z-10 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-16 border-b border-white/[0.08]">
            
            {/* Col 1: Brand */}
            <div className="col-span-2 space-y-5">
              <Link to="/" className="group shrink-0 inline-block">
                <BrandLogo size={34} showText={true} />
              </Link>
              <p className="text-xs text-[#9CA3AF] max-w-sm leading-relaxed">
                Operational intelligence for commercial fleets across East Africa. Real-time dwell monitoring, geofence cost tracking, and turnaround optimization.
              </p>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Product</h4>
              <ul className="space-y-2 text-xs text-[#9CA3AF]">
                <li><Link to="/login" className="hover:text-white transition-colors">Live fleet map</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Dwell intelligence</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Location analytics</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Bottleneck radar</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Telematics ingestion</Link></li>
              </ul>
            </div>

            {/* Col 3: Corridors & Solutions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Corridors</h4>
              <ul className="space-y-2 text-xs text-[#9CA3AF]">
                <li><a href="#corridors" className="hover:text-white transition-colors">Northern Corridor</a></li>
                <li><a href="#corridors" className="hover:text-white transition-colors">Mombasa Container Port</a></li>
                <li><a href="#corridors" className="hover:text-white transition-colors">Nairobi ICD Terminal</a></li>
                <li><a href="#corridors" className="hover:text-white transition-colors">Malaba Border Crossing</a></li>
                <li><a href="#corridors" className="hover:text-white transition-colors">Namanga Border Post</a></li>
              </ul>
            </div>

            {/* Col 4: Operations & Trust */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Operations</h4>
              <ul className="space-y-2 text-xs text-[#9CA3AF]">
                <li><Link to="/signup" className="hover:text-white transition-colors">Register fleet</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Dispatcher console</Link></li>
                <li><Link to="/forgot-password" className="hover:text-white transition-colors">Password recovery</Link></li>
                <li><a href="mailto:support@turnaround.io" className="hover:text-white transition-colors">Technical support</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Operator dashboard</Link></li>
              </ul>
            </div>

          </div>

          {/* Bottom copyright & legal */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
            <p>© 2026 Turnaround Logistics Systems. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-[#9CA3AF] transition-colors">Privacy policy</Link>
              <Link to="/terms" className="hover:text-[#9CA3AF] transition-colors">Terms of service</Link>
              <Link to="/terms#security" className="hover:text-[#9CA3AF] transition-colors">Security & SLA</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
