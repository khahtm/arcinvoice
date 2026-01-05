'use client';

import { useFeeCalculation } from '@/hooks/useFeeCalculation';
import { formatUSDC } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FeeBreakdownProps {
  /** Invoice amount in smallest units */
  amount: number;
  /** Which perspective to show */
  variant: 'payer' | 'creator';
  /** Optional className */
  className?: string;
}

/**
 * Displays fee breakdown for escrow payments
 * Shows payer or creator perspective based on variant
 */
export function FeeBreakdown({ amount, variant, className }: FeeBreakdownProps) {
  const fees = useFeeCalculation(amount);

  if (variant === 'payer') {
    return (
      <div className={cn('text-sm space-y-1', className)}>
        <div className="flex justify-between text-muted-foreground">
          <span>Invoice amount</span>
          <span>{formatUSDC(fees.invoiceAmount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Platform fee (0.5%)</span>
          <span className="text-orange-600">+{formatUSDC(fees.payerFee)}</span>
        </div>
        <div className="flex justify-between font-medium text-foreground border-t pt-1 mt-1">
          <span>You pay</span>
          <span>{formatUSDC(fees.payerAmount)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('text-sm space-y-1', className)}>
      <div className="flex justify-between text-muted-foreground">
        <span>Invoice amount</span>
        <span>{formatUSDC(fees.invoiceAmount)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Platform fee (0.5%)</span>
        <span className="text-orange-600">-{formatUSDC(fees.creatorFee)}</span>
      </div>
      <div className="flex justify-between font-medium text-foreground border-t pt-1 mt-1">
        <span>You receive</span>
        <span className="text-green-600">{formatUSDC(fees.creatorAmount)}</span>
      </div>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function FeeBreakdownInline({ amount, variant }: Omit<FeeBreakdownProps, 'className'>) {
  const fees = useFeeCalculation(amount);

  if (variant === 'payer') {
    return (
      <span className="text-sm text-muted-foreground">
        {formatUSDC(fees.invoiceAmount)} + {formatUSDC(fees.payerFee)} fee = {formatUSDC(fees.payerAmount)}
      </span>
    );
  }

  return (
    <span className="text-sm text-muted-foreground">
      {formatUSDC(fees.invoiceAmount)} - {formatUSDC(fees.creatorFee)} fee = {formatUSDC(fees.creatorAmount)}
    </span>
  );
}
