import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a hover lift effect for interactive cards */
  interactive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-[#1A1C21] border border-white/[0.14] rounded-[20px]',
        'shadow-[0_12px_32px_rgba(0,0,0,0.40)]',
        interactive
          ? 'cursor-pointer hover:border-white/[0.22] hover:bg-[#1E2028] transition-colors duration-150'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={['flex items-start justify-between px-5 pt-5 pb-3', className].join(' ')}>
    <div>
      <h3 className="text-sm font-semibold text-[#F4F5F7] tracking-tight">{title}</h3>
      {subtitle && (
        <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0 ml-4">{action}</div>}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={['px-5 pb-5', className].join(' ')}>{children}</div>
);
