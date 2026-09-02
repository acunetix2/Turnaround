import React from 'react';
import QRCode from 'react-qr-code';
import { X, Printer, Share2, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import type { GatePassData } from '../../lib/api/types';
export type { GatePassData };

/* ── Declared outside the component so React never treats it as a
      "component created during render"                             ── */
const PassField = ({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  wide?: boolean;
}) => (
  <div className={`flex flex-col gap-0.5 ${wide ? 'col-span-2' : ''}`}>
    <span className="text-[9px] uppercase tracking-widest font-semibold text-gray-400">
      {label}
    </span>
    <span
      className={[
        'text-sm font-semibold leading-tight',
        mono ? 'font-mono' : '',
        !value ? 'text-gray-300 italic' : 'text-gray-900',
      ].join(' ')}
    >
      {value || '—'}
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────────────── */

interface GatePassModalProps {
  pass: GatePassData;
  onClose: () => void;
}

export const GatePassModal: React.FC<GatePassModalProps> = ({ pass, onClose }) => {
  const { toast } = useToast();

  /* Date helpers */
  const fmtFull = (d: string) =>
    new Date(d).toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

  const fmtShort = (d: string) =>
    new Date(d).toLocaleString('en-KE', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

  /* QR value – everything a gatehouse officer needs to verify */
  const qrValue = [
    `PASS:${pass.pass_number}`,
    `VEH:${pass.vehicle_reg}`,
    `DRV:${pass.driver_name}`,
    `TERM:${pass.terminal_name}`,
    pass.terminal_gate        ? `GATE:${pass.terminal_gate}`         : '',
    pass.container_number     ? `CONT:${pass.container_number}`      : '',
    pass.customs_seal_number  ? `SEAL:${pass.customs_seal_number}`   : '',
    `FROM:${fmtFull(pass.time_window_start)}`,
    `TO:${fmtFull(pass.time_window_end)}`,
    `STATUS:${pass.status.toUpperCase()}`,
  ].filter(Boolean).join(' | ');

  /* Status badge config */
  type PassStatus = 'cleared' | 'inspected' | 'expired' | 'pre_approved' | 'cancelled';
  const SC: Record<PassStatus, { label: string; bar: string; badge: string; text: string }> = {
    cleared:      { label: 'CLEARED',      bar: 'from-emerald-600 to-emerald-500', badge: 'bg-emerald-50 border-emerald-300 text-emerald-700', text: 'text-emerald-700' },
    inspected:    { label: 'INSPECTED',    bar: 'from-blue-600 to-blue-500',       badge: 'bg-blue-50 border-blue-300 text-blue-700',           text: 'text-blue-700'    },
    expired:      { label: 'EXPIRED',      bar: 'from-red-600 to-red-500',         badge: 'bg-red-50 border-red-300 text-red-700',              text: 'text-red-600'     },
    pre_approved: { label: 'PRE-APPROVED', bar: 'from-amber-500 to-amber-400',     badge: 'bg-amber-50 border-amber-300 text-amber-700',        text: 'text-amber-700'   },
    cancelled:    { label: 'CANCELLED',    bar: 'from-gray-500 to-gray-400',       badge: 'bg-gray-50 border-gray-300 text-gray-600',           text: 'text-gray-500'    },
  };
  const sc = SC[(pass.status as PassStatus)] ?? SC.pre_approved;

  /* Handlers */
  const handlePrint = () => {
    window.print();
    toast({ variant: 'success', title: 'Printing', message: pass.pass_number });
  };

  const handleShare = async () => {
    const text =
      `GATE PASS — ${pass.pass_number}\n` +
      `Vehicle : ${pass.vehicle_reg}\n` +
      `Driver  : ${pass.driver_name}${pass.driver_phone ? ' · ' + pass.driver_phone : ''}\n` +
      `Terminal: ${pass.terminal_name}${pass.terminal_gate ? ' · Gate ' + pass.terminal_gate : ''}\n` +
      `Valid   : ${fmtFull(pass.time_window_start)} → ${fmtFull(pass.time_window_end)}\n` +
      `Status  : ${sc.label}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Gate Pass ${pass.pass_number}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ variant: 'success', title: 'Copied', message: 'Pass details copied to clipboard' });
      }
    } catch {
      toast({ variant: 'info', title: 'Share', message: 'Use Print → Save as PDF to share' });
    }
  };

  return (
    <>
      {/* Print media — only the card is shown */}
      <style>{`
        @media print {
          body > *:not(#gp-root) { display: none !important; }
          #gp-root {
            position: fixed; inset: 0; background: #fff;
            display: flex; align-items: center; justify-content: center;
          }
          .no-print { display: none !important; }
          #gp-card { box-shadow: none !important; }
        }
      `}</style>

      <div
        id="gp-root"
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        {/* ── Toolbar (hidden on print) ── */}
        <div className="no-print absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button variant="outline" size="small" icon={<Share2 size={13} />} onClick={handleShare}>
            Share
          </Button>
          <Button variant="primary" size="small" icon={<Printer size={13} />} onClick={handlePrint}>
            Print / PDF
          </Button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* ═══════════════ DIGITAL GATE PASS CARD ═══════════════ */}
        <div
          id="gp-card"
          className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl overflow-hidden select-text"
          style={{ fontFamily: "'Geist','Inter',sans-serif" }}
        >
          {/* Gradient top bar */}
          <div className={`h-2 w-full bg-gradient-to-r ${sc.bar}`} />

          {/* ── Card header ── */}
          <div
            className="px-6 pt-5 pb-4 flex items-start justify-between"
            style={{ background: 'linear-gradient(135deg,#250C77 0%,#1a0a5a 100%)' }}
          >
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase mb-1">
                Turnaround Africa
              </p>
              <h1 className="text-[22px] font-black text-white tracking-tight leading-none">
                GATE PASS
              </h1>
              <p className="font-mono text-[11px] text-orange-300 font-semibold mt-1.5 tracking-wider">
                {pass.pass_number}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border ${sc.badge} mt-1`}
            >
              <ShieldCheck size={11} />
              {sc.label}
            </span>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5 space-y-4">

            {/* QR  +  vehicle / driver */}
            <div className="flex gap-5">

              {/* QR code — generated entirely in the browser, no backend needed */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="w-[96px] h-[96px] p-2 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center">
                  <QRCode
                    value={qrValue}
                    size={76}
                    bgColor="#ffffff"
                    fgColor="#250C77"
                    level="M"
                  />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center">
                  Scan at Gate
                </p>
              </div>

              {/* Key fields */}
              <div className="flex-1 min-w-0 space-y-3">
                <PassField label="Vehicle Reg." value={pass.vehicle_reg} mono />
                <PassField label="Vehicle Type"  value={pass.vehicle_type || 'Commercial Truck'} />
                <PassField label="Driver"        value={pass.driver_name} />
                {pass.driver_phone && (
                  <PassField label="Contact" value={pass.driver_phone} mono />
                )}
              </div>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-200" />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              <PassField label="Terminal"        value={pass.terminal_name} />
              <PassField label="Gate"            value={pass.terminal_gate} />
              <PassField label="Carrier"         value={pass.carrier_name} />
              <PassField label="Driver Licence"  value={pass.driver_license} mono />
              {pass.container_number    && <PassField label="Container No." value={pass.container_number}    mono />}
              {pass.customs_seal_number && <PassField label="Seal Number"   value={pass.customs_seal_number} mono />}
              {pass.cargo_type          && <PassField label="Cargo Type"    value={pass.cargo_type} />}
              {pass.cargo_weight_tonnes != null && (
                <PassField label="Cargo Weight" value={`${pass.cargo_weight_tonnes} t`} />
              )}
            </div>

            {/* Validity window */}
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">
                  Valid From
                </p>
                <p className="font-mono text-[11px] font-bold text-purple-900">
                  {fmtShort(pass.time_window_start)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">
                  Valid Until
                </p>
                <p className="font-mono text-[11px] font-bold text-purple-900">
                  {fmtShort(pass.time_window_end)}
                </p>
              </div>
            </div>

            {/* Signature boxes — mirrors the physical Yusen-style layout */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-xl p-3 min-h-[64px] flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                  Authorising Signature &amp; Date
                </p>
                {pass.digital_signature ? (
                  <p className="font-mono text-[9px] text-gray-500 break-all mt-1">
                    {pass.digital_signature.slice(-16)}
                  </p>
                ) : (
                  <p className="text-[9px] text-gray-300 italic mt-1">System generated</p>
                )}
                {pass.created_at && (
                  <p className="text-[9px] text-gray-400 font-mono mt-1">
                    {new Date(pass.created_at).toLocaleDateString('en-KE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <div className="border border-dashed border-gray-200 rounded-xl p-3 min-h-[64px] flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                  Gatehouse Release<br />Stamp &amp; Signature
                </p>
                <p className="text-[9px] text-gray-300 italic mt-1">
                  To be completed by security at departure
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="px-6 py-2.5 flex items-center justify-between"
            style={{ background: 'linear-gradient(90deg,#0B0524 0%,#250C77 100%)' }}
          >
            <p className="text-[9px] text-purple-300">
              Present with valid ID · turnaround.africa
            </p>
            <p className="font-mono text-[9px] text-orange-400 font-bold">
              #{pass.pass_number}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
