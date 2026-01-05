'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DisputeWithEvidence, ResolutionType } from '@/types/database';

interface UseDisputeReturn {
  dispute: DisputeWithEvidence | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  openDispute: (reason: string) => Promise<void>;
  proposeResolution: (
    disputeId: string,
    resolutionType: ResolutionType,
    payerAmount?: number,
    creatorAmount?: number
  ) => Promise<void>;
  acceptResolution: (disputeId: string) => Promise<void>;
  rejectResolution: (disputeId: string) => Promise<void>;
  submitEvidence: (
    disputeId: string,
    content: string,
    fileUrl?: string
  ) => Promise<void>;
}

export function useDispute(invoiceId: string | null): UseDisputeReturn {
  const [dispute, setDispute] = useState<DisputeWithEvidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDispute = useCallback(async () => {
    if (!invoiceId) {
      setDispute(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/disputes`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setDispute(data.dispute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispute');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  const openDispute = async (reason: string) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(`/api/invoices/${invoiceId}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to open dispute');
    }

    await fetchDispute();
  };

  const proposeResolution = async (
    disputeId: string,
    resolutionType: ResolutionType,
    payerAmount?: number,
    creatorAmount?: number
  ) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          resolution_type: resolutionType,
          payer_amount: payerAmount,
          creator_amount: creatorAmount,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to propose resolution');
    }

    await fetchDispute();
  };

  const acceptResolution = async (disputeId: string) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to accept resolution');
    }

    await fetchDispute();
  };

  const rejectResolution = async (disputeId: string) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reject resolution');
    }

    await fetchDispute();
  };

  const submitEvidence = async (
    disputeId: string,
    content: string,
    fileUrl?: string
  ) => {
    if (!invoiceId) throw new Error('No invoice ID');

    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}/evidence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, file_url: fileUrl }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to submit evidence');
    }

    await fetchDispute();
  };

  return {
    dispute,
    isLoading,
    error,
    refetch: fetchDispute,
    openDispute,
    proposeResolution,
    acceptResolution,
    rejectResolution,
    submitEvidence,
  };
}
