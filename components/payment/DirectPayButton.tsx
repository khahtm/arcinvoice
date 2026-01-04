'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useUSDCTransfer } from '@/hooks/useUSDCTransfer';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { formatUSDC } from '@/lib/utils';
import { parseUnits } from 'viem';
import { Loader2 } from 'lucide-react';

interface DirectPayButtonProps {
  amount: number;
  recipient: `0x${string}`;
  onSuccess: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function DirectPayButton({
  amount,
  recipient,
  onSuccess,
  onError,
}: DirectPayButtonProps) {
  const { address, isConnected } = useAccount();
  const { balance, balanceRaw } = useUSDCBalance(address);
  const { transfer, isPending, isConfirming, isSuccess, hash, error, reset } =
    useUSDCTransfer();

  const amountWei = parseUnits(amount.toString(), 6);
  const hasEnoughBalance = balanceRaw >= amountWei;

  // Handle success
  useEffect(() => {
    if (isSuccess && hash) {
      onSuccess(hash);
      reset();
    }
  }, [isSuccess, hash, onSuccess, reset]);

  // Handle error
  useEffect(() => {
    if (error && onError) {
      onError(error);
      reset();
    }
  }, [error, onError, reset]);

  const handlePay = async () => {
    try {
      await transfer(recipient, amount);
    } catch (err) {
      // Error handled via useEffect
    }
  };

  if (!isConnected) {
    return (
      <Button disabled className="w-full" size="lg">
        Connect wallet to pay
      </Button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled variant="destructive" className="w-full" size="lg">
        Insufficient balance ({balance} USDC)
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePay}
      disabled={isPending || isConfirming}
      className="w-full"
      size="lg"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Confirm in wallet...
        </>
      ) : isConfirming ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        `Pay ${formatUSDC(amount)}`
      )}
    </Button>
  );
}
