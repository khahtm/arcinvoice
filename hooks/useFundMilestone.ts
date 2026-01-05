'use client';

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract,
  useAccount,
} from 'wagmi';
import { parseUnits } from 'viem';
import {
  ERC20_ABI,
  MILESTONE_ESCROW_ABI,
  FEE_COLLECTOR_ABI,
} from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

/**
 * Hook for funding a specific milestone in pay-per-milestone escrow
 * Handles USDC approval and milestone funding in sequential order
 */
export function useFundMilestone(
  escrowAddress: `0x${string}`,
  milestoneIndex: number,
  milestoneAmount: number // in USDC (not micro)
) {
  const chainId = useChainId();
  const { address } = useAccount();

  // Convert to wei (USDC has 6 decimals)
  const amountWei = parseUnits(milestoneAmount.toString(), 6);

  // Calculate payer amount (milestone + fee)
  const { data: payerAmountWei, isLoading: isLoadingAmount } = useReadContract({
    address: getContractAddress(chainId, 'FEE_COLLECTOR'),
    abi: FEE_COLLECTOR_ABI,
    functionName: 'calculatePayerAmount',
    args: [amountWei],
  });

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval =
    isLoadingAmount ||
    !allowance ||
    !payerAmountWei ||
    allowance < payerAmountWei;

  // Approve hook
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Fund hook
  const {
    writeContract: fund,
    data: fundHash,
    isPending: isFunding,
    error: fundError,
    reset: resetFund,
  } = useWriteContract();

  const { isLoading: isFundConfirming, isSuccess: isFundSuccess } =
    useWaitForTransactionReceipt({ hash: fundHash });

  const approveUSDC = () => {
    if (!payerAmountWei) return;
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, payerAmountWei],
    });
  };

  const fundMilestone = () => {
    fund({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'fundMilestone',
      args: [BigInt(milestoneIndex)],
    });
  };

  // Reset state for new transaction
  const reset = () => {
    resetApprove();
    resetFund();
    refetchAllowance();
  };

  // Display amount (in USDC)
  const payerAmountDisplay = payerAmountWei
    ? Number(payerAmountWei) / 1_000_000
    : 0;

  return {
    needsApproval: needsApproval && !isApproveSuccess,
    approveUSDC,
    fundMilestone,
    isApproving: isApproving || isApproveConfirming,
    isApproveSuccess,
    isFunding: isFunding || isFundConfirming,
    isFundSuccess,
    fundHash,
    fundError,
    payerAmountDisplay,
    isLoadingAmount,
    reset,
  };
}
