'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { DirectPayButton } from '@/components/payment/DirectPayButton';
import { TransakPayButton } from '@/components/payment/TransakPayButton';
import { FundEscrowButton } from '@/components/escrow/FundEscrowButton';
import { FundMilestoneButton } from '@/components/escrow/FundMilestoneButton';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import type { Invoice, Milestone } from '@/types/database';

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
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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

  // Fetch milestones for V2/V3 invoices
  const fetchMilestones = useCallback(() => {
    if (invoice?.id) {
      fetch(`/api/invoices/${invoice.id}/milestones`)
        .then((res) => res.json())
        .then((data) => setMilestones(data.milestones || []))
        .catch(() => setMilestones([]));
    }
  }, [invoice?.id]);

  useEffect(() => {
    const hasMilestones = invoice?.contract_version === 2 || invoice?.contract_version === 3;
    if (hasMilestones && invoice?.id) {
      fetchMilestones();
    }
  }, [invoice, fetchMilestones]);

  // Get current milestone index for V3 sequential funding
  const isV3 = invoice?.contract_version === 3;
  const { currentMilestone, refetch: refetchEscrow } = useEscrowStatus(
    invoice?.escrow_address as `0x${string}` | undefined,
    invoice?.contract_version
  );

  const handlePaymentSuccess = async (txHash: string) => {
    try {
      const res = await fetch(`/api/pay/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
          tx_hash: txHash,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invoice');
      }

      toast.success('Payment successful!');
      router.push(`/pay/${code}/success?tx=${txHash}`);
    } catch (err) {
      console.error('Payment update error:', err);
      // Still redirect to success - payment went through, just DB update failed
      toast.error('Payment sent! Status update may be delayed.');
      router.push(`/pay/${code}/success?tx=${txHash}`);
    }
  };

  const handlePaymentError = (err: Error) => {
    // Simplify user rejection message
    if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
      toast.error('Transaction cancelled');
      return;
    }
    toast.error(err.message || 'Payment failed');
  };

  // Handler for Transak fiat payment success
  const handleTransakSuccess = async (orderId: string) => {
    try {
      const res = await fetch(`/api/pay/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
          tx_hash: `transak:${orderId}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invoice');
      }

      toast.success('Payment successful!');
      router.push(`/pay/${code}/success?tx=transak:${orderId}`);
    } catch (err) {
      console.error('Payment update error:', err);
      toast.error('Payment processing. Status update may be delayed.');
      router.push(`/pay/${code}/success?tx=transak:${orderId}`);
    }
  };

  // Handler for V3 milestone funding success
  const handleMilestoneFundSuccess = async (milestoneId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoice?.id}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'funded' }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Milestone status update failed:', data);
        toast.error(data.error || 'Status update failed');
        return;
      }

      toast.success('Milestone funded!');
      // Refresh milestones and escrow status
      fetchMilestones();
      refetchEscrow();
    } catch (err) {
      console.error('Milestone fund error:', err);
      toast.error('Status update failed');
    }
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

        {/* V3 Pay-Per-Milestone */}
        {isV3 && milestones.length > 0 && invoice.escrow_address && (
          <div className="py-4 border-t space-y-3">
            <p className="text-sm font-medium">Payment Milestones</p>
            {milestones.map((m, i) => (
              <div
                key={m.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">
                    {i + 1}. {m.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatUSDC(m.amount)}
                  </p>
                </div>
                <div>
                  {m.status === 'released' ? (
                    <Badge>Released</Badge>
                  ) : m.status === 'funded' ? (
                    <Badge variant="secondary">Funded</Badge>
                  ) : (
                    <FundMilestoneButton
                      escrowAddress={invoice.escrow_address as `0x${string}`}
                      milestoneIndex={i}
                      milestoneAmount={m.amount}
                      isCurrentMilestone={i === currentMilestone}
                      onSuccess={() => handleMilestoneFundSuccess(m.id)}
                    />
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Fund milestones sequentially as work is completed
            </p>
          </div>
        )}

        {/* V2 Milestone Breakdown (legacy fund-all-upfront) */}
        {invoice.contract_version === 2 && milestones.length > 0 && (
          <div className="py-4 border-t space-y-2">
            <p className="text-sm font-medium">Payment Milestones</p>
            {milestones.map((m, i) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {i + 1}. {m.description}
                </span>
                <span className="font-medium">{formatUSDC(m.amount)}</span>
              </div>
            ))}
            <div className="text-xs text-muted-foreground pt-2">
              Funds released milestone-by-milestone after your approval
            </div>
          </div>
        )}

        {/* Payment Actions */}
        {isPaid ? (
          <div className="mt-4 text-center">
            <p className="text-muted-foreground">
              This invoice has already been {invoice.status}.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Section Header */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Payment Options
                </span>
              </div>
            </div>

            {/* Crypto Payment */}
            <div className="space-y-2">
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

              {/* V1/V2: Fund all upfront */}
              {invoice.payment_type === 'escrow' &&
                invoice.escrow_address &&
                !isV3 && (
                  <FundEscrowButton
                    escrowAddress={invoice.escrow_address as `0x${string}`}
                    amount={invoice.amount.toString()}
                    contractVersion={invoice.contract_version}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                )}
            </div>

            {/* Fiat Payment Divider */}
            {!isV3 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or pay with card
                  </span>
                </div>
              </div>
            )}

            {/* Fiat Payment - Transak (not for V3 milestone invoices) */}
            {!isV3 && (
              <TransakPayButton
                amount={invoice.amount}
                walletAddress={invoice.escrow_address || invoice.creator_wallet}
                invoiceCode={invoice.short_code}
                onSuccess={handleTransakSuccess}
                onError={handlePaymentError}
              />
            )}

            {/* V3: Milestones funded individually via section above */}
            {isV3 && invoice.escrow_address && (
              <p className="text-sm text-muted-foreground text-center">
                Fund milestones above as work is completed
              </p>
            )}

            {invoice.payment_type === 'escrow' && !invoice.escrow_address && (
              <p className="text-sm text-muted-foreground text-center">
                Escrow not yet created. Please contact the invoice creator.
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
