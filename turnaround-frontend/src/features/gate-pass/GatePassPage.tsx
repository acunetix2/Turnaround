import React, { useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { ArrowLeft, Image, Share2, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { apiClient } from '../../lib/api/client';
import type { GatePassData } from '../../lib/api/types';

/* ── Field cell — module-level to avoid "component created during render" ── */
const F = ({
  label,
  value,
  mono = false,
  span2 = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  span2?: boolean;
}) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <p className="text-[9px] uppercase tracking-widest font-semibold text-gray-400 mb-0.5">{label}</p>
    <p className={`text-sm font-semibold leading-tight ${mono ? 'font-mono' : ''} ${!value ? 'italic text-gray-300' : 'text-gray-900'}`}>
      {value || '—'}
    </p>
  </div>
);

/* ─────────────────────────────────────────────────────────────── */

type PassStatus = 'pre_approved' | 'approved' | 'cleared' | 'inspected' | 'used' | 'expired' | 'revoked';

const STATUS_CFG: Record<PassStatus, { label: string; topBar: string; badge: string }> = {
  pre_approved: { label: 'PRE-APPROVED', topBar: 'bg-amber-400',    badge: 'bg-amber-50 border-amber-300 text-amber-700'           },
  approved:     { label: 'APPROVED',     topBar: 'bg-emerald-500',  badge: 'bg-emerald-50 border-emerald-300 text-emerald-700'     },
  cleared:      { label: 'CLEARED',      topBar: 'bg-emerald-600',  badge: 'bg-emerald-50 border-emerald-400 text-emerald-800'     },
  inspected:    { label: 'INSPECTED',    topBar: 'bg-blue-500',     badge: 'bg-blue-50 border-blue-300 text-blue-700'              },
  used:         { label: 'GATE USED',    topBar: 'bg-indigo-500',   badge: 'bg-indigo-50 border-indigo-300 text-indigo-700'        },
  expired:      { label: 'EXPIRED',      topBar: 'bg-red-500',      badge: 'bg-red-50 border-red-300 text-red-600'                 },
  revoked:      { label: 'REVOKED',      topBar: 'bg-gray-500',     badge: 'bg-gray-50 border-gray-300 text-gray-600'              },
};

function fmtFull(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/* ─────────────────────────────────────────────────────────────── */

export const GatePassPage: React.FC = () => {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { id }       = useParams<{ id?: string }>();
  const { toast }    = useToast();
  const cardRef      = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  // Prefer router state (fresh creation navigation) — fall back to fetching by ID
  const statePass: GatePassData | null = (location.state as any)?.pass ?? null;

  const { data: fetchedPass, isLoading } = useQuery({
    queryKey: ['gate-pass', id],
    queryFn: () => apiClient.getGatePassById(id!),
    enabled: !statePass && !!id,
    staleTime: 30_000,
  });

  const pass: GatePassData | null = statePass ?? fetchedPass ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2 text-text-secondary text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading gate pass…
      </div>
    );
  }

  if (!pass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-text-secondary text-sm">No gate pass data found.</p>
        <Button variant="outline" size="small" icon={<ArrowLeft size={13} />} onClick={() => navigate('/gate-passes')}>
          Back to Gate Passes
        </Button>
      </div>
    );
  }

  const sc = STATUS_CFG[(pass.status as PassStatus)] ?? STATUS_CFG.pre_approved;

  const qrValue = [
    `PASS:${pass.pass_number}`,
    `VEH:${pass.vehicle_reg}`,
    `DRV:${pass.driver_name}`,
    `TERM:${pass.terminal_name}`,
    pass.terminal_gate       ? `GATE:${pass.terminal_gate}`        : '',
    pass.container_number    ? `CONT:${pass.container_number}`     : '',
    pass.customs_seal_number ? `SEAL:${pass.customs_seal_number}`  : '',
    `FROM:${fmtFull(pass.time_window_start)}`,
    `TO:${fmtFull(pass.time_window_end)}`,
    `STATUS:${(pass.status ?? 'pre_approved').toUpperCase()}`,
  ].filter(Boolean).join(' | ');

  /** Capture the card as a PNG and trigger download */
  const captureImage = async (): Promise<HTMLCanvasElement | null> => {
    const card = cardRef.current;
    if (!card) return null;
    setCapturing(true);
    try {
      const canvas = await html2canvas(card, {
        scale: 3,           // 3× for crisp high-res output
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true,
      });
      return canvas;
    } catch (err) {
      console.error('html2canvas error', err);
      toast({ variant: 'error', title: 'Capture failed', message: 'Could not render the gate pass image.' });
      return null;
    } finally {
      setCapturing(false);
    }
  };

  /** Download as PNG */
  const handleDownloadImage = async () => {
    const canvas = await captureImage();
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `gate-pass-${pass.pass_number}.png`;
    a.click();
    toast({ variant: 'success', title: 'Saved', message: `gate-pass-${pass.pass_number}.png` });
  };

  /** Share or copy the image */
  const handleShare = async () => {
    // Try image share first (mobile)
    if (navigator.share && navigator.canShare) {
      const canvas = await captureImage();
      if (canvas) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `gate-pass-${pass.pass_number}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: `Gate Pass ${pass.pass_number}` });
              return;
            } catch { /* fall through */ }
          }
          // Fallback: share text
          shareText();
        }, 'image/png');
        return;
      }
    }
    shareText();
  };

  const shareText = async () => {
    const text =
      `GATE PASS — ${pass.pass_number}\n` +
      `Vehicle : ${pass.vehicle_reg}\n` +
      `Driver  : ${pass.driver_name}${pass.driver_phone ? ' · ' + pass.driver_phone : ''}\n` +
      `Terminal: ${pass.terminal_name}${pass.terminal_gate ? ' · Gate ' + pass.terminal_gate : ''}\n` +
      `Valid   : ${fmtFull(pass.time_window_start)} → ${fmtFull(pass.time_window_end)}\n` +
      `Status  : ${(STATUS_CFG[(pass.status as PassStatus)] ?? STATUS_CFG.pre_approved).label}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Gate Pass ${pass.pass_number}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ variant: 'success', title: 'Copied', message: 'Pass details copied to clipboard' });
      }
    } catch {
      toast({ variant: 'info', title: 'Share', message: 'Download the image and share it directly.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">

      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Trips
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="small" icon={<Share2 size={13} />} onClick={handleShare} loading={capturing}>
            Share
          </Button>
          <Button variant="primary" size="small" icon={<Download size={13} />} onClick={handleDownloadImage} loading={capturing}>
            Save as Image
          </Button>
        </div>
      </div>

      {/* ══════════════ GATE PASS CARD ══════════════ */}
      <div
        ref={cardRef}
        className="gp-card bg-white rounded-2xl shadow-lg overflow-hidden"
        style={{ fontFamily: "'Geist','Inter',sans-serif" }}
      >
        {/* Status colour bar */}
        <div className={`h-2 w-full ${sc.topBar}`} />

        {/* Header */}
        <div
          className="px-7 pt-6 pb-5 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg,#250C77 0%,#1a0a5a 100%)' }}
        >
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase mb-1">
              Turnaround Africa
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">GATE PASS</h1>
            <p className="font-mono text-xs text-orange-300 font-semibold mt-2 tracking-wider">
              {pass.pass_number}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full border ${sc.badge} mt-1 shrink-0`}>
            <ShieldCheck size={11} />
            {sc.label}
          </span>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">

          {/* QR + vehicle/driver row */}
          <div className="flex gap-6">
            {/* QR — always generated in browser */}
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-[110px] h-[110px] p-2.5 border-2 border-gray-200 rounded-xl bg-white flex items-center justify-center">
                <QRCode value={qrValue} size={88} bgColor="#ffffff" fgColor="#250C77" level="M" />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 text-center">Scan at Gate</p>
            </div>

            {/* Key fields */}
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-5 gap-y-3.5">
              <F label="Vehicle Reg." value={pass.vehicle_reg} mono />
              <F label="Vehicle Type"  value={pass.vehicle_type || 'Commercial Truck'} />
              <F label="Driver"        value={pass.driver_name} />
              <F label="Contact"       value={pass.driver_phone} mono />
              {pass.driver_license && <F label="Driver Licence" value={pass.driver_license} mono />}
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200" />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
            <F label="Terminal"       value={pass.terminal_name} />
            <F label="Gate"           value={pass.terminal_gate} />
            <F label="Carrier"        value={pass.carrier_name} />
            {pass.container_number    && <F label="Container No." value={pass.container_number}    mono />}
            {pass.customs_seal_number && <F label="Customs Seal"  value={pass.customs_seal_number} mono />}
            {pass.cargo_type          && <F label="Cargo Type"    value={pass.cargo_type} />}
            {pass.cargo_weight_tonnes != null && (
              <F label="Cargo Weight" value={`${pass.cargo_weight_tonnes} t`} />
            )}
          </div>

          {/* Validity */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Valid From</p>
              <p className="font-mono text-xs font-bold text-purple-900">{fmtShort(pass.time_window_start)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-1">Valid Until</p>
              <p className="font-mono text-xs font-bold text-purple-900">{fmtShort(pass.time_window_end)}</p>
            </div>
          </div>

          {/* Signature boxes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-xl p-3.5 min-h-[72px] flex flex-col justify-between">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                Authorising Signature & Date
              </p>
              {pass.digital_signature
                ? <p className="font-mono text-[9px] text-gray-500 break-all mt-1">{pass.digital_signature.slice(-16)}</p>
                : <p className="text-[9px] text-gray-300 italic mt-1">System generated</p>
              }
              {pass.created_at && (
                <p className="text-[9px] text-gray-400 font-mono mt-1">
                  {new Date(pass.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="border border-dashed border-gray-200 rounded-xl p-3.5 min-h-[72px] flex flex-col justify-between">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
                Gatehouse Release<br />Stamp & Signature
              </p>
              <p className="text-[9px] text-gray-300 italic mt-1">
                To be completed by security at departure
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-7 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg,#0B0524 0%,#250C77 100%)' }}
        >
          <p className="text-[9px] text-purple-300">Present with valid ID · turnaround.africa</p>
          <p className="font-mono text-[9px] text-orange-400 font-bold">#{pass.pass_number}</p>
        </div>
      </div>
    </div>
  );
};
