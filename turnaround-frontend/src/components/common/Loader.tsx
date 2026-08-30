import React from 'react';
import { Truck } from 'lucide-react';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'brand' | 'cyan' | 'white' | 'amber';
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'cyan'
}) => {
  const sizeMap = {
    xs: 'h-3.5 w-3.5 border',
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-[2.5px]',
  };

  const colorMap = {
    brand: 'border-brand-500/20 border-t-brand-500',
    cyan: 'border-cyan-500/20 border-t-brand-400',
    white: 'border-white/20 border-t-white',
    amber: 'border-yellow-500/20 border-t-yellow-400',
  };

  return (
    <div
      className={`inline-block rounded-full animate-spin ${sizeMap[size]} ${colorMap[color]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export interface RouteProgressBarProps {
  isLoading?: boolean;
}

export const RouteProgressBar: React.FC<RouteProgressBarProps> = ({ isLoading = true }) => {
  if (!isLoading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 overflow-hidden bg-bg-surface-raised">
      <div className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-cyan animate-route-progress w-full" />
    </div>
  );
};

export interface CorridorLoaderProps {
  message?: string;
  subtext?: string;
  fullscreen?: boolean;
}

export const CorridorLoader: React.FC<CorridorLoaderProps> = ({
  message = 'Synchronizing Corridor Telemetry',
  subtext = 'Connecting GPS satellites & geofence listeners...',
  fullscreen = false,
}) => {
  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-canvas/95 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center p-12 min-h-[300px] w-full';

  return (
    <div className={containerClass}>
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer subtle radar ring */}
        <div className="h-20 w-20 rounded-full border border-brand-400/20 animate-ping absolute opacity-40" />
        
        {/* Rotating radar sweep */}
        <div className="h-16 w-16 rounded-full border border-brand-400/30 border-t-brand-400 animate-spin absolute" />

        {/* Center glowing logo beacon */}
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 relative z-10">
          <Truck size={20} className="text-white" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
          {message}
        </h3>
        <p className="text-[11px] text-text-tertiary font-numeric">
          {subtext}
        </p>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = ''
}) => {
  return (
    <div className={`p-4 rounded-xl border border-border-default bg-bg-surface space-y-3 animate-pulse ${className}`}>
      <div className="h-4 bg-bg-surface-raised rounded w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-bg-surface-raised rounded w-full opacity-60" />
      ))}
    </div>
  );
};
