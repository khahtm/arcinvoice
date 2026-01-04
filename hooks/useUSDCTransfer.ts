'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { getContractAddress, isChainSupported } from '@/lib/contracts/addresses';

export function useUSDCTransfer() {
  const chainId = useChainId();
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const transfer = async (to: `0x${string}`, amount: number): Promise<`0x${string}`> => {
    if (!isChainSupported(chainId)) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    // USDC has 6 decimals
    const amountWei = parseUnits(amount.toString(), 6);

    const txHash = await writeContractAsync({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountWei],
    });

    return txHash;
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    reset,
  };
}
