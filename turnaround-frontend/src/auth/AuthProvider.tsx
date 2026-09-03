import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../lib/api/types';
import { mockUser } from '../lib/api/mocks/fixtures';
import { apiClient } from '../lib/api/client';

// Environment parameters
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  loadingAction: 'checking-session' | 'logging-in' | 'logging-out' | 'signing-up' | null;
  login: (email: string, password?: string, role?: UserRole) => Promise<void>;
  signup: (params: { email: string; password: string; name: string; company: string; role: UserRole; fleetSize?: string }) => Promise<{ requires_email_confirmation?: boolean }>;
  logout: () => Promise<void>;
  simulateRole: (role: UserRole) => void;
  isMockMode: boolean;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  role: null,
  loading: false,
  loadingAction: null,
  login: async () => {},
  signup: async () => ({}),
  logout: async () => {},
  simulateRole: () => {},
  isMockMode: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<AuthContextType['loadingAction']>('checking-session');

  useEffect(() => {
    if (USE_MOCKS) {
      // In mock mode, check if we previously logged in a mock user
      const stored = localStorage.getItem('supabase_mock_session');
      if (stored) {
        try {
          const storedUser = JSON.parse(stored);
          setUser(storedUser);
        } catch {
          localStorage.removeItem('supabase_mock_session');
        }
      }
      setLoadingAction(null);
      setLoading(false);
    } else {
      apiClient.getAuthUser().then(setUser).catch(() => setUser(null)).finally(() => {
        setLoadingAction(null);
        setLoading(false);
      });
    }
  }, []);

  const signup = async ({
    email,
    password,
    name,
    company,
    role
  }: {
    email: string;
    password: string;
    name: string;
    company: string;
    role: UserRole;
    fleetSize?: string;
  }): Promise<{ requires_email_confirmation?: boolean }> => {
    setLoading(true);
    setLoadingAction('signing-up');
    try {
      if (USE_MOCKS) {
        const mockSessionUser: User = {
          ...mockUser,
          email,
          name,
          role,
          company_name: company,
          company_id: 'seed-company-siginon-001'
        };
        setUser(mockSessionUser);
        localStorage.setItem('supabase_mock_session', JSON.stringify(mockSessionUser));
        localStorage.setItem('supabase_session_jwt', 'demo-token:seed-user-admin-001:seed-company-siginon-001:fleet_manager');
        return {};
      } else {
        const result = await apiClient.signup({ email, password, name, company, role });
        if (result.user) setUser(result.user);
        return { requires_email_confirmation: result.requires_email_confirmation };
      }
    } finally {
      setLoadingAction(null);
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string, desiredRole: UserRole = 'fleet_manager') => {
    setLoading(true);
    setLoadingAction('logging-in');
    try {
      if (USE_MOCKS) {
        // Mock Login
        const mockSessionUser: User = {
          ...mockUser,
          email,
          role: desiredRole,
          company_id: 'seed-company-siginon-001'
        };
        setUser(mockSessionUser);
        localStorage.setItem('supabase_mock_session', JSON.stringify(mockSessionUser));
        localStorage.setItem('supabase_session_jwt', 'demo-token:seed-user-admin-001:seed-company-siginon-001:fleet_manager');
      } else {
        if (!password) throw new Error('Password is required');
        setUser(await apiClient.login(email, password));
      }
    } finally {
      setLoadingAction(null);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setLoadingAction('logging-out');
    try {
      if (USE_MOCKS) {
        setUser(null);
        localStorage.removeItem('supabase_mock_session');
        localStorage.removeItem('supabase_session_jwt');
      } else {
        await apiClient.logout();
        setUser(null);
      }
    } finally {
      setLoadingAction(null);
      setLoading(false);
    }
  };

  const simulateRole = (role: UserRole) => {
    if (user && USE_MOCKS) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem('supabase_mock_session', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        loading,
        loadingAction,
        login,
        signup,
        logout,
        simulateRole,
        isMockMode: USE_MOCKS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
