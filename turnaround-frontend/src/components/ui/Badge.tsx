import React from 'react';

type BadgeVariant = 'danger' | 'warning' | 'good' | 'neutral' | 'brand';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  /** Accessibility: always pair with text label — never rely on color alone */
  label?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  danger:  'bg-[rgba(240,70,76,0.14)]  text-[#F0464C]  border border-[#F0464C]/20',
  warning: 'bg-[rgba(245,165,36,0.12)] text-[#F5A524]  border border-[#F5A524]/20',
  good:    'bg-[rgba(34,197,94,0.12)]  text-[#22C55E]  border border-[#22C55E]/20',
  neutral: 'bg-white/[0.06]            text-[#9CA3AF]  border border-white/[0.08]',
  brand:   'bg-[#4F7CFF]/15            text-[#6E92FF]  border border-[#4F7CFF]/25',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  className = '',
  label,
}) => {
  return (
    <span
      role="status"
      aria-label={label}
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'font-[family-name:var(--font-ui)]',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {icon && <span className="shrink-0 w-3 h-3">{icon}</span>}
      {children}
    </span>
  );
};
