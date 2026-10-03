'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatePeriod, DateRangeResult, getDateRange } from '@/lib/dateUtils';

interface DateFilterContextType {
  period: DatePeriod;
  dateFrom: string;
  dateTo: string;
  label: string;
  formattedRange: string;
  setPeriod: (period: DatePeriod, customFrom?: string, customTo?: string) => void;
  setCustomRange: (customFrom: string, customTo: string) => void;
  resetFilter: () => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [rangeState, setRangeState] = useState<DateRangeResult>(() => {
    return getDateRange('ALL');
  });

  // Load initial period from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zen_crm_date_period');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.period) {
          setRangeState(getDateRange(parsed.period, parsed.customFrom, parsed.customTo));
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  const setPeriod = (period: DatePeriod, customFrom?: string, customTo?: string) => {
    const next = getDateRange(period, customFrom, customTo);
    setRangeState(next);
    try {
      localStorage.setItem('zen_crm_date_period', JSON.stringify({ period, customFrom, customTo }));
    } catch {
      // Ignore
    }
  };

  const setCustomRange = (customFrom: string, customTo: string) => {
    setPeriod('CUSTOM', customFrom, customTo);
  };

  const resetFilter = () => {
    setPeriod('ALL');
  };

  return (
    <DateFilterContext.Provider
      value={{
        period: rangeState.period,
        dateFrom: rangeState.dateFrom,
        dateTo: rangeState.dateTo,
        label: rangeState.label,
        formattedRange: rangeState.formattedRange,
        setPeriod,
        setCustomRange,
        resetFilter,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
