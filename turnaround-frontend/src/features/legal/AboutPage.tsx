import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  Route,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';

const pillars = [
  {
    icon: Route,
    title: 'See every corridor',
    text: 'Follow vehicle movement, routes, facilities, and live operating conditions from one view.',
  },
  {
    icon: BarChart3,
    title: 'Understand the delay',
    text: 'Turn dwell events and missed SLAs into clear operational and financial insight.',
  },
  {
    icon: Workflow,
    title: 'Act before costs grow',
    text: 'Give dispatchers the context they need to reroute, reassign, and resolve bottlenecks faster.',
  },
];

const operatingContexts = [
  { image: '/port-terminal.jpg', label: 'Port operations', text: 'Container yards, terminal gates, and vessel-side coordination.' },
  { image: '/warehouse-docks.jpg', label: 'Facility turnaround', text: 'Loading, unloading, customer facilities, and depot dwell.' },
  { image: '/border-clearance.jpg', label: 'Cross-border movement', text: 'Border posts, weighbridges, customs, and corridor handoffs.' },
];

export const AboutPage: React.FC = () => (
  <div className="min-h-screen bg-[#0A051B] text-white">
    <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#0A051B]/45 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" aria-label="Turnaround home"><BrandLogo size={36} showText textSize="text-lg" /></Link>
        <nav className="flex items-center gap-2 text-xs font-semibold">
          <Link to="/privacy" className="hidden rounded-lg px-3 py-2 text-white/65 hover:text-white sm:block">Privacy</Link>
          <Link to="/terms" className="hidden rounded-lg px-3 py-2 text-white/65 hover:text-white sm:block">Terms</Link>
          <Link to="/login" className="rounded-lg border border-white/15 px-3 py-2 text-white/80 hover:border-white/35 hover:text-white">Sign in</Link>
          <Link to="/signup" className="rounded-lg bg-[#ED642B] px-3 py-2 text-white hover:bg-[#D4521D]">Start using Turnaround</Link>
        </nav>
      </div>
    </header>

    <main>
      <section className="relative isolate flex min-h-[680px] items-end overflow-hidden px-6 pb-16 pt-36 lg:px-10 lg:pb-24">
        <img src="/highway-trucks.jpg" alt="Commercial trucks moving along an East African logistics corridor" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(10,5,27,.96)_0%,rgba(10,5,27,.76)_44%,rgba(10,5,27,.18)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#0A051B] to-transparent" />
        <div className="mx-auto w-full max-w-7xl">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-white/65 hover:text-white"><ArrowLeft size={14} /> Back to home</Link>
          <div className="max-w-2xl">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ED642B]"><span className="h-px w-8 bg-[#ED642B]" /> About Turnaround</p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">Make every delay visible. Make every minute actionable.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/72">Turnaround is operational intelligence for the people moving freight across East Africa. We connect fleet movement, facility dwell, dispatch decisions, and cost impact in one clear operating picture.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#ED642B] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#ED642B]/20 hover:bg-[#D4521D]">Create a workspace <ArrowRight size={15} /></Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Explore the platform</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#100827] px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ED642B]">Why we built it</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The road is only one part of the operation.</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-white/68">
            <p>Freight delays rarely happen in one obvious place. A truck can lose hours across a terminal gate, a weighbridge, a border crossing, and a customer yard before the cost becomes visible in a report.</p>
            <p>Turnaround gives logistics teams a shared source of truth. GPS signals become geofenced events, events become dwell insight, and insight becomes a faster operational decision.</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ED642B]">The operating loop</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From signal to decision.</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-[#ED642B]/50">
                <div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ED642B]/15 text-[#ED642B]"><Icon size={20} /></div><span className="font-mono text-xs text-white/35">0{index + 1}</span></div>
                <h3 className="mt-8 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F3FB] px-6 py-16 text-[#160B3E] lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D4521D]">Built for the region</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Designed around real corridor complexity.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#160B3E]/65">Turnaround is shaped for the operational reality of ports, inland container depots, border posts, warehouses, and long-haul routes connecting East Africa.</p><div className="mt-7 grid gap-3 text-sm font-semibold sm:grid-cols-2"><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ED642B]" /> Multi-tenant workspaces</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ED642B]" /> Role-based operations</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ED642B]" /> GPS and geofence intelligence</span><span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ED642B]" /> Vehicle and container workflows</span></div></div>
          <div className="relative overflow-hidden rounded-2xl"><img src="/warehouse-docks.jpg" alt="Warehouse loading docks" className="aspect-[4/3] w-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#160B3E]/90 to-transparent p-5 pt-16"><p className="flex items-center gap-2 text-xs font-bold text-white"><MapPin size={14} className="text-[#ED642B]" /> Mombasa to Nairobi and beyond</p></div></div>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ED642B]">Where it works</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One platform, many handoffs.</h2></div><p className="max-w-sm text-sm leading-6 text-white/55">Make the moments between origin and destination easier to see, understand, and improve.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{operatingContexts.map((context) => <article key={context.label} className="group overflow-hidden border border-white/10 bg-white/[0.04]"><div className="overflow-hidden"><img src={context.image} alt={context.label} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" /></div><div className="p-5"><h3 className="font-extrabold">{context.label}</h3><p className="mt-2 text-sm leading-6 text-white/58">{context.text}</p></div></article>)}</div></div>
      </section>

      <section className="border-t border-white/10 bg-[#100827] px-6 py-16 lg:px-10 lg:py-20"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ED642B]/15 text-[#ED642B]"><ShieldCheck size={21} /></div><div><h2 className="text-xl font-black">Ready for a clearer operating picture?</h2><p className="mt-1 text-sm text-white/58">Bring your fleet, facilities, and corridors into focus.</p></div></div><Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#ED642B] px-5 py-3 text-sm font-bold text-white hover:bg-[#D4521D]">Start with Turnaround <ArrowRight size={15} /></Link></div></section>
    </main>

    <footer className="border-t border-white/10 bg-[#0A051B] px-6 py-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-white/45 sm:flex-row sm:items-center"><span>Turnaround Logistics Systems</span><div className="flex gap-4"><Link to="/privacy" className="hover:text-white">Privacy</Link><Link to="/terms" className="hover:text-white">Terms</Link><Link to="/login" className="hover:text-white">Sign in</Link></div></div></footer>
  </div>
);
