'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Invoice } from '@/types/database';
import type { InvoiceFormData } from '@/lib/validation';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (!mountedRef.current) return;
      if (res.ok) {
        setInvoices(data.invoices);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch {
      if (!mountedRef.current) return;
      setError('Failed to fetch invoices');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchInvoices();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchInvoices]);

  const createInvoice = async (data: InvoiceFormData): Promise<Invoice> => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (res.ok) {
      setInvoices((prev) => [result.invoice, ...prev]);
      return result.invoice;
    }
    throw new Error(result.error || 'Failed to create invoice');
  };

  return { invoices, isLoading, error, createInvoice, refetch: fetchInvoices };
}
