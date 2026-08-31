import React, { useState } from 'react';
import { QRCodeDisplay } from '../../components/common/QRCodeDisplay';
import {
  Ticket, CheckCircle2, ShieldCheck, Printer, Download,
  Share2, X, Clock, MapPin, Lock, QrCode
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/Select';
import type { GatePassData } from '../../lib/api/types';
export type { GatePassData };

interface GatePassModalProps {
  pass: GatePassData;
  onClose: () => void;
}

export const GatePassModal: React.FC<GatePassModalProps> = ({ pass, onClose }) => {
  const { toast } = useToast();
  const [clearedStatus, setClearedStatus] = useState(pass.status);
  const [selectedGate, setSelectedGate] = useState(pass.terminal_gate || 'Express Fast-Track Lane 02');
  const [isScanning, setIsScanning] = useState(false);

  const qrPayload = JSON.stringify({
    pass: pass.pass_number,
    reg: pass.vehicle_reg,
    driver: pass.driver_name,
    seal: pass.customs_seal_number,
    cont: pass.container_number,
    term: pass.terminal_name,
    exp: pass.time_window_end,
    sig: pass.digital_signature || 'TURNAROUND-SEC-PASS-9988'
  });

  const handleSimulateGateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setClearedStatus('cleared');
      toast({
        variant: 'success',
        title: 'Terminal Gate-In Verified',
        message: `Asset ${pass.vehicle_reg} scanned at ${pass.terminal_name}. Express gate barrier raised.`
      });
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast({
      variant: 'success',
      title: 'Pass Exported',
      message: `Digital pass ${pass.pass_number} saved for offline driver presentation.`
    });
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `Turnaround Express Gate Pass: ${pass.pass_number} for ${pass.vehicle_reg} at ${pass.terminal_name}. Valid until ${new Date(pass.time_window_end).toLocaleTimeString()}`
    );
    toast({
      variant: 'success',
      title: 'Pass Link Copied',
      message: 'Dispatch instructions and pass link copied to clipboard for WhatsApp/SMS.'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-border-default flex items-center justify-between bg-bg-surface-raised/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#250C77] text-white flex items-center justify-center shadow">
              <Ticket size={16} className="text-[#ED642B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Digital Express Terminal Gate Pass</h3>
              <p className="text-[10.5px] text-text-tertiary">Cryptographically verified contactless entry permit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── PASS TICKET BODY ── */}
        <div className="p-6 space-y-5">
          {/* Main Visual Boarding Pass Container */}
          <div className="relative rounded-2xl border-2 border-[#250C77]/30 bg-gradient-to-b from-bg-surface-raised/80 to-bg-surface p-5 shadow-lg overflow-hidden">
            {/* Top Pass Ribbon */}
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#ED642B] block">
                  EAST AFRICAN CORRIDOR EXPRESS PASS
                </span>
                <span className="font-mono text-sm font-extrabold text-text-primary">
                  {pass.pass_number}
                </span>
              </div>

              <div>
                {clearedStatus === 'cleared' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-status-good/15 text-status-good border border-status-good/40">
                    <CheckCircle2 size={12} /> EXPRESS CLEARED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#ED642B]/15 text-[#ED642B] border border-[#ED642B]/40">
                    <Clock size={12} /> PRE-APPROVED ENTRY
                  </span>
                )}
              </div>
            </div>

            {/* QR Code & Primary Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 items-center">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/90 border border-border-default shadow-sm">
                <QRCodeDisplay
                  value={qrPayload}
                  size={140}
                  fgColor="#250C77"
                  bgColor="#FFFFFF"
                />
                <span className="text-[9px] font-mono font-bold text-gray-500 mt-1.5 uppercase">
                  Scan at Gate Terminal
                </span>
              </div>

              <div className="sm:col-span-2 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-tertiary block">Designated Facility</span>
                  <p className="font-extrabold text-text-primary text-sm flex items-center gap-1.5 mb-1.5">
                    <MapPin size={13} className="text-[#ED642B]" /> {pass.terminal_name}
                  </p>
                  <div className="w-full">
                    <Select
                      value={selectedGate}
                      onValueChange={(val) => setSelectedGate(val)}
                    >
                      <SelectTrigger className="w-full h-8 text-[11px] font-semibold bg-bg-surface border-border-default">
                        <SelectValue placeholder="Select Clearance Lane" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Express Fast-Track Lane 01">Express Fast-Track Lane 01</SelectItem>
                        <SelectItem value="Express Fast-Track Lane 02">Express Fast-Track Lane 02</SelectItem>
                        <SelectItem value="Customs High-Speed Scanner Bay 03">Customs Scanner Bay 03</SelectItem>
                        <SelectItem value="Reefer & Cold-Chain Priority Bay">Reefer Priority Bay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-default/60">
                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-text-tertiary block">Vehicle Unit</span>
                    <span className="font-mono font-bold text-text-primary text-xs">{pass.vehicle_reg}</span>
                    <span className="text-[9.5px] text-text-tertiary block">{pass.vehicle_type || 'Commercial Truck'}</span>
                  </div>

                  <div>
                    <span className="text-[9.5px] uppercase font-bold text-text-tertiary block">Driver In Charge</span>
                    <span className="font-bold text-text-primary text-xs">{pass.driver_name}</span>
                    <span className="text-[9.5px] font-mono text-text-tertiary block">{pass.driver_phone || 'N/A'}</span>
                  </div>
                </div>

                {pass.customs_seal_number && (
                  <div className="p-2 rounded-lg bg-[#250C77]/5 border border-[#250C77]/20 flex items-center justify-between text-[10.5px]">
                    <span className="font-bold text-[#250C77] flex items-center gap-1">
                      <Lock size={11} /> Customs Seal:
                    </span>
                    <span className="font-mono font-extrabold text-text-primary">{pass.customs_seal_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Slot Banner */}
            <div className="p-3 rounded-xl bg-bg-surface border border-border-default text-xs flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-bold uppercase text-text-tertiary block">Authorized Clearance Window</span>
                <span className="font-numeric font-bold text-text-primary">
                  {new Date(pass.time_window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(pass.time_window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9.5px] font-bold uppercase text-text-tertiary block">Target Turnaround</span>
                <span className="font-numeric font-extrabold text-status-good">45 Min SLA</span>
              </div>
            </div>

            {/* Verification Hash Footer */}
            <div className="mt-3 pt-2.5 border-t border-dashed border-border-default flex items-center justify-between text-[9.5px] text-text-tertiary font-mono">
              <span>Carrier: {pass.carrier_name || 'Siginon Global Logistics'}</span>
              <span className="flex items-center gap-1 text-status-good font-bold">
                <ShieldCheck size={11} /> Tamper-Proof Cryptographic ID
              </span>
            </div>
          </div>

          {/* Quick Simulation Scanner Button */}
          <div className="p-3.5 rounded-xl bg-[#250C77]/5 border border-[#250C77]/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-primary">Simulate Terminal Barrier Scanner</p>
              <p className="text-[10.5px] text-text-tertiary">Test gate OCR & QR scanner integration in real time.</p>
            </div>
            <Button
              variant="primary"
              size="small"
              loading={isScanning}
              icon={<QrCode size={13} />}
              onClick={handleSimulateGateScan}
            >
              {clearedStatus === 'cleared' ? 'Re-scan Pass' : 'Scan at Gate'}
            </Button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-border-default bg-bg-surface-raised/50 flex items-center justify-between gap-2">
          <Button variant="ghost" size="small" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" icon={<Share2 size={13} />} onClick={handleShare}>
              Share Link
            </Button>
            <Button variant="outline" size="small" icon={<Printer size={13} />} onClick={handlePrint}>
              Print Pass
            </Button>
            <Button variant="primary" size="small" icon={<Download size={13} />} onClick={handleDownload}>
              Download Pass
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
