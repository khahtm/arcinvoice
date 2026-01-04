'use client';

import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { getContractAddress, isChainSupported } from '@/lib/contracts/addresses';

export function useUSDCBalance(address?: `0x${string}`) {
  const chainId = useChainId();

  const enabled = !!address && isChainSupported(chainId);

  const { data, isLoading, refetch, error } = useReadContract({
    address: enabled ? getContractAddress(chainId, 'USDC') : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  return {
    balance: data ? formatUnits(data, 6) : '0',
    balanceRaw: data ?? BigInt(0),
    isLoading,
    refetch,
    error,
  };
}
