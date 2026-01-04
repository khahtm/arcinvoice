// Contract addresses for Arc blockchain
// USDC is the native gas token on Arc, but also has an ERC20 interface

export const CONTRACTS = {
  // Arc Testnet (Chain ID: 5042002)
  5042002: {
    // USDC contract address on Arc testnet
    // Note: On Arc, USDC is native but has ERC20 wrapper for compatibility
    USDC: '0x3600000000000000000000000000000000000000' as const, // TODO: Update with actual address
    FACTORY: '' as const, // Deploy in Phase 5
  },
  // Arc Mainnet (Chain ID: 5042001) - Placeholder until mainnet launches
  5042001: {
    USDC: '0x3600000000000000000000000000000000000000' as const, // TODO: Update with actual address
    FACTORY: '' as const,
  },
} as const;

export type SupportedChainId = keyof typeof CONTRACTS;

export function getContractAddress(
  chainId: number,
  contract: 'USDC' | 'FACTORY'
): `0x${string}` {
  const addresses = CONTRACTS[chainId as SupportedChainId];
  if (!addresses) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  const address = addresses[contract];
  if (!address) {
    throw new Error(`Contract ${contract} not deployed on chain ${chainId}`);
  }
  return address as `0x${string}`;
}

export function isChainSupported(chainId: number): chainId is SupportedChainId {
  return chainId in CONTRACTS;
}
