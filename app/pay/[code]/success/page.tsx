'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { InvoicePdfDownload } from '@/components/invoice/InvoicePdfDownload';
import type { Invoice, Milestone } from '@/types/database';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const txHash = searchParams.get('tx');
  const code = params.code as string;

  const [copied, setCopied] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Fetch invoice data for PDF generation
  useEffect(() => {
    if (code) {
      fetch(`/api/pay/${code}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.invoice) {
            setInvoice(data.invoice);
            const hasMilestones =
              data.invoice.contract_version === 2 ||
              data.invoice.contract_version === 3;
            if (hasMilestones && data.invoice.id) {
              fetch(`/api/invoices/${data.invoice.id}/milestones`)
                .then((res) => res.json())
                .then((mData) => setMilestones(mData.milestones || []))
                .catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  }, [code]);

  const handleCopy = async () => {
    if (txHash) {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      toast.success('Transaction hash copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const explorerUrl = txHash
    ? `https://testnet.arcscan.app/tx/${txHash}`
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />

        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground mt-2">
          Your payment has been processed successfully.
        </p>

        {txHash && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">Transaction Hash</p>
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <p className="font-mono text-xs break-all flex-1">{txHash}</p>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {explorerUrl && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </Button>
            )}
          </div>
        )}

        {/* PDF Download Section */}
        {invoice && (
          <div className="mt-6 pt-4 border-t">
            <InvoicePdfDownload
              invoice={invoice}
              milestones={milestones.length > 0 ? milestones : undefined}
              variant="default"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Download a receipt for your records
            </p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            You can close this page. The recipient has been notified.
          </p>
        </div>
      </Card>
    </div>
  );
}
