import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Landing } from '../auth/Landing';
import { Login } from '../auth/Login';
import { Signup } from '../auth/Signup';
import { ForgotPassword } from '../auth/ForgotPassword';
import { Dashboard } from '../features/dashboard/Dashboard';
import { LiveMap } from '../features/live-map/LiveMap';
import { Vehicles } from '../features/vehicles/Vehicles';
import { VehicleDetail } from '../features/vehicles/VehicleDetail';
import { Locations } from '../features/locations/Locations';
import { LocationDetail } from '../features/locations/LocationDetail';
import { Insights } from '../features/insights/Insights';
import { Analytics } from '../features/analytics/Analytics';
import { Settings } from '../features/settings/Settings';
import { RouteErrorBoundary } from '../components/common/RouteErrorBoundary';

export const router = createBrowserRouter([
  // Public marketing & auth routes
  {
    path: '/',
    element: <Landing />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <Login />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/signup',
    element: <Signup />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
    errorElement: <RouteErrorBoundary />,
  },

  // Protected app routes
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/dashboard',     element: <Dashboard />,      errorElement: <RouteErrorBoundary /> },
      { path: '/map',           element: <LiveMap />,        errorElement: <RouteErrorBoundary /> },
      { path: '/vehicles',      element: <Vehicles />,       errorElement: <RouteErrorBoundary /> },
      { path: '/vehicles/:id',  element: <VehicleDetail />,  errorElement: <RouteErrorBoundary /> },
      { path: '/locations',     element: <Locations />,      errorElement: <RouteErrorBoundary /> },
      { path: '/locations/:id', element: <LocationDetail />, errorElement: <RouteErrorBoundary /> },
      { path: '/insights',      element: <Insights />,       errorElement: <RouteErrorBoundary /> },
      { path: '/analytics',     element: <Analytics />,      errorElement: <RouteErrorBoundary /> },
      { path: '/settings',      element: <Settings />,       errorElement: <RouteErrorBoundary /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
