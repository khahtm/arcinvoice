import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

// Load .env.local first, then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config();

// Get private key (trimmed, remove quotes if present)
let privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (privateKey) {
  privateKey = privateKey.replace(/^["']|["']$/g, '');
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network',
      accounts: privateKey ? [privateKey] : [],
      chainId: 5042002,
      timeout: 120000,
    },
    arcMainnet: {
      url: process.env.ARC_MAINNET_RPC_URL || 'https://rpc.arc.circle.com',
      accounts: privateKey ? [privateKey] : [],
      chainId: 5042001,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_EXPLORER_API_KEY || '',
    },
    customChains: [
      {
        network: 'arcTestnet',
        chainId: 5042002,
        urls: {
          apiURL: 'https://testnet.arcscan.app/api',
          browserURL: 'https://testnet.arcscan.app',
        },
      },
    ],
  },
};

export default config;
