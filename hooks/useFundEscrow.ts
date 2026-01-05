'use client';

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract,
  useAccount,
} from 'wagmi';
import { parseUnits } from 'viem';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useFundEscrow(escrowAddress: `0x${string}`, amount: string) {
  const chainId = useChainId();
  const { address } = useAccount();
  const amountWei = parseUnits(amount, 6);

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < amountWei;

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
      args: [escrowAddress, amountWei],
    });
  };

  const fundEscrow = () => {
    deposit({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'deposit',
    });
  };

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
  };
}
