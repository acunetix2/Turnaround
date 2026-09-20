import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Landing } from '../auth/Landing';
import { Login } from '../auth/Login';
import { Signup } from '../auth/Signup';
import { ConfirmEmail } from '../auth/ConfirmEmail';
import { ForgotPassword } from '../auth/ForgotPassword';
import { DashboardReference as Dashboard } from '../features/dashboard/DashboardReference';
import { LiveMap } from '../features/live-map/LiveMap';
import { Vehicles } from '../features/vehicles/Vehicles';
import { VehicleDetail } from '../features/vehicles/VehicleDetail';
import { Locations } from '../features/locations/Locations';
import { LocationDetail } from '../features/locations/LocationDetail';
import { Insights } from '../features/insights/Insights';
import { Analytics } from '../features/analytics/Analytics';
import { Settings } from '../features/settings/Settings';
import { AccountSettings } from '../features/settings/AccountSettings';
import { AIAdvisor } from '../features/ai-advisor/AIAdvisor';
import { Trips } from '../features/trips/Trips';
import { TripDetail } from '../features/trips/TripDetail';
import { Demurrage as DelayCharges } from '../features/demurrage/Demurrage';
import { GatePassPage } from '../features/gate-pass/GatePassPage';
import { GatePassList } from '../features/gate-pass/GatePassList';
import { UserManagement } from '../features/users/UserManagement';
import { DriverRoster } from '../features/drivers/DriverRoster';
import { Notifications } from '../features/notifications/Notifications';
import { CompanyConfig } from '../features/admin/CompanyConfig';
import { MaintenanceFuel } from '../features/maintenance/MaintenanceFuel';
import { PrivacyPolicyPage } from '../features/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../features/legal/TermsOfServicePage';
import { AboutPage } from '../features/legal/AboutPage';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';
import type { UserRole } from '../lib/api/types';

// Role sets
const ADMIN:         UserRole[] = ['admin'];
const ADMIN_MANAGER: UserRole[] = ['admin', 'fleet_manager'];
const OPERATIONS:    UserRole[] = ['admin', 'fleet_manager', 'dispatcher', 'operations_manager', 'supervisor'];
const ALL_STAFF:     UserRole[] = ['admin', 'fleet_manager', 'dispatcher', 'operations_manager', 'maintenance_technician', 'supervisor', 'driver', 'viewer', 'analyst'];

// Wrap element in a role-checked ProtectedRoute
function guard(element: React.ReactElement, roles: UserRole[]) {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: '/',                element: <Landing />,        errorElement: <RouteErrorBoundary /> },
  { path: '/login',           element: <Login />,          errorElement: <RouteErrorBoundary /> },
  { path: '/signup',          element: <Signup />,         errorElement: <RouteErrorBoundary /> },
  { path: '/confirm-email',  element: <ConfirmEmail />,   errorElement: <RouteErrorBoundary /> },
  { path: '/forgot-password', element: <ForgotPassword />, errorElement: <RouteErrorBoundary /> },
  { path: '/privacy',         element: <PrivacyPolicyPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/terms',           element: <TermsOfServicePage />, errorElement: <RouteErrorBoundary /> },
  { path: '/about',           element: <AboutPage />,           errorElement: <RouteErrorBoundary /> },

  // ── Authenticated app shell ──────────────────────────────────────────────
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [

      // ── General (all authenticated users) ────────────────────────────────
      { path: '/dashboard',        element: <Dashboard />,                              errorElement: <RouteErrorBoundary /> },
      { path: '/notifications',    element: <Notifications />,                         errorElement: <RouteErrorBoundary /> },
      { path: '/account',          element: <AccountSettings />,                       errorElement: <RouteErrorBoundary /> },

      // ── Corridor Tracker (all staff) ──────────────────────────────────────
      { path: '/map',              element: guard(<LiveMap />, ALL_STAFF),              errorElement: <RouteErrorBoundary /> },

      // ── Operations (dispatchers and above) ───────────────────────────────
      { path: '/trips',            element: guard(<Trips />, OPERATIONS),              errorElement: <RouteErrorBoundary /> },
      { path: '/trips/:id',        element: guard(<TripDetail />, OPERATIONS),         errorElement: <RouteErrorBoundary /> },
      { path: '/gate-passes',      element: guard(<GatePassList />, OPERATIONS),       errorElement: <RouteErrorBoundary /> },
      { path: '/gate-pass',        element: guard(<GatePassPage />, OPERATIONS),       errorElement: <RouteErrorBoundary /> },
      { path: '/gate-pass/:id',    element: guard(<GatePassPage />, OPERATIONS),       errorElement: <RouteErrorBoundary /> },
      { path: '/demurrage',        element: guard(<DelayCharges />, OPERATIONS),       errorElement: <RouteErrorBoundary /> },

      // ── Fleet management (fleet manager and above) ────────────────────────
      { path: '/vehicles',         element: guard(<Vehicles />, ADMIN_MANAGER),        errorElement: <RouteErrorBoundary /> },
      { path: '/vehicles/:id',     element: guard(<VehicleDetail />, ADMIN_MANAGER),   errorElement: <RouteErrorBoundary /> },
      { path: '/admin/maintenance', element: guard(<MaintenanceFuel />, ['admin', 'fleet_manager', 'maintenance_technician', 'supervisor']), errorElement: <RouteErrorBoundary /> },
      { path: '/locations',        element: guard(<Locations />, ADMIN_MANAGER),       errorElement: <RouteErrorBoundary /> },
      { path: '/locations/:id',    element: guard(<LocationDetail />, ADMIN_MANAGER),  errorElement: <RouteErrorBoundary /> },

      // ── Analytics & Insights (all staff) ─────────────────────────────────
      { path: '/insights',         element: guard(<Insights />, ALL_STAFF),            errorElement: <RouteErrorBoundary /> },
      { path: '/analytics',        element: guard(<Analytics />, ALL_STAFF),           errorElement: <RouteErrorBoundary /> },
      { path: '/ai-advisor',       element: guard(<AIAdvisor />, ALL_STAFF),           errorElement: <RouteErrorBoundary /> },

      // ── Settings (fleet manager and above) ────────────────────────────────
      { path: '/settings',         element: guard(<Settings />, ADMIN_MANAGER),        errorElement: <RouteErrorBoundary /> },

      // ── /admin/* — admin only ─────────────────────────────────────────────
      { path: '/admin/team',       element: guard(<UserManagement />, ADMIN),          errorElement: <RouteErrorBoundary /> },
      { path: '/admin/drivers',    element: guard(<DriverRoster />, ADMIN),            errorElement: <RouteErrorBoundary /> },
      { path: '/admin/config',     element: guard(<CompanyConfig />, ADMIN),           errorElement: <RouteErrorBoundary /> },

      // Legacy redirects so old bookmarks don't 404
      { path: '/users',            element: <Navigate to="/admin/team" replace /> },
    ],
  },

  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
