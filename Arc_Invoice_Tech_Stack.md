# Arc Invoice - Tech Stack Documentation

## Complete Technology Stack with Rabbit Wallet Integration

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Frontend Stack](#2-frontend-stack)
3. [Wallet Integration (Rabbit Wallet)](#3-wallet-integration-rabbit-wallet)
4. [Smart Contract Stack](#4-smart-contract-stack)
5. [Backend & Database](#5-backend--database)
6. [Infrastructure & DevOps](#6-infrastructure--devops)
7. [Third-Party Services](#7-third-party-services)
8. [Development Tools](#8-development-tools)
9. [Project Structure](#9-project-structure)
10. [Environment Variables](#10-environment-variables)
11. [Package Dependencies](#11-package-dependencies)

---

## 1. Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARC INVOICE TECH STACK                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  FRONTEND   │  │   WALLET    │  │  BLOCKCHAIN │              │
│  │  ─────────  │  │  ─────────  │  │  ─────────  │              │
│  │  Next.js 14 │  │   Rabbit    │  │  Arc (L1)   │              │
│  │  React 18   │  │   Wallet    │  │  Solidity   │              │
│  │  TypeScript │  │  ─────────  │  │  Hardhat    │              │
│  │  Tailwind   │  │  wagmi v2   │  │  Foundry    │              │
│  │  shadcn/ui  │  │  viem       │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  BACKEND    │  │  DATABASE   │  │  SERVICES   │              │
│  │  ─────────  │  │  ─────────  │  │  ─────────  │              │
│  │  Next.js    │  │  Supabase   │  │  Resend     │              │
│  │  API Routes │  │  PostgreSQL │  │  Uploadthing│              │
│  │  tRPC       │  │  Realtime   │  │  Vercel     │              │
│  │  (optional) │  │             │  │  Analytics  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Reference

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | UI components |
| **Wallet** | Rabbit Wallet + wagmi v2 | Wallet connection |
| **Blockchain** | Arc (Circle L1) | Smart contract deployment |
| **Contracts** | Solidity + Hardhat | Smart contract development |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **Auth** | Wallet-based (SIWE) | Authentication |
| **Email** | Resend | Transactional emails |
| **File Upload** | Uploadthing | Evidence/file uploads |
| **Hosting** | Vercel | Deployment |
| **Analytics** | Vercel Analytics | Usage tracking |

---

## 2. Frontend Stack

### 2.1 Core Framework

```json
{
  "framework": "Next.js 14",
  "features": [
    "App Router",
    "Server Components",
    "Server Actions",
    "API Routes",
    "Middleware"
  ]
}
```

**Why Next.js 14?**
- App Router for better file-based routing
- Server Components reduce client bundle size
- Built-in API routes (no separate backend needed)
- Excellent Vercel deployment integration
- Great for vibe coding with Claude Code

### 2.2 UI Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 18.x | UI library |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **shadcn/ui** | latest | Pre-built components |
| **Radix UI** | latest | Headless primitives |
| **Lucide React** | latest | Icons |
| **Framer Motion** | 10.x | Animations |

### 2.3 shadcn/ui Components to Install

```bash
# Essential components for Arc Invoice
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add form
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
```

### 2.4 Form Handling

| Library | Purpose |
|---------|---------|
| **React Hook Form** | Form state management |
| **Zod** | Schema validation |
| **@hookform/resolvers** | Zod integration |

```typescript
// Example: Invoice form schema
import { z } from 'zod';

export const invoiceSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USDC', 'EURC']),
  description: z.string().min(1, 'Description required'),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  dueDate: z.date().optional(),
  paymentType: z.enum(['direct', 'escrow', 'milestone']),
  autoReleaseDays: z.number().min(1).max(90).default(14),
});
```

---

## 3. Wallet Integration (Rabbit Wallet)

### 3.1 What is Rabbit Wallet?

Rabbit Wallet is a wallet designed for the Arc blockchain ecosystem. It provides:
- Native Arc chain support
- USDC gas payments (Arc's native gas token)
- Clean mobile and browser extension UX
- Built-in stablecoin management

### 3.2 Integration Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    WALLET INTEGRATION STACK                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      Your App                           │   │
│   └───────────────────────────┬─────────────────────────────┘   │
│                               │                                 │
│                               ▼                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     wagmi v2                            │   │
│   │  • useAccount()     • useConnect()                      │   │
│   │  • useBalance()     • useDisconnect()                   │   │
│   │  • useWriteContract()  • useWaitForTransaction()        │   │
│   └───────────────────────────┬─────────────────────────────┘   │
│                               │                                 │
│                               ▼                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                      viem                               │   │
│   │  • Contract interactions  • ABI encoding                │   │
│   │  • Transaction building   • Type safety                 │   │
│   └───────────────────────────┬─────────────────────────────┘   │
│                               │                                 │
│                               ▼                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   Rabbit Wallet                         │   │
│   │  • Browser Extension      • Mobile App                  │   │
│   │  • Arc Chain Native       • USDC Gas                    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Dependencies

```bash
npm install wagmi viem @tanstack/react-query
```

### 3.4 Arc Chain Configuration

```typescript
// lib/chains/arc.ts
import { defineChain } from 'viem';

export const arcMainnet = defineChain({
  id: 185, // Arc mainnet chain ID (placeholder - check official docs)
  name: 'Arc',
  nativeCurrency: {
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.arc.circle.com'], // Official RPC
    },
    public: {
      http: ['https://rpc.arc.circle.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorer.arc.circle.com',
    },
  },
  contracts: {
    // Add deployed contract addresses here
  },
});

export const arcTestnet = defineChain({
  id: 18500, // Arc testnet chain ID (placeholder)
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.arc.circle.com'],
    },
    public: {
      http: ['https://testnet-rpc.arc.circle.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Testnet Explorer',
      url: 'https://testnet-explorer.arc.circle.com',
    },
  },
  testnet: true,
});
```

### 3.5 Wagmi Configuration

```typescript
// lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { arcMainnet, arcTestnet } from './chains/arc';
import { injected, walletConnect } from 'wagmi/connectors';

// Rabbit Wallet connector (injected)
const rabbitWallet = injected({
  target: {
    id: 'rabbitWallet',
    name: 'Rabbit Wallet',
    provider: (window) => {
      // Rabbit Wallet injects as window.rabbitWallet or window.ethereum
      return (window as any).rabbitWallet ?? (window as any).ethereum;
    },
  },
});

export const config = createConfig({
  chains: [arcMainnet, arcTestnet],
  connectors: [
    rabbitWallet,
    injected(), // Fallback for other wallets
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    }),
  ],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
  },
});
```

### 3.6 Provider Setup

```typescript
// app/providers.tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 3.7 Wallet Connection Component

```typescript
// components/wallet/ConnectButton.tsx
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink } from 'lucide-react';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Find Rabbit Wallet connector
  const rabbitConnector = connectors.find((c) => c.id === 'rabbitWallet');

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {address.slice(0, 6)}...{address.slice(-4)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(address)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              window.open(
                `https://explorer.arc.circle.com/address/${address}`,
                '_blank'
              )
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={() => rabbitConnector && connect({ connector: rabbitConnector })}
      disabled={isPending}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Rabbit Wallet'}
    </Button>
  );
}
```

### 3.8 USDC Balance Hook

```typescript
// hooks/useUSDCBalance.ts
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const USDC_ADDRESS = '0x...'; // Arc USDC contract address
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function useUSDCBalance(address?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: data ? formatUnits(data, 6) : '0',
    balanceRaw: data ?? BigInt(0),
    isLoading,
    refetch,
  };
}
```

### 3.9 Contract Interaction Hooks

```typescript
// hooks/useEscrow.ts
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { parseUnits } from 'viem';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export function useDepositEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (amount: string) => {
    const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals

    // First approve USDC spending
    // Then deposit
    writeContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'deposit',
    });
  };

  return {
    deposit,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  };
}

export function useReleaseEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const release = () => {
    writeContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'release',
    });
  };

  return {
    release,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
  };
}

export function useEscrowStatus(escrowAddress: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'getDetails',
  });

  return {
    details: data,
    isLoading,
    refetch,
  };
}
```

---

## 4. Smart Contract Stack

### 4.1 Development Framework

| Tool | Purpose |
|------|---------|
| **Hardhat** | Primary development framework |
| **Foundry** | Fast testing (optional) |
| **Solidity 0.8.19+** | Smart contract language |
| **OpenZeppelin** | Security libraries |

### 4.2 Contract Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

### 4.3 Hardhat Configuration

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || 'https://testnet-rpc.arc.circle.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 18500,
    },
    arcMainnet: {
      url: process.env.ARC_MAINNET_RPC_URL || 'https://rpc.arc.circle.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 185,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_EXPLORER_API_KEY || '',
      arcMainnet: process.env.ARC_EXPLORER_API_KEY || '',
    },
    customChains: [
      {
        network: 'arcTestnet',
        chainId: 18500,
        urls: {
          apiURL: 'https://testnet-explorer.arc.circle.com/api',
          browserURL: 'https://testnet-explorer.arc.circle.com',
        },
      },
      {
        network: 'arcMainnet',
        chainId: 185,
        urls: {
          apiURL: 'https://explorer.arc.circle.com/api',
          browserURL: 'https://explorer.arc.circle.com',
        },
      },
    ],
  },
};

export default config;
```

### 4.4 Contract Structure

```
contracts/
├── ArcInvoiceFactory.sol      # Factory for deploying escrows
├── ArcInvoiceEscrow.sol       # Simple escrow contract
├── ArcMilestoneEscrow.sol     # Milestone-based escrow
├── interfaces/
│   ├── IArcInvoiceEscrow.sol
│   └── IArcMilestoneEscrow.sol
└── libraries/
    └── InvoiceLib.sol         # Shared utilities
```

### 4.5 Deployment Script

```typescript
// scripts/deploy.ts
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Get USDC address for the network
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const DEFAULT_ARBITRATOR = process.env.DEFAULT_ARBITRATOR;

  // Deploy Factory
  const Factory = await ethers.getContractFactory('ArcInvoiceFactory');
  const factory = await Factory.deploy(USDC_ADDRESS, DEFAULT_ARBITRATOR);
  await factory.waitForDeployment();

  console.log('ArcInvoiceFactory deployed to:', await factory.getAddress());

  // Verify on explorer
  console.log('Verifying contract...');
  await run('verify:verify', {
    address: await factory.getAddress(),
    constructorArguments: [USDC_ADDRESS, DEFAULT_ARBITRATOR],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## 5. Backend & Database

### 5.1 Supabase Setup

```bash
npm install @supabase/supabase-js
```

### 5.2 Supabase Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### 5.3 Database Schema (Supabase SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_code VARCHAR(10) UNIQUE NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,
    
    -- Invoice details
    amount DECIMAL(18, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    description TEXT NOT NULL,
    
    -- Client info
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    
    -- Payment type: 'direct', 'escrow', 'milestone'
    payment_type VARCHAR(20) NOT NULL,
    
    -- Dates
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status: 'draft', 'sent', 'viewed', 'funded', 'released', 'disputed', 'refunded'
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Escrow details
    escrow_address VARCHAR(42),
    auto_release_days INTEGER DEFAULT 14,
    
    -- Transaction info
    tx_hash VARCHAR(66),
    paid_at TIMESTAMPTZ
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(18, 6) NOT NULL,
    order_index INTEGER NOT NULL,
    
    -- Status: 'pending', 'submitted', 'approved', 'rejected'
    status VARCHAR(20) DEFAULT 'pending',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    tx_hash VARCHAR(66),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    
    opened_by VARCHAR(42) NOT NULL,
    reason TEXT NOT NULL,
    
    response TEXT,
    responded_at TIMESTAMPTZ,
    
    -- Resolution: 'creator', 'payer', 'split'
    resolution VARCHAR(20),
    creator_amount DECIMAL(18, 6),
    payer_amount DECIMAL(18, 6),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(42),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deadline TIMESTAMPTZ
);

-- Evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    
    submitted_by VARCHAR(42) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'file', 'link', 'text'
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_creator ON invoices(creator_wallet);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_short_code ON invoices(short_code);
CREATE INDEX idx_milestones_invoice ON milestones(invoice_id);
CREATE INDEX idx_disputes_invoice ON disputes(invoice_id);

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- Policies (simplified - wallet-based auth)
CREATE POLICY "Users can view their own invoices"
    ON invoices FOR SELECT
    USING (creator_wallet = current_setting('app.current_wallet', true));

CREATE POLICY "Users can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (creator_wallet = current_setting('app.current_wallet', true));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### 5.4 Type Definitions

```typescript
// types/database.ts
export interface Invoice {
  id: string;
  short_code: string;
  creator_wallet: string;
  amount: number;
  currency: string;
  description: string;
  client_name?: string;
  client_email?: string;
  payment_type: 'direct' | 'escrow' | 'milestone';
  due_date?: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'sent' | 'viewed' | 'funded' | 'released' | 'disputed' | 'refunded';
  escrow_address?: string;
  auto_release_days: number;
  tx_hash?: string;
  paid_at?: string;
}

export interface Milestone {
  id: string;
  invoice_id: string;
  name: string;
  description?: string;
  amount: number;
  order_index: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  tx_hash?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  invoice_id: string;
  opened_by: string;
  reason: string;
  response?: string;
  responded_at?: string;
  resolution?: 'creator' | 'payer' | 'split';
  creator_amount?: number;
  payer_amount?: number;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  deadline?: string;
}

export interface Evidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  type: 'file' | 'link' | 'text';
  content: string;
  file_url?: string;
  created_at: string;
}
```

---

## 6. Infrastructure & DevOps

### 6.1 Hosting Stack

| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend + API hosting |
| **Supabase** | Database + Realtime |
| **Uploadthing** | File storage |

### 6.2 Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID": "@walletconnect_project_id"
  }
}
```

### 6.3 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Compile contracts
        run: npx hardhat compile
      
      - name: Run contract tests
        run: npx hardhat test
```

---

## 7. Third-Party Services

### 7.1 Email (Resend)

```bash
npm install resend
```

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail({
  to,
  invoiceId,
  amount,
  creatorName,
  paymentLink,
}: {
  to: string;
  invoiceId: string;
  amount: string;
  creatorName: string;
  paymentLink: string;
}) {
  await resend.emails.send({
    from: 'Arc Invoice <invoices@yourdomain.com>',
    to,
    subject: `Invoice from ${creatorName} - ${amount} USDC`,
    html: `
      <h1>You've received an invoice</h1>
      <p>${creatorName} has sent you an invoice for ${amount} USDC.</p>
      <a href="${paymentLink}">Pay Invoice</a>
    `,
  });
}

export async function sendPaymentReceivedEmail({
  to,
  amount,
  payerAddress,
  txHash,
}: {
  to: string;
  amount: string;
  payerAddress: string;
  txHash: string;
}) {
  await resend.emails.send({
    from: 'Arc Invoice <invoices@yourdomain.com>',
    to,
    subject: `Payment Received - ${amount} USDC`,
    html: `
      <h1>Payment Received!</h1>
      <p>You've received ${amount} USDC from ${payerAddress}.</p>
      <a href="https://explorer.arc.circle.com/tx/${txHash}">View Transaction</a>
    `,
  });
}
```

### 7.2 File Uploads (Uploadthing)

```bash
npm install uploadthing @uploadthing/react
```

```typescript
// lib/uploadthing.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next';

const f = createUploadthing();

export const ourFileRouter = {
  evidenceUploader: f({
    image: { maxFileSize: '4MB', maxFileCount: 5 },
    pdf: { maxFileSize: '8MB', maxFileCount: 3 },
  })
    .middleware(async ({ req }) => {
      // Verify wallet auth here
      return { uploadedBy: 'wallet-address' };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete:', file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

### 7.3 Analytics (Vercel Analytics)

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 8. Development Tools

### 8.1 Code Quality

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |

### 8.2 Configuration Files

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false
}
```

```json
// package.json (scripts)
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest",
    "test:contracts": "hardhat test",
    "compile": "hardhat compile",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network arcTestnet",
    "deploy:mainnet": "hardhat run scripts/deploy.ts --network arcMainnet"
  }
}
```

---

## 9. Project Structure

```
arc-invoice/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authenticated routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx          # Invoice list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create invoice
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Invoice detail
│   │   ├── disputes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── (public)/                 # Public routes
│   │   ├── pay/
│   │   │   └── [code]/
│   │   │       ├── page.tsx      # Payment page
│   │   │       └── success/
│   │   │           └── page.tsx
│   │   └── escrow/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── api/                      # API routes
│   │   ├── invoices/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── disputes/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page
│   └── providers.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   ├── wallet/
│   │   ├── ConnectButton.tsx
│   │   └── WalletInfo.tsx
│   ├── invoice/
│   │   ├── InvoiceForm.tsx
│   │   ├── InvoiceCard.tsx
│   │   ├── InvoiceList.tsx
│   │   ├── PaymentTypeSelector.tsx
│   │   └── MilestoneEditor.tsx
│   ├── escrow/
│   │   ├── EscrowStatus.tsx
│   │   ├── EscrowActions.tsx
│   │   ├── FundButton.tsx
│   │   └── ReleaseButton.tsx
│   ├── dispute/
│   │   ├── DisputeForm.tsx
│   │   ├── EvidenceUploader.tsx
│   │   └── DisputeTimeline.tsx
│   └── common/
│       ├── Loading.tsx
│       └── EmptyState.tsx
│
├── hooks/
│   ├── useUSDCBalance.ts
│   ├── useEscrow.ts
│   ├── useMilestone.ts
│   └── useInvoice.ts
│
├── lib/
│   ├── wagmi.ts                  # Wagmi config
│   ├── chains/
│   │   └── arc.ts                # Arc chain definition
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── contracts/
│   │   ├── abi.ts                # Contract ABIs
│   │   └── addresses.ts          # Deployed addresses
│   ├── email.ts
│   └── utils.ts
│
├── contracts/                    # Solidity contracts
│   ├── ArcInvoiceFactory.sol
│   ├── ArcInvoiceEscrow.sol
│   ├── ArcMilestoneEscrow.sol
│   └── interfaces/
│
├── scripts/                      # Deployment scripts
│   └── deploy.ts
│
├── test/                         # Contract tests
│   └── ArcInvoiceEscrow.test.ts
│
├── types/
│   ├── database.ts
│   └── contracts.ts
│
├── public/
│   └── images/
│
├── .env.example
├── .env.local
├── .eslintrc.json
├── .prettierrc
├── hardhat.config.ts
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 10. Environment Variables

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Wallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Arc Chain
NEXT_PUBLIC_ARC_CHAIN_ID=18500
NEXT_PUBLIC_ARC_RPC_URL=https://testnet-rpc.arc.circle.com
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet-explorer.arc.circle.com

# Contracts (update after deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# Deployment
PRIVATE_KEY=your_deployer_private_key
ARC_TESTNET_RPC_URL=https://testnet-rpc.arc.circle.com
ARC_MAINNET_RPC_URL=https://rpc.arc.circle.com
ARC_EXPLORER_API_KEY=your_explorer_api_key

# Services
RESEND_API_KEY=your_resend_api_key
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id
```

---

## 11. Package Dependencies

### 11.1 Full package.json

```json
{
  "name": "arc-invoice",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest",
    "test:contracts": "hardhat test",
    "compile": "hardhat compile",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network arcTestnet",
    "deploy:mainnet": "hardhat run scripts/deploy.ts --network arcMainnet",
    "prepare": "husky install"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    
    "wagmi": "2.5.0",
    "viem": "2.7.0",
    "@tanstack/react-query": "5.17.0",
    
    "@supabase/supabase-js": "2.39.0",
    "@supabase/ssr": "0.1.0",
    
    "react-hook-form": "7.49.0",
    "zod": "3.22.0",
    "@hookform/resolvers": "3.3.0",
    
    "@radix-ui/react-dialog": "1.0.5",
    "@radix-ui/react-dropdown-menu": "2.0.6",
    "@radix-ui/react-label": "2.0.2",
    "@radix-ui/react-popover": "1.0.7",
    "@radix-ui/react-select": "2.0.0",
    "@radix-ui/react-slot": "1.0.2",
    "@radix-ui/react-tabs": "1.0.4",
    "@radix-ui/react-toast": "1.1.5",
    
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "2.2.0",
    "lucide-react": "0.309.0",
    "framer-motion": "10.18.0",
    
    "resend": "3.0.0",
    "uploadthing": "6.3.0",
    "@uploadthing/react": "6.2.0",
    
    "@vercel/analytics": "1.1.0",
    "nanoid": "5.0.0",
    "date-fns": "3.2.0"
  },
  "devDependencies": {
    "typescript": "5.3.0",
    "@types/node": "20.10.0",
    "@types/react": "18.2.0",
    "@types/react-dom": "18.2.0",
    
    "tailwindcss": "3.4.0",
    "postcss": "8.4.0",
    "autoprefixer": "10.4.0",
    
    "eslint": "8.56.0",
    "eslint-config-next": "14.1.0",
    "@typescript-eslint/eslint-plugin": "6.18.0",
    "@typescript-eslint/parser": "6.18.0",
    
    "prettier": "3.2.0",
    "husky": "8.0.0",
    "lint-staged": "15.2.0",
    
    "hardhat": "2.19.0",
    "@nomicfoundation/hardhat-toolbox": "4.0.0",
    "@openzeppelin/contracts": "5.0.0",
    
    "vitest": "1.2.0",
    "@testing-library/react": "14.1.0",
    
    "dotenv": "16.3.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 11.2 Quick Install Commands

```bash
# Create Next.js project
npx create-next-app@latest arc-invoice --typescript --tailwind --eslint --app --src-dir=false

# Install core dependencies
npm install wagmi viem @tanstack/react-query
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers
npm install resend uploadthing @uploadthing/react
npm install @vercel/analytics nanoid date-fns framer-motion

# Install shadcn/ui
npx shadcn-ui@latest init

# Install dev dependencies
npm install -D hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
npm install -D vitest @testing-library/react
npm install -D husky lint-staged

# Initialize Hardhat
npx hardhat init
```

---

## Summary

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind, shadcn/ui |
| **Wallet** | Rabbit Wallet, wagmi v2, viem |
| **Blockchain** | Arc (Circle L1), Solidity 0.8.19, Hardhat |
| **Database** | Supabase (PostgreSQL) |
| **Email** | Resend |
| **Files** | Uploadthing |
| **Hosting** | Vercel |
| **Analytics** | Vercel Analytics |

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Built for Arc Blockchain with Rabbit Wallet*
