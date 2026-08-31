import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import { useTheme } from '../../lib/ThemeContext'
import {
  LayoutDashboard,
  Compass,
  Truck,
  MapPin,
  Brain,
  BarChart3,
  LogOut,
  Sparkles,
  Sliders,
  Sun,
  Moon,
  Search,
  Plus,
  Route,
  DollarSign,
  FileCheck,
} from 'lucide-react'
import { BrandLogo } from '../common/BrandLogo'
import { RouteProgressBar } from '../common/Loader'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '../ui/sidebar'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '../ui/Command'

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  highlight?: boolean
  badgeCount?: number
  badgeDanger?: boolean
}

function SidebarNavContent() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const [commandOpen, setCommandOpen] = useState(false)

  // Real backend metrics
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 30000,
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    staleTime: 30000,
  })

  // Deduplicate vehicles by registration_number
  const uniqueVehicles = React.useMemo(() => {
    if (!vehiclesData) return []
    const seen = new Set<string>()
    return vehiclesData.filter((v) => {
      const reg = v.registration_number.trim().toUpperCase()
      if (seen.has(reg)) return false
      seen.add(reg)
      return true
    })
  }, [vehiclesData])

  const delayedCount = dashboardStats?.trucks_delayed ?? 0
  const activeTrucks = dashboardStats?.active_trucks ?? 0
  const totalFleet = uniqueVehicles.length || (dashboardStats?.active_trucks ?? 0)
  const onTimePct = totalFleet > 0
    ? Math.round(((totalFleet - delayedCount) / totalFleet) * 100)
    : 0

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Map',
      path: '/map',
      icon: Compass,
      badgeCount: delayedCount > 0 ? delayedCount : activeTrucks > 0 ? activeTrucks : undefined,
      badgeDanger: delayedCount > 0,
    },
    { name: 'Trips', path: '/trips', icon: Route },
    { name: 'Gate Passes', path: '/gate-passes', icon: FileCheck },
    { name: 'Delay Charges', path: '/demurrage', icon: DollarSign },
    {
      name: 'Assets',
      path: '/vehicles',
      icon: Truck,
      badgeCount: totalFleet > 0 ? totalFleet : undefined,
    },
    { name: 'Stops', path: '/locations', icon: MapPin },
    { name: 'Delays', path: '/insights', icon: Brain },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Analyst', path: '/ai-advisor', icon: Sparkles },
    { name: 'Settings', path: '/settings', icon: Sliders },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleCommandSelect = (path: string) => {
    setCommandOpen(false)
    navigate(path)
  }

  return (
    <>
      {/* Sidebar Header */}
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <BrandLogo size={26} showText={!isCollapsed} />
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      {/* Quick Search */}
      {!isCollapsed && (
        <div className="px-3 pt-1">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-surface-raised/60 text-xs text-text-tertiary hover:border-text-tertiary hover:bg-bg-surface-raised transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search size={13} className="text-text-tertiary shrink-0" />
              <span>Search fleet...</span>
            </div>
            <span className="text-[10px] font-numeric px-1 py-0.5 rounded bg-bg-surface border border-border-default text-text-tertiary shrink-0">
              ⌘K
            </span>
          </button>
        </div>
      )}

      {/* Nav List */}
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <SidebarMenuItem key={item.path}>
                <NavLink to={item.path} className="block w-full">
                  <SidebarMenuButton
                    isActive={isActive}
                    variant={item.highlight ? 'highlight' : 'default'}
                    tooltip={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      size={15}
                      className={
                        isActive
                          ? 'text-white shrink-0'
                          : item.highlight
                          ? 'text-[#ED642B] shrink-0'
                          : 'text-text-tertiary shrink-0'
                      }
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                    {!isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <SidebarMenuBadge
                        className={
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeDanger
                            ? 'bg-status-danger-bg text-status-danger border border-status-danger/30'
                            : 'bg-bg-surface-raised text-text-tertiary'
                        }
                      >
                        {item.badgeCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </NavLink>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Operational SLA Meter */}
      {!isCollapsed && (
        <div className="mx-3 mb-2 rounded-xl border border-border-default bg-bg-surface-raised/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="font-medium text-text-secondary">Turnaround Health</span>
            <span
              className={`font-numeric font-bold ${
                onTimePct >= 80
                  ? 'text-status-good'
                  : onTimePct >= 60
                  ? 'text-status-warning'
                  : 'text-status-danger'
              }`}
            >
              {onTimePct}%
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                onTimePct >= 80
                  ? 'bg-status-good'
                  : onTimePct >= 60
                  ? 'bg-status-warning'
                  : 'bg-status-danger'
              }`}
              style={{ width: `${onTimePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Sidebar Footer */}
      <SidebarFooter>
        <div
          className={`flex items-center gap-2 rounded-xl bg-bg-surface-raised/60 p-2 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[#250C77] text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-text-primary truncate">{user?.name || '—'}</p>
                <p className="text-[9.5px] text-text-tertiary truncate">{user?.company_name || '—'}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1 rounded-md text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {isDark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 rounded-md text-text-tertiary hover:text-status-danger transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>

      {/* Global ⌘K Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <Command className="rounded-2xl border border-border-default shadow-2xl bg-bg-surface overflow-hidden">
          <CommandInput placeholder="Search fleet assets, stops, or run diagnostics..." />
          <CommandList>
            <CommandEmpty>No fleet matches or commands found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              {navItems.map((item) => (
                <CommandItem
                  key={item.path}
                  value={item.name}
                  onSelect={() => handleCommandSelect(item.path)}
                >
                  <item.icon className="mr-2.5 h-4 w-4 text-[#ED642B]" />
                  <span>{item.name}</span>
                  {item.path === '/dashboard' && <CommandShortcut>⌘D</CommandShortcut>}
                  {item.path === '/map' && <CommandShortcut>⌘M</CommandShortcut>}
                  {item.path === '/settings' && <CommandShortcut>⌘S</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              <CommandItem
                value="Register Asset Truck"
                onSelect={() => handleCommandSelect('/vehicles')}
              >
                <Plus className="mr-2.5 h-4 w-4 text-[#ED642B]" />
                <span>Register Fleet Asset</span>
              </CommandItem>
              <CommandItem
                value="AI Diagnostic Advisor"
                onSelect={() => handleCommandSelect('/ai-advisor')}
              >
                <Sparkles className="mr-2.5 h-4 w-4 text-[#250C77]" />
                <span>Run AI Corridor Performance Diagnostic</span>
              </CommandItem>
            </CommandGroup>

            {uniqueVehicles.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Fleet Assets">
                  {uniqueVehicles.slice(0, 8).map((vh) => (
                    <CommandItem
                      key={vh.id}
                      value={`${vh.registration_number} ${vh.vehicle_type} ${vh.driver_name || ''}`}
                      onSelect={() => handleCommandSelect(`/vehicles/${vh.id}`)}
                    >
                      <Truck className="mr-2.5 h-4 w-4 text-[#250C77]" />
                      <div className="flex items-center justify-between w-full">
                        <span className="font-numeric font-medium">{vh.registration_number}</span>
                        <span className="text-[10px] text-text-tertiary">{vh.vehicle_type}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

export const AppShell: React.FC = () => {
  const [isNavigating, setIsNavigating] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsNavigating(true)
    const t = setTimeout(() => setIsNavigating(false), 300)
    return () => clearTimeout(t)
  }, [location.pathname])

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-screen overflow-hidden text-text-primary bg-bg-canvas">
        <RouteProgressBar isLoading={isNavigating} />
        <Sidebar collapsible="icon">
          <SidebarNavContent />
        </Sidebar>
        <SidebarInset>
          <div className={`flex-1 min-w-0 overflow-y-auto bg-bg-canvas ${
            location.pathname === '/map' ? 'p-0 overflow-hidden' : 'p-4 sm:p-6'
          }`}>
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
