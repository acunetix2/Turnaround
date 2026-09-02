/**
 * GatePassCreateModal
 * ───────────────────
 * Shown when a dispatcher clicks "Gate Pass" on a trip.
 * Displays pre-filled values derived from the trip and lets the user edit
 * terminal_name, terminal_gate, time windows, carrier, and cargo weight
 * before the pass is created.
 */
import React, { useState } from 'react';
import { X, FileCheck, Truck, User, Container, Building2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { Trip } from '../../lib/api/types';

export interface GatePassFormValues {
  vehicle_id: string;
  trip_id: string;
  vehicle_reg: string;
  vehicle_type?: string;
  driver_name: string;
  driver_phone?: string;
  driver_license?: string;
  container_number?: string;
  customs_seal_number?: string;
  cargo_type?: string;
  cargo_weight_tonnes?: number;
  terminal_name: string;
  terminal_gate: string;
  time_window_start: string;
  time_window_end: string;
  carrier_name: string;
  status: 'pre_approved';
}

interface Props {
  trip: Trip;
  vehicleReg: string;
  vehicleType?: string;
  driverName: string;
  driverPhone?: string;
  driverLicense?: string;
  companyName?: string;
  onConfirm: (values: GatePassFormValues) => void;
  onClose: () => void;
  isLoading?: boolean;
}

/** Format a datetime string for an <input type="datetime-local"> */
function toLocalDateTimeInput(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    // datetime-local needs "YYYY-MM-DDTHH:MM"
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/** Convert a datetime-local string back to ISO */
function fromLocalInput(val: string): string {
  if (!val) return new Date().toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const inputCls =
  'w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs ' +
  'text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none transition-colors';

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs font-semibold text-text-primary mb-1">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

export const GatePassCreateModal: React.FC<Props> = ({
  trip,
  vehicleReg,
  vehicleType,
  driverName,
  driverPhone,
  driverLicense,
  companyName,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  const [terminalName,   setTerminalName]   = useState(trip.destination_name || '');
  const [terminalGate,   setTerminalGate]   = useState('');
  const [windowStart,    setWindowStart]    = useState(toLocalDateTimeInput(trip.planned_departure));
  const [windowEnd,      setWindowEnd]      = useState(toLocalDateTimeInput(trip.planned_arrival));
  const [carrierName,    setCarrierName]    = useState(companyName || '');
  const [cargoWeight,    setCargoWeight]    = useState<string>(
    trip.cargo_weight_tonnes != null ? String(trip.cargo_weight_tonnes) : ''
  );
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!terminalName.trim()) {
      setError('Terminal name is required.');
      return;
    }
    if (!windowStart || !windowEnd) {
      setError('Validity window start and end are required.');
      return;
    }
    if (new Date(windowEnd) <= new Date(windowStart)) {
      setError('Valid Until must be after Valid From.');
      return;
    }
    setError('');

    const values: GatePassFormValues = {
      vehicle_id:          trip.vehicle_id,
      trip_id:             trip.id,
      vehicle_reg:         vehicleReg,
      vehicle_type:        vehicleType,
      driver_name:         driverName,
      driver_phone:        driverPhone,
      driver_license:      driverLicense,
      container_number:    trip.container_number,
      customs_seal_number: trip.customs_seal_number,
      cargo_type:          trip.cargo_type,
      cargo_weight_tonnes: cargoWeight ? parseFloat(cargoWeight) : undefined,
      terminal_name:       terminalName.trim(),
      terminal_gate:       terminalGate.trim(),
      time_window_start:   fromLocalInput(windowStart),
      time_window_end:     fromLocalInput(windowEnd),
      carrier_name:        carrierName.trim(),
      status:              'pre_approved',
    };
    onConfirm(values);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#250C77] flex items-center justify-center">
              <FileCheck size={15} className="text-[#ED642B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Issue Gate Pass</h3>
              <p className="text-[11px] text-text-tertiary">Verify terminal details before issuing the pass</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Vehicle / Driver (read-only summary) */}
          <div className="rounded-xl border border-border-default bg-bg-surface-raised/40 p-3.5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-1 flex items-center gap-1">
                <Truck size={9} /> Vehicle
              </p>
              <p className="font-mono text-xs font-bold text-text-primary">{vehicleReg}</p>
              {vehicleType && <p className="text-[10px] text-text-secondary mt-0.5">{vehicleType}</p>}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-1 flex items-center gap-1">
                <User size={9} /> Driver
              </p>
              <p className="text-xs font-semibold text-text-primary">{driverName}</p>
              {driverPhone && <p className="font-mono text-[10px] text-text-secondary mt-0.5">{driverPhone}</p>}
            </div>
            {(trip.container_number || trip.customs_seal_number) && (
              <div className="col-span-2 pt-2 border-t border-border-default/50 flex gap-3 flex-wrap">
                {trip.container_number && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                    <Container size={9} /> {trip.container_number}
                  </span>
                )}
                {trip.customs_seal_number && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
                    Seal: {trip.customs_seal_number}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Terminal fields — editable */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-1">
              <Building2 size={10} /> Terminal Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label required>Terminal Name</Label>
                <input
                  type="text"
                  value={terminalName}
                  onChange={e => setTerminalName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Kilindini Port Terminal 02"
                />
              </div>
              <div>
                <Label>Gate / Bay</Label>
                <input
                  type="text"
                  value={terminalGate}
                  onChange={e => setTerminalGate(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Gate A2"
                />
              </div>
              <div>
                <Label>Carrier / Company</Label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={e => setCarrierName(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Siginon Global Logistics"
                />
              </div>
            </div>
          </div>

          {/* Validity window */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-1">
              <Clock size={10} /> Validity Window
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Valid From</Label>
                <input
                  type="datetime-local"
                  value={windowStart}
                  onChange={e => setWindowStart(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <Label required>Valid Until</Label>
                <input
                  type="datetime-local"
                  value={windowEnd}
                  onChange={e => setWindowEnd(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Cargo weight */}
          <div>
            <Label>Cargo Weight (tonnes)</Label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={cargoWeight}
              onChange={e => setCargoWeight(e.target.value)}
              className={inputCls}
              placeholder="e.g. 28.5"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default bg-bg-surface-raised/40">
          <Button variant="ghost" size="small" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="small"
            icon={<FileCheck size={13} />}
            onClick={handleConfirm}
            loading={isLoading}
          >
            Issue Gate Pass
          </Button>
        </div>
      </div>
    </div>
  );
};
