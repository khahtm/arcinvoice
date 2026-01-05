'use client';

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from 'wagmi';
import { parseUnits, keccak256, toBytes } from 'viem';
import { FACTORY_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useCreateEscrow() {
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const createEscrow = (
    invoiceId: string,
    amount: number,
    autoReleaseDays: number
  ) => {
    const invoiceIdHash = keccak256(toBytes(invoiceId));
    const amountWei = parseUnits(amount.toString(), 6);

    writeContract({
      address: getContractAddress(chainId, 'FACTORY'),
      abi: FACTORY_ABI,
      functionName: 'createEscrow',
      args: [invoiceIdHash, amountWei, BigInt(autoReleaseDays)],
    });
  };

  // Parse escrow address from receipt logs
  const getEscrowAddress = (): string | null => {
    if (!receipt?.logs) return null;

    const eventSignature = keccak256(
      toBytes('EscrowCreated(bytes32,address,address,uint256)')
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
