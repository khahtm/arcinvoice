'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useReleaseEscrow } from '@/hooks/useReleaseEscrow';

interface ReleaseButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function ReleaseButton({ escrowAddress, onSuccess }: ReleaseButtonProps) {
  const { release, hash, isPending, isConfirming, isSuccess } =
    useReleaseEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess && hash && onSuccess) {
      onSuccess(hash);
    }
  }, [isSuccess, hash, onSuccess]);

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
