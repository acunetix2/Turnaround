/**
 * CompanyContext — loads company configuration from the backend and makes it
 * available globally. When updated (e.g. from CompanyConfig page) the whole
 * app reflects the change immediately (company name in sidebar, currency
 * formatting, SLA thresholds, etc.)
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from './api/client';
import type { CompanyConfig } from './api/types';
import { useAuth } from '../auth/AuthProvider';

interface CompanyContextType {
  config: CompanyConfig | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  update: (data: Partial<CompanyConfig>) => Promise<void>;
}

const companyCacheKey = (companyId: string) => `turnaround:company-config:${companyId}`;

function readCachedConfig(companyId: string): CompanyConfig | null {
  try {
    const cached = sessionStorage.getItem(companyCacheKey(companyId));
    return cached ? JSON.parse(cached) as CompanyConfig : null;
  } catch {
    return null;
  }
}

function cacheConfig(config: CompanyConfig) {
  try {
    sessionStorage.setItem(companyCacheKey(config.id), JSON.stringify(config));
  } catch {
    // Storage can be unavailable in private browsing or during SSR.
  }
}

const CompanyContext = createContext<CompanyContextType>({
  config: null,
  isLoading: false,
  refresh: async () => {},
  update: async () => {},
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await apiClient.getCompanyConfig();
      setConfig(data);
      cacheConfig(data);
    } catch (error) {
      console.error('[CompanyConfig] Failed to load company configuration', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const update = useCallback(async (data: Partial<CompanyConfig>) => {
    const updated = await apiClient.updateCompanyConfig(data);
    setConfig(updated);
    cacheConfig(updated);
  }, []);

  useEffect(() => {
    if (!companyId) {
      setConfig(null);
      setIsLoading(false);
      return;
    }
    const cached = readCachedConfig(companyId);
    setConfig(cached);
    setIsLoading(!cached);
    refresh();
  }, [refresh, companyId]);

  return (
    <CompanyContext.Provider value={{ config, isLoading, refresh, update }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);

/** Formatted currency using company's configured currency code */
export function useCompanyCurrency() {
  const { config } = useCompany();
  const currency = config?.currency || 'KES';
  return (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
