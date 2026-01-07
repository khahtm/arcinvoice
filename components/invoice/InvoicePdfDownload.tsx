'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePdf, invoiceToPdfData } from '@/lib/pdf/invoice-pdf-generator';
import type { Invoice, Milestone } from '@/types/database';
import { cn } from '@/lib/utils';

interface InvoicePdfDownloadProps {
  invoice: Invoice;
  milestones?: Milestone[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

/**
 * Download button for PDF invoice generation.
 * Only renders when invoice status is funded or released.
 */
export function InvoicePdfDownload({
  invoice,
  milestones,
  variant = 'outline',
  size = 'default',
  className,
}: InvoicePdfDownloadProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Only allow download for funded/released invoices
  const canDownload = ['funded', 'released'].includes(invoice.status);

  if (!canDownload) {
    return null;
  }

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const pdfData = invoiceToPdfData(invoice, milestones);
      const blob = await generateInvoicePdf(pdfData);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `arc-invoice-${invoice.short_code}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);

      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Icon-only variant
  if (size === 'icon') {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleDownload}
        disabled={isLoading}
        className={className}
        title="Download PDF"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isLoading}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
