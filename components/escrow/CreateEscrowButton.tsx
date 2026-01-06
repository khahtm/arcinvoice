'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateEscrow } from '@/hooks/useCreateEscrow';
import { useCreateMilestoneEscrow } from '@/hooks/useCreateMilestoneEscrow';
import { useChainGuard } from '@/hooks/useChainGuard';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import type { Milestone } from '@/types/database';

interface CreateEscrowButtonProps {
  invoiceId: string;
  amount: number;
  autoReleaseDays: number;
  milestones?: Milestone[];
  onSuccess?: (escrowAddress: string, txHash: string) => void;
}

export function CreateEscrowButton({
  invoiceId,
  amount,
  autoReleaseDays,
  milestones,
  onSuccess,
}: CreateEscrowButtonProps) {
  const { isConnected, isWrongNetwork, switchToArc } = useChainGuard();
  const isV2 = milestones && milestones.length > 0;

  // V1 hook for basic escrow
  const v1Hook = useCreateEscrow();
  // V2 hook for milestone escrow
  const v2Hook = useCreateMilestoneEscrow();

  // Select the appropriate hook based on contract version
  const {
    hash,
    isPending,
    isConfirming,
    isSuccess,
    escrowAddress,
  } = isV2 ? v2Hook : v1Hook;

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

  if (isWrongNetwork) {
    return (
      <Button variant="destructive" onClick={switchToArc} className="w-full gap-2">
        <AlertTriangle className="h-4 w-4" />
        Switch to Arc Testnet
      </Button>
    );
  }

  const handleCreate = () => {
    if (isV2 && milestones) {
      // V2: Create milestone escrow with milestone amounts
      const milestoneAmounts = milestones.map((m) => m.amount);
      v2Hook.createEscrow(invoiceId, milestoneAmounts, autoReleaseDays);
    } else {
      // V1: Create basic escrow with total amount
      v1Hook.createEscrow(invoiceId, amount, autoReleaseDays);
    }
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
