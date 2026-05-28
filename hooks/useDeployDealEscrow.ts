'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, keccak256, toHex, isAddress, zeroAddress } from 'viem';
import { DEAL_FACTORY_ABI } from '@/lib/contracts/deal-abi';
import { getContractAddress } from '@/lib/contracts/addresses';
import type { DealFormData } from '@/lib/validation';

export function useDeployDealEscrow() {
  const chainId = useChainId();

  const {
    writeContract,
    data: txHash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const deploy = (dealId: string, data: DealFormData) => {
    const factoryAddress = getContractAddress(chainId, 'DEAL_FACTORY');
    const dealIdBytes32 = keccak256(toHex(dealId));
    const milestoneAmounts = data.milestones.map((m) => parseUnits(m.amount.toString(), 6));
    const termsHash = keccak256(
      toHex(`${dealId}:${data.description}:${JSON.stringify(data.milestones)}`)
    );
    const expectedClient =
      data.client_wallet && isAddress(data.client_wallet)
        ? (data.client_wallet as `0x${string}`)
        : zeroAddress;

    writeContract({
      address: factoryAddress,
      abi: DEAL_FACTORY_ABI,
      functionName: 'createDeal',
      args: [dealIdBytes32, milestoneAmounts, termsHash, BigInt(data.auto_release_days), expectedClient],
    });
  };

  // Extract escrow address from DealCreated event logs
  const escrowAddress = (() => {
    if (!receipt?.logs) return null;
    for (const log of receipt.logs) {
      // DealCreated event: topic[2] is the escrow address (indexed)
      if (log.topics.length >= 3 && log.topics[0]) {
        const addr = log.topics[2];
        if (addr) {
          return `0x${addr.slice(26)}` as `0x${string}`;
        }
      }
    }
    return null;
  })();

  return {
    deploy,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    escrowAddress,
    error,
    reset,
  };
}
