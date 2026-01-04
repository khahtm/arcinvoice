'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { DirectPayButton } from '@/components/payment/DirectPayButton';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import type { Invoice } from '@/types/database';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting Payment', color: 'bg-yellow-500' },
  funded: { label: 'Funded', color: 'bg-blue-500' },
  released: { label: 'Paid', color: 'bg-green-500' },
  refunded: { label: 'Refunded', color: 'bg-red-500' },
};

export default function PaymentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pay/${code}`)
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
  }, [code]);

  const handlePaymentSuccess = async (txHash: string) => {
    try {
      await fetch(`/api/pay/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
          tx_hash: txHash,
          payer_wallet: address,
        }),
      });

      toast.success('Payment successful!');
      router.push(`/pay/${code}/success?tx=${txHash}`);
    } catch {
      toast.error('Failed to update invoice status');
    }
  };

  const handlePaymentError = (err: Error) => {
    toast.error(err.message || 'Payment failed');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold text-destructive">
            Invoice Not Found
          </h1>
          <p className="text-muted-foreground mt-2">
            This invoice doesn&apos;t exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  const isPaid = ['released', 'refunded', 'funded'].includes(invoice.status);
  const status = statusConfig[invoice.status] || {
    label: invoice.status,
    color: 'bg-gray-500',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Invoice</p>
            <p className="font-mono font-semibold">{invoice.short_code}</p>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        {/* Amount */}
        <div className="text-center py-8 border-y">
          <p className="text-4xl font-bold">{formatUSDC(invoice.amount)}</p>
          <p className="text-muted-foreground mt-1">USDC on Arc</p>
        </div>

        {/* Description */}
        <div className="py-4 space-y-1">
          <p className="text-sm font-medium">Description</p>
          <p className="text-muted-foreground">{invoice.description}</p>
        </div>

        {/* Recipient */}
        <div className="py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Paying to:{' '}
            <span className="font-mono">
              {truncateAddress(invoice.creator_wallet)}
            </span>
          </p>
        </div>

        {/* Payment Actions */}
        {isPaid ? (
          <div className="mt-4 text-center">
            <p className="text-muted-foreground">
              This invoice has already been {invoice.status}.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="flex justify-center">
              <ConnectButton />
            </div>

            {invoice.payment_type === 'direct' && (
              <DirectPayButton
                amount={invoice.amount}
                recipient={invoice.creator_wallet as `0x${string}`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            )}

            {invoice.payment_type === 'escrow' && (
              <p className="text-sm text-muted-foreground text-center">
                Escrow payments coming in Phase 6
              </p>
            )}
          </div>
        )}

        {/* Payment Type Info */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {invoice.payment_type === 'direct'
              ? 'Direct payment - funds sent immediately to recipient'
              : 'Escrow payment - funds held securely until release'}
          </p>
        </div>
      </Card>
    </div>
  );
}
