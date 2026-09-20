import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import { useTheme } from '../../lib/ThemeContext'
import { useCompany } from '../../lib/CompanyContext'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import {
  LayoutDashboard,
  Compass,
  Truck,
  UserRound,
  AlertOctagon,
  BarChart3,
  LogOut,
  Sliders,
  Sun,
  Moon,
  Search,
  Plus,
  Route,
  DollarSign,
  FileCheck,
  Users,
  UserCircle,
  Warehouse,
  BotMessageSquare,
  Bell,
  Building2,
  Download,
  Check,
  ArrowRight,
  X,
  Wrench,
} from 'lucide-react'
import { BrandLogo } from '../common/BrandLogo'
import { RouteProgressBar } from '../common/Loader'
import { CompanyWelcome } from '../common/CompanyWelcome'
import { formatDateTime } from '../../lib/format'
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

const TopAppBar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { config: companyConfig } = useCompany()
  const queryClient = useQueryClient()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const pageTitle = location.pathname === '/ai-advisor' ? 'AI Analyst' : 'Turnaround Operations'
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'navbar'],
    queryFn: () => apiClient.getNotifications({ limit: 8 }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
  const notifications = notificationsData?.items ?? []
  const unreadNotifications = notificationsData?.unread ?? 0

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <header className="sticky top-0 z-40 flex min-h-[72px] items-center gap-4 border-b border-border-default/80 bg-bg-surface/90 px-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {companyConfig?.logo_url ? (
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-white sm:flex">
            <img src={companyConfig.logo_url} alt="company logo" className="h-full w-full object-contain p-1" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-text-primary">{pageTitle}</p>
          <p className="hidden truncate text-[11px] text-text-secondary sm:block">Smart insights. Smarter logistics.</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <label className="hidden items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-tertiary md:flex md:w-56">
          <Search size={14} />
          <input
            aria-label="Search anything"
            placeholder="Search anything..."
            className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate('/dashboard')
            }}
          />
          <span className="text-[10px]">⌘K</span>
        </label>
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative cursor-pointer p-2 text-text-secondary transition-colors hover:text-text-primary"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={15} className={unreadNotifications > 0 ? 'animate-notification-bell' : ''} />
            {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED642B] px-1 text-[9px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-[#ED642B]" />
                  <div>
                  <p className="text-sm font-bold text-text-primary">Notifications</p>
                  <p className="text-[10px] text-text-tertiary">{unreadNotifications} unread</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifications > 0 && <button type="button" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="text-[10px] font-bold text-[#ED642B] hover:underline disabled:opacity-50">Mark all read</button>}
                  <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" title="Close" className="rounded-md p-1 text-text-tertiary hover:bg-bg-surface-raised hover:text-text-primary"><X size={15} /></button>
                </div>
              </div>
              <div className="max-h-[390px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center"><Bell size={22} className="mx-auto mb-2 text-text-tertiary opacity-40" /><p className="text-xs font-semibold text-text-secondary">No notifications yet</p></div>
                ) : notifications.map((notification: any) => (
                  <div key={notification.id} className={`border-b border-border-default px-4 py-3 last:border-b-0 ${notification.read ? 'opacity-60' : 'bg-[#ED642B]/[0.04]'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-text-tertiary/40' : 'bg-[#ED642B]'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-text-primary">{notification.title}</p><span className="shrink-0 text-[9px] text-text-tertiary">{formatDateTime(notification.created_at)}</span></div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{notification.description}</p>
                        <div className="mt-2 flex items-center gap-3">
                          {notification.link && <Link to={notification.link} onClick={() => setNotificationsOpen(false)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ED642B]">View <ArrowRight size={10} /></Link>}
                          {!notification.read && <button type="button" onClick={() => markReadMutation.mutate(notification.id)} disabled={markReadMutation.isPending} className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-tertiary hover:text-text-primary disabled:opacity-50"><Check size={10} /> Mark read</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border-default p-2"><button type="button" onClick={() => { setNotificationsOpen(false); navigate('/notifications') }} className="flex w-full items-center justify-center gap-1 rounded-lg bg-bg-surface-raised px-3 py-2 text-[11px] font-bold text-text-primary hover:text-[#ED642B]">View all notifications <ArrowRight size={12} /></button></div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="hidden items-center gap-1.5 rounded-lg border border-[#250C77] bg-[#250C77] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#1d095d] sm:flex"
        >
          <Download size={13} />
          Export Report
        </button>
        <div className="hidden min-w-0 text-right lg:block">
          <p className="max-w-28 truncate text-[11px] font-semibold text-text-primary">{user?.name || 'Operator'}</p>
          <p className="text-[10px] text-text-tertiary">{companyConfig?.name || 'Turnaround'}</p>
        </div>
      </div>
    </header>
  )
}

function SidebarNavContent() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const { state } = useSidebar()
  const { toast } = useToast()
  const isCollapsed = state === 'collapsed'
  const isAdmin = user?.role === 'admin'
  const { config: companyConfig } = useCompany()

  const [commandOpen, setCommandOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Real backend metrics
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    staleTime: 60_000,
  })

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    staleTime: 60_000,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread_count'],
    queryFn: () => apiClient.getNotifications({ unread_only: true, limit: 1 }),
    staleTime: 60_000,
  })
  const unreadNotifCount = notifData?.unread ?? 0

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
    { name: 'Dashboard',        path: '/dashboard',     icon: LayoutDashboard },
    {
      name: 'Corridor Tracker',
      path: '/map',
      icon: Compass,
      badgeCount: delayedCount > 0 ? delayedCount : activeTrucks > 0 ? activeTrucks : undefined,
      badgeDanger: delayedCount > 0,
    },
    // ── Operations ──────────────────────────────────────────────────────────
    { name: 'Trips',            path: '/trips',         icon: Route },
    { name: 'Gate Passes',      path: '/gate-passes',   icon: FileCheck },
    { name: 'Delay Charges',    path: '/demurrage',     icon: DollarSign },
    // ── Fleet (fleet_manager+) ───────────────────────────────────────────
    ...(['admin','fleet_manager'].includes(user?.role || '') ? [
      { name: 'Carrier Assets',  path: '/vehicles',     icon: Truck, badgeCount: totalFleet > 0 ? totalFleet : undefined },
      { name: 'Freight Stations', path: '/locations',   icon: Warehouse },
      ...(!isAdmin ? [{ name: 'Maintenance & Fuel', path: '/admin/maintenance', icon: Wrench }] : []),
    ] : []),
    // ── Analytics (all staff) ────────────────────────────────────────────
    { name: 'Delay Alerts',     path: '/insights',      icon: AlertOctagon },
    { name: 'Analytics',        path: '/analytics',     icon: BarChart3 },
    { name: 'Fleet AI',         path: '/ai-advisor',    icon: BotMessageSquare },
    { name: 'Notifications',    path: '/notifications', icon: Bell, badgeCount: unreadNotifCount > 0 ? unreadNotifCount : undefined, badgeDanger: unreadNotifCount > 0 },
    // ── Settings (fleet_manager+) ────────────────────────────────────────
    ...(['admin','fleet_manager'].includes(user?.role || '') ? [
      { name: 'Settings',        path: '/settings',     icon: Sliders },
    ] : []),
  ]

  const adminNavItems: NavItem[] = isAdmin ? [
    { name: 'Company Executives', path: '/admin/team',        icon: Users },
    { name: 'Drivers & Staff',  path: '/admin/drivers',     icon: UserRound },
    { name: 'Maintenance & Fuel', path: '/admin/maintenance', icon: Wrench },
    { name: 'Configuration',    path: '/admin/config',      icon: Building2 },
  ] : []

  const handleLogout = async () => {
    try {
      await logout()
      setShowLogoutModal(false)
      toast({ variant: 'success', title: 'Signed out successfully', message: 'Your Turnaround session has ended.' })
      navigate('/login', { replace: true })
    } catch (error) {
      toast({ variant: 'error', title: 'Sign out failed', message: error instanceof Error ? error.message : 'Please try again.' })
    }
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
        {/* Company overview — shown when expanded */}
        {!isCollapsed && companyConfig && (
          <div className="mt-2 mx-1 px-2.5 py-2 rounded-lg bg-[#250C77]/8 border border-[#250C77]/15 flex items-center gap-2.5">
            {companyConfig.logo_url ? (
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-[#250C77]/10 bg-white/80 shadow-sm shrink-0">
                <img src={companyConfig.logo_url} alt="company logo" className="h-full w-full object-contain p-1" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-md bg-[#250C77]/20 flex items-center justify-center shrink-0">
                <Building2 size={14} className="text-[#250C77]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-text-primary truncate">{companyConfig.name}</p>
              <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                {companyConfig.address || [companyConfig.city, companyConfig.country].filter(Boolean).join(', ') || 'Company address not set'}
              </p>
            </div>
          </div>
        )}
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
          {adminNavItems.length > 0 && (
            <>
              {!isCollapsed && <li className="mt-3 border-t border-border-default px-3 pb-1 pt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">Administration</li>}
              {adminNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.path}>
                    <NavLink to={item.path} className="block w-full">
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={isCollapsed ? item.name : undefined}
                      >
                        <item.icon size={15} className={isActive ? 'text-white shrink-0' : 'text-text-tertiary shrink-0'} />
                        {!isCollapsed && <span>{item.name}</span>}
                      </SidebarMenuButton>
                    </NavLink>
                  </SidebarMenuItem>
                )
              })}
            </>
          )}
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
                <p className="text-[9.5px] text-text-tertiary truncate">{companyConfig?.name || user?.company_name || '—'}</p>
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
                  onClick={() => navigate('/account')}
                  className="p-1 rounded-md text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                  title="Account Settings"
                >
                  <UserCircle size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="p-1 rounded-md text-text-tertiary hover:text-status-danger transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
        </div>
      </SidebarFooter>

      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign out of Turnaround?"
        subtitle="Your active session will be ended on this device."
        width="sm"
      >
        <div className="flex items-center gap-3">
          <BrandLogo size={34} showText={false} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">Sign out?</p>
            <p className="text-[11px] text-text-secondary truncate">{user?.name || 'Current user'}</p>
            <p className="text-[10px] text-text-tertiary truncate">{user?.email || ''}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setShowLogoutModal(false)} className="rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleLogout} className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 cursor-pointer">
            Sign out
          </button>
        </div>
      </Modal>

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
                <BotMessageSquare className="mr-2.5 h-4 w-4 text-[#250C77]" />
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
        <CompanyWelcome />
        <RouteProgressBar isLoading={isNavigating} />
        <Sidebar collapsible="icon">
          <SidebarNavContent />
        </Sidebar>
        <SidebarInset className="bg-bg-canvas">
          {location.pathname !== '/map' && <TopAppBar />}
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
