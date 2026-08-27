import React from 'react';

interface SkeletonProps {
  className?: string;
  /** Pulse animation variant */
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
}) => {
  const base =
    'animate-pulse bg-white/[0.07] rounded';
  const variantClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-3' : 'rounded-xl';

  return <div className={[base, variantClass, className].join(' ')} />;
};

/** Pre-built skeleton layout for a stat card row */
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-[#1A1C21] border border-white/[0.08] rounded-[20px] p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-2 w-40" />
  </div>
);

/** Pre-built skeleton for a table row */
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="border-b border-white/[0.06]">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-3" />
      </td>
    ))}
  </tr>
);
