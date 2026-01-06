'use client';

import { useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { arcTestnet } from '@/lib/chains/arc';
import { toast } from 'sonner';

/**
 * Hook to guard contract actions - ensures user is on Arc testnet
 * Returns isWrongNetwork flag and switchToArc function
 */
export function useChainGuard() {
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;

  // Add Arc testnet to wallet if not present
  const addArcTestnet = useCallback(async () => {
    if (!connector) return;

    try {
      const provider = await connector.getProvider();
      await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> }).request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${arcTestnet.id.toString(16)}`,
            chainName: arcTestnet.name,
            nativeCurrency: arcTestnet.nativeCurrency,
            rpcUrls: [arcTestnet.rpcUrls.default.http[0]],
            blockExplorerUrls: [arcTestnet.blockExplorers?.default.url],
          },
        ],
      });
      toast.success('Arc Testnet added to wallet');
    } catch (error) {
      console.error('Failed to add chain:', error);
      toast.error('Failed to add Arc Testnet');
    }
  }, [connector]);

  // Switch to Arc testnet - always add chain first (wallet ignores if exists)
  const switchToArc = useCallback(async () => {
    await addArcTestnet();
    switchChain({ chainId: arcTestnet.id });
  }, [switchChain, addArcTestnet]);

  return {
    isWrongNetwork,
    switchToArc,
    isConnected,
    chainId,
    targetChainId: arcTestnet.id,
  };
}
