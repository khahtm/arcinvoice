'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRefundEscrow } from '@/hooks/useRefundEscrow';

interface RefundButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function RefundButton({ escrowAddress, onSuccess }: RefundButtonProps) {
  const { refund, hash, isPending, isConfirming, isSuccess } =
    useRefundEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess && hash && onSuccess) {
      onSuccess(hash);
    }
  }, [isSuccess, hash, onSuccess]);

  return (
    <Button
      onClick={refund}
      disabled={isPending || isConfirming}
      variant="outline"
      className="w-full"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
          ? 'Processing...'
          : 'Refund to Payer'}
    </Button>
  );
}
