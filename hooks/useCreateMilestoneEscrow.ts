'use client';

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from 'wagmi';
import { parseUnits, keccak256, toBytes } from 'viem';
import { MILESTONE_FACTORY_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useCreateMilestoneEscrow() {
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const createEscrow = (
    invoiceId: string,
    milestoneAmounts: number[],
    autoReleaseDays: number
  ) => {
    const invoiceIdHash = keccak256(toBytes(invoiceId));
    // Convert each milestone amount to wei (6 decimals for USDC)
    const amountsWei = milestoneAmounts.map((amt) =>
      parseUnits(amt.toString(), 6)
    );

    writeContract({
      address: getContractAddress(chainId, 'MILESTONE_FACTORY'),
      abi: MILESTONE_FACTORY_ABI,
      functionName: 'createEscrow',
      args: [invoiceIdHash, amountsWei, BigInt(autoReleaseDays)],
    });
  };

  // Parse escrow address from receipt logs
  const getEscrowAddress = (): string | null => {
    if (!receipt?.logs) return null;

    // MilestoneFactory event: EscrowCreated(bytes32 indexed invoiceId, address indexed escrow, address indexed creator, uint256 totalAmount, uint256 milestoneCount)
    const eventSignature = keccak256(
      toBytes('EscrowCreated(bytes32,address,address,uint256,uint256)')
    );

    for (const log of receipt.logs) {
      if (log.topics[0] === eventSignature && log.topics[2]) {
        return `0x${log.topics[2].slice(26)}`;
      }
    }
    return null;
  };

  return {
    createEscrow,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    escrowAddress: isSuccess ? getEscrowAddress() : null,
  };
}
