import { defineChain } from 'viem';

export const arcMainnet = defineChain({
  id: 185,
  name: 'Arc',
  nativeCurrency: {
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.arc.circle.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.circle.com',
    },
  },
});

export const arcTestnet = defineChain({
  id: 18500,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.arc.circle.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Arc Testnet Explorer',
      url: 'https://testnet-explorer.arc.circle.com',
    },
  },
  testnet: true,
});
