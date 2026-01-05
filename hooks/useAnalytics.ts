'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
  unpaidAmount: number;
  escrowCount: number;
  directCount: number;
  feesPaid: number;
  uniqueClients: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface ClientData {
  client: string;
  invoiceCount: number;
  totalPaid: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface AnalyticsData {
  stats: AnalyticsStats;
  monthly: MonthlyData[];
  clients: ClientData[];
  statusDistribution: StatusData[];
}

export function useAnalytics(startDate?: string, endDate?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);

      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportCSV = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);

    const res = await fetch(`/api/analytics/export?${params}`);
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc-invoice-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
    exportCSV,
  };
}
