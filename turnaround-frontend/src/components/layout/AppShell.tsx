import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import type { UserRole } from '../../lib/api/types';
import {
  LayoutDashboard,
  Map,
  Truck,
  MapPin,
  Brain,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Sliders
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const AppShell: React.FC = () => {
  const { user, role, logout, simulateRole, isMockMode } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Fleet Map', path: '/map', icon: Map },
    { name: 'Vehicles', path: '/vehicles', icon: Truck },
    { name: 'Locations', path: '/locations', icon: MapPin },
    { name: 'Insights', path: '/insights', icon: Brain },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Configuration', path: '/settings', icon: Sliders },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (r: UserRole | null): string => {
    if (!r) return '';
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-canvas text-text-primary">
      {/* Sidebar Nav */}
      <aside
        className={`flex flex-col border-r border-border-default bg-bg-surface transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo & Header */}
        <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <BrandLogo size={32} showText={!sidebarCollapsed} textSize="text-base" />
          </Link>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="rounded p-1 hover:bg-bg-surface-raised text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed expansion button */}
        {sidebarCollapsed && (
          <div className="flex justify-center py-2.5">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="rounded p-1 hover:bg-bg-surface-raised text-text-secondary hover:text-text-primary"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-2.5 py-4">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white font-semibold'
                    : 'text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary'
                }`
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User / Org Bottom Indicator */}
        <div className="border-t border-border-default p-3 bg-bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-border-strong text-text-secondary">
              <User size={18} />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-text-primary">
                  {user?.name || 'Loading user...'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Shield size={10} className="text-brand-400" />
                  <span className="font-numeric text-[10px] text-brand-400 font-medium">
                    {getRoleLabel(role)}
                  </span>
                </div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-bg-surface border border-border-default py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-canvas hover:text-status-danger hover:border-status-danger/40 transition-colors"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-default bg-bg-surface px-6">
          <div className="flex items-center gap-3">
            <span className="font-ui text-sm font-semibold tracking-wide text-text-secondary uppercase">
              Fleet Operations
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="font-numeric text-xs font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
              Turnaround Logistics Ltd
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time system telemetry status */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-['IBM_Plex_Mono'] text-[11px] font-semibold text-emerald-400">TELEMETRY LIVE</span>
            </div>
          </div>
        </header>

        {/* Content Outlet Box */}
        <main className="flex-1 overflow-y-auto bg-bg-canvas p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
