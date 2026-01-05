'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMilestoneEscrow } from '@/hooks/useMilestoneEscrow';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApproveMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  milestoneIndex: number;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function ApproveMilestoneButton({
  escrowAddress,
  milestoneIndex,
  onSuccess,
  disabled,
}: ApproveMilestoneButtonProps) {
  const { approveMilestone, isPending, isConfirming, isSuccess, error } =
    useMilestoneEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Milestone ${milestoneIndex + 1} approved!`);
      onSuccess?.();
    }
  }, [isSuccess, milestoneIndex, onSuccess]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to approve milestone');
    }
  }, [error]);

  const isLoading = isPending || isConfirming;

  return (
    <Button
      onClick={() => approveMilestone(milestoneIndex)}
      disabled={disabled || isLoading}
      size="sm"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </>
      )}
    </Button>
  );
}
