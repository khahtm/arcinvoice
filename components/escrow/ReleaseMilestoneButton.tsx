'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMilestoneEscrow } from '@/hooks/useMilestoneEscrow';
import { useChainGuard } from '@/hooks/useChainGuard';
import { Coins, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ReleaseMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  milestoneIndex: number;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function ReleaseMilestoneButton({
  escrowAddress,
  milestoneIndex,
  onSuccess,
  disabled,
}: ReleaseMilestoneButtonProps) {
  const { isWrongNetwork, switchToArc } = useChainGuard();
  const { releaseMilestone, isPending, isConfirming, isSuccess, error } =
    useMilestoneEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Milestone ${milestoneIndex + 1} funds released!`);
      onSuccess?.();
    }
  }, [isSuccess, milestoneIndex, onSuccess]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to release milestone');
    }
  }, [error]);

  if (isWrongNetwork) {
    return (
      <Button variant="destructive" onClick={switchToArc} size="sm" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Switch
      </Button>
    );
  }

  const isLoading = isPending || isConfirming;

  return (
    <Button
      onClick={() => releaseMilestone(milestoneIndex)}
      disabled={disabled || isLoading}
      size="sm"
      variant="secondary"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Coins className="h-4 w-4 mr-2" />
          Release
        </>
      )}
    </Button>
  );
}
