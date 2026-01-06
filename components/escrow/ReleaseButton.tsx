'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReleaseEscrow } from '@/hooks/useReleaseEscrow';
import { useChainGuard } from '@/hooks/useChainGuard';

interface ReleaseButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function ReleaseButton({ escrowAddress, onSuccess }: ReleaseButtonProps) {
  const { isWrongNetwork, switchToArc } = useChainGuard();
  const { release, hash, isPending, isConfirming, isSuccess } =
    useReleaseEscrow(escrowAddress);

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
      onClick={release}
      disabled={isPending || isConfirming}
      className="w-full"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
          ? 'Processing...'
          : 'Release Funds'}
    </Button>
  );
}
