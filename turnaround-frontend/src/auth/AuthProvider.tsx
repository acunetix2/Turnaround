import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../lib/api/types';
import { mockUser } from '../lib/api/mocks/fixtures';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment parameters
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password?: string, role?: UserRole) => Promise<void>;
  signup: (params: { email: string; password: string; name: string; company: string; role: UserRole; fleetSize?: string }) => Promise<void>;
  logout: () => Promise<void>;
  simulateRole: (role: UserRole) => void;
  isMockMode: boolean;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  role: null,
  loading: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  simulateRole: () => {},
  isMockMode: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

let supabase: SupabaseClient | null = null;
if (!USE_MOCKS && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    } else if (supabase) {
      // Live Supabase auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          localStorage.setItem('supabase_session_jwt', session.access_token);
          const supabaseUser = session.user;
          setUser({
            id: supabaseUser.id,
            company_id: supabaseUser.user_metadata?.company_id || 'seed-company-siginon-001',
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            email: supabaseUser.email || '',
            role: (supabaseUser.user_metadata?.role as UserRole) || 'fleet_manager',
            created_at: supabaseUser.created_at
          });
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          localStorage.setItem('supabase_session_jwt', session.access_token);
          const supabaseUser = session.user;
          setUser({
            id: supabaseUser.id,
            company_id: supabaseUser.user_metadata?.company_id || 'seed-company-siginon-001',
            company_name: supabaseUser.user_metadata?.company || undefined,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            email: supabaseUser.email || '',
            role: (supabaseUser.user_metadata?.role as UserRole) || 'fleet_manager',
            created_at: supabaseUser.created_at
          });
        } else {
          localStorage.removeItem('supabase_session_jwt');
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Missing supabase configuration, fallback to mock mode
      setLoading(false);
    }
  }, []);

  const signup = async ({
    email,
    password,
    name,
    company,
    role,
    fleetSize
  }: {
    email: string;
    password: string;
    name: string;
    company: string;
    role: UserRole;
    fleetSize?: string;
  }) => {
    setLoading(true);
    try {
      if (USE_MOCKS || !supabase) {
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
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              company,
              role,
              fleet_size: fleetSize
            }
          }
        });
        if (error) throw error;
        if (data.session) {
          localStorage.setItem('supabase_session_jwt', data.session.access_token);
          setUser({
            id: data.user!.id,
            company_id: data.user!.user_metadata?.company_id || 'seed-company-siginon-001',
            company_name: company,
            name: name,
            email: email,
            role: role,
            created_at: data.user!.created_at
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string, desiredRole: UserRole = 'fleet_manager') => {
    setLoading(true);
    try {
      if (USE_MOCKS || !supabase) {
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
        if (!password) {
          const { error } = await supabase.auth.signInWithOtp({ email });
          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
          if (data.session) {
            localStorage.setItem('supabase_session_jwt', data.session.access_token);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (USE_MOCKS || !supabase) {
        setUser(null);
        localStorage.removeItem('supabase_mock_session');
        localStorage.removeItem('supabase_session_jwt');
      } else {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('supabase_session_jwt');
      }
    } finally {
      setLoading(false);
    }
  };

  const simulateRole = (role: UserRole) => {
    if (user && (USE_MOCKS || !supabase)) {
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
        login,
        signup,
        logout,
        simulateRole,
        isMockMode: USE_MOCKS || !supabase
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
