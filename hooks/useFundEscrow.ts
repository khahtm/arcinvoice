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
  ESCROW_ABI,
  MILESTONE_ESCROW_ABI,
  FEE_COLLECTOR_ABI,
} from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useFundEscrow(
  escrowAddress: `0x${string}`,
  amount: string,
  contractVersion: number = 1
) {
  const chainId = useChainId();
  const { address } = useAccount();
  const isV2 = contractVersion === 2;

  // For V1: use invoice amount directly
  const invoiceAmountWei = parseUnits(amount, 6);

  // For V2: read totalAmount from contract to ensure exact match
  const { data: contractTotalAmount } = useReadContract({
    address: escrowAddress,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'totalAmount',
    query: { enabled: isV2 },
  });

  // Read payer amount from FeeCollector for V2 (ensures exact calculation match)
  const { data: calculatedPayerAmount } = useReadContract({
    address: getContractAddress(chainId, 'FEE_COLLECTOR'),
    abi: FEE_COLLECTOR_ABI,
    functionName: 'calculatePayerAmount',
    args: contractTotalAmount ? [contractTotalAmount] : undefined,
    query: { enabled: isV2 && !!contractTotalAmount },
  });

  // Use calculated payer amount for V2, invoice amount for V1
  // For V2, we MUST wait for contract reads before allowing any action
  const isLoadingV2Amount = isV2 && !calculatedPayerAmount;
  const payerAmountWei = isV2
    ? (calculatedPayerAmount ?? BigInt(0)) // Use 0 while loading to force re-check
    : invoiceAmountWei;

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  // If V2 and still loading, always require approval (will show loading state in UI)
  // This prevents using stale allowance comparisons
  const needsApproval = isLoadingV2Amount || !allowance || allowance < payerAmountWei;

  // Approve hook
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit hook
  const {
    writeContract: deposit,
    data: depositHash,
    isPending: isDepositing,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  const approveUSDC = () => {
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, payerAmountWei],
    });
  };

  const fundEscrow = () => {
    deposit({
      address: escrowAddress,
      abi: isV2 ? MILESTONE_ESCROW_ABI : ESCROW_ABI,
      functionName: 'deposit',
    });
  };

  // Calculate display amount in USDC (only valid when not loading)
  const payerAmountDisplay = isLoadingV2Amount
    ? 0 // Will show loading state in UI
    : Number(payerAmountWei) / 1_000_000;

  return {
    needsApproval: needsApproval && !isApproveSuccess,
    approveUSDC,
    fundEscrow,
    isApproving: isApproving || isApproveConfirming,
    isApproveSuccess,
    isDepositing: isDepositing || isDepositConfirming,
    isDepositSuccess,
    approveHash,
    depositHash,
    payerAmountDisplay,
    isLoadingAmount: isLoadingV2Amount,
  };
}
