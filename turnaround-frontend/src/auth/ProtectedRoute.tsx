import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserRole } from '../lib/api/types';
import { LoadingStatus } from '../components/common/Loader';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const { user, role, loading, loadingAction } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-canvas text-text-secondary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <LoadingStatus messages={
            loadingAction === 'logging-out'
              ? ['Logging you out securely', 'Closing your workspace session', 'Almost there']
              : loadingAction === 'logging-in'
                ? ['Logging you in securely', 'Preparing your workspace', 'Almost there']
                : ['Please wait while we secure your session', 'Loading your workspace', 'Almost there']
          } fullscreen />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and preserve original path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Return a neat Access Denied readout inside the App shell
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px]">
        <div className="panel-elevated p-8 max-w-md w-full flex flex-col items-center gap-4 bg-bg-surface-raised">
          <div className="h-12 w-12 rounded-full bg-status-danger-bg flex items-center justify-center text-status-danger">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">Access Gated</h2>
          <p className="text-sm text-text-secondary">
            Your role (<span className="font-numeric px-1.5 py-0.5 rounded bg-bg-surface border border-border-strong text-brand-400">{role}</span>) does not have authorization to view this resource.
          </p>
          <div className="mt-2 text-xs text-text-tertiary">
            Contact your fleet administrator to request higher system privileges.
          </div>
        </div>
      </div>
    );
  }

  return children;
};
