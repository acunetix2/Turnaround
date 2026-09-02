/**
 * PageTabs — underline tab bar matching the Supabase-style breadcrumb/tab design.
 *
 * Usage:
 *   <PageTabs
 *     tabs={[{ id: 'overview', label: 'Overview', icon: <LayoutDashboard size={13} /> }]}
 *     active="overview"
 *     onChange={setTab}
 *   />
 */
import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface PageTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** Slot for right-side actions rendered flush-right in the same bar */
  actions?: React.ReactNode;
}

export const PageTabs: React.FC<PageTabsProps> = ({
  tabs,
  active,
  onChange,
  className = '',
  actions,
}) => (
  <div className={`flex items-center justify-between border-b border-border-default ${className}`}>
    {/* Tab list */}
    <div className="flex items-center gap-0 overflow-x-auto scrollbar-none -mb-px">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`
              group flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold
              border-b-2 transition-all cursor-pointer shrink-0 select-none
              ${isActive
                ? 'border-[#ED642B] text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border-default'
              }
            `}
          >
            {tab.icon && (
              <span className={`transition-colors ${isActive ? 'text-[#ED642B]' : 'text-text-tertiary group-hover:text-text-secondary'}`}>
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`
                inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] font-bold
                ${isActive
                  ? 'bg-[#ED642B]/15 text-[#ED642B]'
                  : 'bg-bg-surface-raised text-text-tertiary'
                }
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>

    {/* Right-side actions */}
    {actions && (
      <div className="flex items-center gap-2 pb-px pl-4 shrink-0">
        {actions}
      </div>
    )}
  </div>
);
