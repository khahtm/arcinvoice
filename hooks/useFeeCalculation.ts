'use client';

import { useMemo } from 'react';

// Fee in basis points (100 = 1%)
const FEE_BPS = 100;

export interface FeeBreakdown {
  /** Original invoice amount */
  invoiceAmount: number;
  /** What payer deposits (amount + payer fee) */
  payerAmount: number;
  /** What creator receives (amount - creator fee) */
  creatorAmount: number;
  /** Total fee (1% of invoice) */
  totalFee: number;
  /** Payer's portion of fee (0.5%) */
  payerFee: number;
  /** Creator's portion of fee (0.5%) */
  creatorFee: number;
  /** Fee percentage as string */
  feePercentage: string;
}

/**
 * Calculate fee breakdown for an invoice amount
 * Uses 50/50 split: payer pays 0.5% extra, creator receives 0.5% less
 * Total platform fee is 1%
 *
 * @param amount - Invoice amount in smallest units (e.g., USDC with 6 decimals)
 * @returns Fee breakdown with all amounts calculated
 */
export function useFeeCalculation(amount: number): FeeBreakdown {
  return useMemo(() => {
    // Calculate total fee (1% of invoice amount)
    const totalFee = Math.floor((amount * FEE_BPS) / 10000);
    // Split fee 50/50 between payer and creator
    const halfFee = Math.floor(totalFee / 2);
    // Handle odd fee amounts - give extra 1 wei to creator deduction
    const payerFee = halfFee;
    const creatorFee = totalFee - halfFee; // Gets the remainder

    return {
      invoiceAmount: amount,
      payerAmount: amount + payerFee,
      creatorAmount: amount - creatorFee,
      totalFee,
      payerFee,
      creatorFee,
      feePercentage: '1%',
    };
  }, [amount]);
}

/**
 * Pure function version for use outside React components
 */
export function calculateFees(amount: number): FeeBreakdown {
  const totalFee = Math.floor((amount * FEE_BPS) / 10000);
  const halfFee = Math.floor(totalFee / 2);
  const payerFee = halfFee;
  const creatorFee = totalFee - halfFee;

  return {
    invoiceAmount: amount,
    payerAmount: amount + payerFee,
    creatorAmount: amount - creatorFee,
    totalFee,
    payerFee,
    creatorFee,
    feePercentage: '1%',
  };
}
