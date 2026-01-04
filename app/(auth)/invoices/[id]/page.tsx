'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSDC, truncateAddress, getPaymentUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Invoice } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  funded: 'bg-blue-500',
  released: 'bg-green-500',
  refunded: 'bg-red-500',
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(data.invoice);
        }
      })
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCopyLink = async () => {
    if (invoice) {
      const paymentUrl = getPaymentUrl(invoice.short_code);
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success('Payment link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-bold text-destructive">
            Invoice Not Found
          </h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const paymentUrl = getPaymentUrl(invoice.short_code);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Invoice Details</h1>
            <p className="font-mono text-muted-foreground">
              {invoice.short_code}
            </p>
          </div>
        </div>
        <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
      </div>

      {/* Payment Link Card */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h2 className="font-semibold mb-2">Payment Link</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-background px-3 py-2 rounded text-sm break-all">
            {paymentUrl}
          </code>
          <Button variant="outline" size="icon" onClick={handleCopyLink}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Link href={`/pay/${invoice.short_code}`} target="_blank">
            <Button variant="outline" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Share this link with your client to receive payment
        </p>
      </Card>

      {/* Invoice Details */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">{formatUSDC(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Type</p>
            <p className="font-semibold capitalize">{invoice.payment_type}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="mt-1">{invoice.description}</p>
        </div>

        {(invoice.client_name || invoice.client_email) && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Client Info</p>
            {invoice.client_name && <p>{invoice.client_name}</p>}
            {invoice.client_email && (
              <p className="text-muted-foreground">{invoice.client_email}</p>
            )}
          </div>
        )}

        {invoice.payment_type === 'escrow' && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Auto-release</p>
            <p>{invoice.auto_release_days} days after funding</p>
          </div>
        )}

        {invoice.tx_hash && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Transaction</p>
            <a
              href={`https://testnet.arcscan.app/tx/${invoice.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-primary hover:underline break-all"
            >
              {invoice.tx_hash}
            </a>
          </div>
        )}

        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>Created: {new Date(invoice.created_at).toLocaleString()}</p>
          <p>Recipient: {truncateAddress(invoice.creator_wallet)}</p>
        </div>
      </Card>
    </div>
  );
}
