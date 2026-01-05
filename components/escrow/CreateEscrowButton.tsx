'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useCreateEscrow } from '@/hooks/useCreateEscrow';
import { ConnectButton } from '@/components/wallet/ConnectButton';

interface CreateEscrowButtonProps {
  invoiceId: string;
  amount: number;
  autoReleaseDays: number;
  onSuccess?: (escrowAddress: string, txHash: string) => void;
}

export function CreateEscrowButton({
  invoiceId,
  amount,
  autoReleaseDays,
  onSuccess,
}: CreateEscrowButtonProps) {
  const { isConnected } = useAccount();
  const {
    createEscrow,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    escrowAddress,
  } = useCreateEscrow();

  useEffect(() => {
    if (isSuccess && escrowAddress && hash && onSuccess) {
      onSuccess(escrowAddress, hash);
    }
  }, [isSuccess, escrowAddress, hash, onSuccess]);

  if (!isConnected) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Connect your wallet to create the escrow contract
        </p>
        <ConnectButton />
      </div>
    );
  }

  const handleCreate = () => {
    createEscrow(invoiceId, amount, autoReleaseDays);
  };

  return (
    <Button
      onClick={handleCreate}
      disabled={isPending || isConfirming}
      className="w-full"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
          ? 'Creating escrow...'
          : 'Create Escrow Contract'}
    </Button>
  );
}
