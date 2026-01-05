'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Milestone, MilestoneStatus } from '@/types/database';

interface UseMilestonesReturn {
  milestones: Milestone[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => Promise<void>;
}

export function useMilestones(invoiceId: string | null): UseMilestonesReturn {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!invoiceId) {
      setMilestones([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/invoices/${invoiceId}/milestones`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setMilestones(data.milestones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch milestones');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const updateMilestoneStatus = async (
    milestoneId: string,
    status: MilestoneStatus
  ) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(
      `/api/invoices/${invoiceId}/milestones/${milestoneId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update milestone');
    }

    // Refetch to get updated state
    await fetchMilestones();
  };

  return {
    milestones,
    isLoading,
    error,
    refetch: fetchMilestones,
    updateMilestoneStatus,
  };
}
