import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { useTheme } from '../../lib/ThemeContext';
import {
  LayoutDashboard, Compass, Truck, MapPin, Brain, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Sparkles, Sliders,
  Sun, Moon, Search
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { RouteProgressBar } from '../common/Loader';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  highlight?: boolean;
  badgeCount?: number;
  badgeDanger?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // ── REAL DATA from backend ──
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    staleTime: 30000,
  });

  // Derived from real data — no hardcoded numbers
  const delayedCount = dashboardStats?.trucks_delayed ?? 0;
  const activeTrucks = dashboardStats?.active_trucks ?? 0;
  const totalFleet   = vehiclesData?.length ?? 0;
  const stationaryCount = totalFleet - activeTrucks - delayedCount;
  const atStopCount = stationaryCount > 0 ? stationaryCount : 0;
  const onTimePct   = totalFleet > 0
    ? Math.round(((totalFleet - delayedCount) / totalFleet) * 100)
    : 0;

  useEffect(() => {
    setIsNavigating(true);
    const t = setTimeout(() => setIsNavigating(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const navGroups: NavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { name: 'Dashboard',         path: '/dashboard', icon: LayoutDashboard },
        {
          name: 'Live Map', path: '/map', icon: Compass,
          badgeCount:  delayedCount > 0 ? delayedCount : activeTrucks > 0 ? activeTrucks : undefined,
          badgeDanger: delayedCount > 0
        },
        {
          name: 'Trucks & GPS', path: '/vehicles', icon: Truck,
          badgeCount: totalFleet > 0 ? totalFleet : undefined
        },
        { name: 'Stops & Terminals', path: '/locations', icon: MapPin },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Delay Reports',      path: '/insights',   icon: Brain },
        { name: 'Route Performance',  path: '/analytics',  icon: BarChart3 },
        { name: 'Operations Analyst', path: '/ai-advisor', icon: Sparkles, highlight: true },
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Configuration', path: '/settings', icon: Sliders },
      ]
    },
  ];

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isDark = theme === 'dark';

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-text-primary"
      style={{ backgroundColor: 'var(--color-bg-canvas)' }}
    >
      <RouteProgressBar isLoading={isNavigating} />

      {/* ── SIDEBAR ── */}
      <aside
        className={`flex flex-col shrink-0 border-r border-border-default transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-[235px]'
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #180B4A 0%, #0E0530 100%)'
            : '#FFFFFF',
        }}
      >
        {/* Top: Logo + collapse */}
        <div className={`flex items-center h-14 px-3.5 border-b border-border-default shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <BrandLogo size={28} showText={!collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Expand when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto mt-2 mb-1 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer" title="Expand sidebar">
            <ChevronRight size={14} />
          </button>
        )}

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${searchFocused ? 'border-[#ED642B] bg-bg-surface' : 'border-border-default bg-bg-surface-raised/60 text-text-tertiary'}`}>
              <Search size={13} className="text-text-tertiary shrink-0" />
              <input
                type="text"
                placeholder="Search fleet..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-transparent border-none p-0 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
              <span className="text-[10px] font-numeric px-1 py-0.5 rounded bg-bg-surface border border-border-default text-text-tertiary shrink-0">⌘K</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary px-2 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group flex items-center rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                        collapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                      } ${
                        isActive
                          ? 'bg-[#ED642B] text-white shadow-md shadow-[#ED642B]/25'
                          : item.highlight
                          ? 'text-[#ED642B] bg-[#ED642B]/10 hover:bg-[#ED642B]/20 border border-[#ED642B]/30'
                          : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            size={15}
                            className={`shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-[#ED642B]' : 'text-text-tertiary group-hover:text-text-primary'} transition-colors`}
                          />
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </div>
                        {!collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <span className={`font-numeric text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badgeDanger
                              ? 'bg-status-danger-bg text-status-danger border border-status-danger/30'
                              : 'bg-bg-surface-raised text-text-tertiary'
                          }`}>
                            {item.badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Fleet Status Breakdown — all from real API data */}
          {!collapsed && (
            <div className="pt-2 border-t border-border-default/60 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary px-2">Fleet Status</p>
              <div className="space-y-1 px-2 text-[11px] font-semibold">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-good" />In Transit</span>
                  <span className="font-numeric font-bold text-text-primary">{activeTrucks}</span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-warning" />At Stop</span>
                  <span className="font-numeric font-bold text-text-primary">{atStopCount}</span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-status-danger" />Delayed</span>
                  <span className="font-numeric font-bold text-status-danger">{delayedCount}</span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Turnaround rate card */}
        {!collapsed && totalFleet > 0 && (
          <div className="mx-2.5 mb-2 rounded-xl border border-border-default bg-bg-surface-raised/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-text-primary">Turnaround Rate</span>
              <span className={`text-[10px] font-numeric font-bold ${onTimePct >= 80 ? 'text-status-good' : onTimePct >= 60 ? 'text-status-warning' : 'text-status-danger'}`}>
                {onTimePct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${onTimePct >= 80 ? 'bg-status-good' : onTimePct >= 60 ? 'bg-status-warning' : 'bg-status-danger'}`}
                style={{ width: `${onTimePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[9.5px] font-numeric text-text-tertiary">
              <span>{onTimePct}% On-Time</span>
              <span>{delayedCount} Delayed</span>
            </div>
          </div>
        )}

        {/* User profile footer */}
        <div className="border-t border-border-default p-2.5 shrink-0">
          <div className={`flex items-center gap-2 rounded-xl bg-bg-surface-raised/80 p-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-[#250C77] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-text-primary truncate">{user?.name || '—'}</p>
                  <p className="text-[9.5px] text-text-tertiary truncate">{user?.company_name || '—'}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleTheme} className="p-1 rounded-md text-text-tertiary hover:text-text-primary transition-colors cursor-pointer" title="Toggle Theme">
                  {isDark ? <Sun size={13} /> : <Moon size={13} />}
                </button>
                <button type="button" onClick={handleLogout} className="p-1 rounded-md text-text-tertiary hover:text-status-danger transition-colors cursor-pointer" title="Sign out">
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6"
        style={{ backgroundColor: 'var(--color-bg-canvas)' }}
      >
        <Outlet />
      </main>
    </div>
  );
};
