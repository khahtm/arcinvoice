'use client';

import { useState, useEffect, useCallback } from 'react';

interface KlerosCase {
  id: string;
  dispute_id: string;
  kleros_dispute_id: string | null;
  status: 'pending' | 'evidence' | 'voting' | 'appeal' | 'resolved';
  ruling: string | null;
  payer_amount: number | null;
  creator_amount: number | null;
  arbitration_fee_eth: string | null;
  arbitration_fee_paid_by: string | null;
  evidence_deadline: string | null;
  ruling_at: string | null;
  executed: boolean;
  executed_at: string | null;
  executed_tx_hash: string | null;
  created_at: string;
}

interface KlerosEvidence {
  id: string;
  case_id: string;
  submitted_by: string;
  evidence_uri: string;
  kleros_evidence_id: string | null;
  created_at: string;
}

interface UseKlerosReturn {
  klerosCase: KlerosCase | null;
  evidence: KlerosEvidence[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  escalate: () => Promise<EscalateResult>;
  submitEvidence: (name: string, description: string, fileUri?: string) => Promise<void>;
}

interface EscalateResult {
  klerosCase: KlerosCase;
  message: string;
  arbitrationData: {
    metaEvidence: {
      title: string;
      description: string;
      question: string;
      rulingOptions: {
        type: string;
        titles: string[];
        descriptions: string[];
      };
    };
    escrowAddress: string;
    invoiceAmount: number;
  };
}

export function useKleros(invoiceId: string, disputeId: string): UseKlerosReturn {
  const [klerosCase, setKlerosCase] = useState<KlerosCase | null>(null);
  const [evidence, setEvidence] = useState<KlerosEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!disputeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/invoices/${invoiceId}/disputes/${disputeId}/kleros`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Kleros case');
      }

      setKlerosCase(data.klerosCase);
      setEvidence(data.evidence || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, disputeId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const escalate = async (): Promise<EscalateResult> => {
    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}/escalate`,
      { method: 'POST' }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to escalate dispute');
    }

    await fetchCase();
    return data;
  };

  const submitEvidence = async (
    name: string,
    description: string,
    fileUri?: string
  ): Promise<void> => {
    const res = await fetch(
      `/api/invoices/${invoiceId}/disputes/${disputeId}/kleros/evidence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, fileUri }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit evidence');
    }

    await fetchCase();
  };

  return {
    klerosCase,
    evidence,
    isLoading,
    error,
    refetch: fetchCase,
    escalate,
    submitEvidence,
  };
}
