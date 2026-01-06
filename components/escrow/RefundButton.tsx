'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRefundEscrow } from '@/hooks/useRefundEscrow';
import { useChainGuard } from '@/hooks/useChainGuard';

interface RefundButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function RefundButton({ escrowAddress, onSuccess }: RefundButtonProps) {
  const { isWrongNetwork, switchToArc } = useChainGuard();
  const { refund, hash, isPending, isConfirming, isSuccess } =
    useRefundEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess && hash && onSuccess) {
      onSuccess(hash);
    }
  }, [isSuccess, hash, onSuccess]);

  if (isWrongNetwork) {
    return (
      <Button variant="destructive" onClick={switchToArc} className="w-full gap-2">
        <AlertTriangle className="h-4 w-4" />
        Switch to Arc
      </Button>
    );
  }

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
