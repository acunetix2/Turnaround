import React from 'react'
import { ArrowRight, LogOut } from 'lucide-react'

// ── LOGOS ──
export const TurnaroundLogo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <div className={`rounded-xl bg-gradient-to-br from-[#250C77] to-[#3D1BA8] p-1.5 flex items-center justify-center text-white shadow-md ${className}`}>
    <span className="font-bold text-xs tracking-tighter text-[#ED642B]">TR</span>
  </div>
)

export const SupabaseLogo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.35 1.5L2.75 14.25C2.45 14.6 2.7 15.15 3.15 15.15H11.5L10.65 22.5L21.25 9.75C21.55 9.4 21.3 8.85 20.85 8.85H12.5L13.35 1.5Z"
      fill="#3ECF8E"
    />
  </svg>
)

export const StripeLogo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <div className={`rounded-xl bg-[#635BFF] p-1.5 flex items-center justify-center text-white font-bold text-sm shadow-md ${className}`}>
    S
  </div>
)

export const TelematicsLogo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <div className={`rounded-xl bg-[#ED642B] p-1.5 flex items-center justify-center text-white font-bold text-xs shadow-md ${className}`}>
    GPS
  </div>
)

// ── LOGO PAIR ──
export const LogoPair: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}> = ({ left, right, className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-default bg-bg-surface-raised/80 shadow-sm">
        {left}
      </div>
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-tertiary shadow-xs">
        <ArrowRight size={12} />
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-default bg-bg-surface-raised/80 shadow-sm">
        {right}
      </div>
    </div>
  )
}

// ── ACCOUNT ROW ──
export const AccountRow: React.FC<{
  displayName: string
  action?: React.ReactNode
  className?: string
}> = ({ displayName, action, className = '' }) => {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface-raised/50 px-3.5 py-2.5 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#250C77] text-white text-xs font-semibold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-xs font-medium text-text-primary">{displayName}</span>
      </div>
      {action}
    </div>
  )
}

// ── SIGN OUT BUTTON ──
export const SignOutButton: React.FC<{
  onClick?: () => void
  label?: string
}> = ({ onClick, label = 'Sign out' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
    >
      <LogOut size={12} />
      <span>{label}</span>
    </button>
  )
}

// ── INTERSTITIAL SHELL ──
export interface InterstitialShellProps {
  logo?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const InterstitialShell: React.FC<InterstitialShellProps> = ({
  logo,
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div
      className={`w-full max-w-[420px] rounded-2xl border border-border-default bg-bg-surface p-6 shadow-xl space-y-6 ${className}`}
    >
      {logo && <div className="pt-2">{logo}</div>}
      <div className="text-center space-y-1.5">
        <h2 className="text-base font-semibold text-text-primary tracking-tight">{title}</h2>
        {description && (
          <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">{description}</p>
        )}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  )
}
