'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoices } from '@/hooks/useInvoices';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { InvoiceFormData } from '@/lib/validation';

export default function NewInvoicePage() {
  const router = useRouter();
  const { createInvoice } = useInvoices();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true);
    try {
      const invoice = await createInvoice(data);
      toast.success('Invoice created successfully');
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create invoice'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Invoice</h1>
      <Card className="p-6">
        <InvoiceForm onSubmit={handleSubmit} isLoading={isLoading} />
      </Card>
    </div>
  );
}
