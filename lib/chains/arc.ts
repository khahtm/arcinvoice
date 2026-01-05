import { defineChain } from 'viem';

// Arc Mainnet - Chain ID TBD (mainnet planned for 2026)
export const arcMainnet = defineChain({
  id: 5042001, // Placeholder - update when mainnet launches
  name: 'Arc',
  nativeCurrency: {
    decimals: 18,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://arc-mainnet.drpc.org'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://arcscan.app',
    },
  },
});

// Arc Testnet - Official Chain ID: 5042002
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Testnet Explorer',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});
