import { createConfig, http } from 'wagmi';
import { arcMainnet, arcTestnet } from './chains/arc';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arcTestnet, arcMainnet],
  connectors: [injected()],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
  },
  ssr: true,
});
