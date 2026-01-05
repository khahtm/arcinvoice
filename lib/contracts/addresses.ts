// Contract addresses for Arc blockchain
// USDC is the native gas token on Arc, but also has an ERC20 interface

export const CONTRACTS = {
  // Arc Testnet (Chain ID: 5042002)
  5042002: {
    // USDC contract address on Arc testnet
    // Note: On Arc, USDC is native but has ERC20 wrapper for compatibility
    USDC: '0x3600000000000000000000000000000000000000' as const,
    // V1 contracts (basic escrow)
    FACTORY: '0x07a7be2be306a4C37c7E526235BEcB7BF4C018FB' as const,
    // V2 contracts (milestone escrow + fees) - Updated with splitFunds support
    FEE_COLLECTOR: '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f' as const,
    MILESTONE_FACTORY: '0x9F9c0955083459978Af2EaCc6C223315085Fb777' as const,
  },
  // Arc Mainnet (Chain ID: 5042001) - Placeholder until mainnet launches
  5042001: {
    USDC: '0x3600000000000000000000000000000000000000' as const,
    FACTORY: '' as const,
    FEE_COLLECTOR: '' as const,
    MILESTONE_FACTORY: '' as const,
  },
} as const;

export type SupportedChainId = keyof typeof CONTRACTS;

export type ContractName = 'USDC' | 'FACTORY' | 'FEE_COLLECTOR' | 'MILESTONE_FACTORY';

export function getContractAddress(
  chainId: number,
  contract: ContractName
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
