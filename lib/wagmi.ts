import { createConfig, http } from 'wagmi';
import { arcMainnet, arcTestnet } from './chains/arc';
import { injected, metaMask } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arcTestnet, arcMainnet],
  connectors: [
    metaMask(),   // Explicit MetaMask support
    injected(),   // Catch-all for Rabby, etc.
  ],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: true,
});
