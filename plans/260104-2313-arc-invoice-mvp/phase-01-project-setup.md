# Phase 1: Project Setup & Dependencies

## Context

- Plan: [plan.md](./plan.md)
- Architecture: [brainstorm report](../reports/brainstorm-260104-2309-arc-invoice-mvp-architecture.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** ✅ Completed
- **Effort:** 1 day
- **Actual:** Completed 2026-01-04
- **Review:** [Code Review Report](../reports/code-reviewer-260104-2357-phase1-project-setup.md)

Set up project foundation with all required dependencies, configurations, and basic structure.

## Requirements

### Functional
- wagmi v2 configured for Arc chain
- Tailwind CSS + shadcn/ui ready
- Project structure matching architecture
- Development environment working

### Non-Functional
- Hot reload working
- Type safety enforced
- Lint rules active

## Files to Create

| File | Purpose |
|------|---------|
| `lib/wagmi.ts` | wagmi configuration |
| `lib/chains/arc.ts` | Arc chain definition |
| `app/providers.tsx` | Provider wrapper |
| `components/ui/*` | shadcn components |
| `.env.example` | Environment template |
| `.env.local` | Local environment (gitignored) |

## Files to Modify

| File | Change |
|------|--------|
| `app/layout.tsx` | Add providers |
| `package.json` | Add dependencies |
| `tailwind.config.ts` | Update for shadcn |

## Implementation Steps

### Step 1: Install Core Dependencies

```bash
# Wallet integration
npm install wagmi viem @tanstack/react-query

# UI components
npm install class-variance-authority clsx tailwind-merge lucide-react

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Utils
npm install nanoid
```

### Step 2: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Select options:
- Style: Default
- Base color: Slate
- CSS variables: Yes

### Step 3: Add shadcn Components

```bash
npx shadcn@latest add button card input label select textarea dialog dropdown-menu table tabs toast badge skeleton
```

### Step 4: Create Arc Chain Definition

Create `lib/chains/arc.ts`:

```typescript
import { defineChain } from 'viem';

export const arcMainnet = defineChain({
  id: 185, // Placeholder - confirm official
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
  id: 18500, // Placeholder - confirm official
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
```

### Step 5: Create wagmi Configuration

Create `lib/wagmi.ts`:

```typescript
import { createConfig, http } from 'wagmi';
import { arcMainnet, arcTestnet } from './chains/arc';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arcTestnet, arcMainnet],
  connectors: [
    injected({
      target: {
        id: 'rabbitWallet',
        name: 'Rabbit Wallet',
        provider: (window) => (window as any).rabbitWallet ?? (window as any).ethereum,
      },
    }),
    injected(), // Fallback
  ],
  transports: {
    [arcMainnet.id]: http(),
    [arcTestnet.id]: http(),
  },
});
```

### Step 6: Create Providers

Create `app/providers.tsx`:

```typescript
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Step 7: Update Layout

Modify `app/layout.tsx`:

```typescript
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

### Step 8: Create Environment Files

Create `.env.example`:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Chain
NEXT_PUBLIC_CHAIN_ID=18500
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.arc.circle.com

# Contracts (update after deployment)
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=

# Supabase (Phase 2)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Step 9: Create Project Structure

```bash
mkdir -p lib/chains lib/contracts lib/supabase
mkdir -p components/wallet components/invoice components/escrow components/layout components/ui
mkdir -p hooks
mkdir -p types
mkdir -p app/\(auth\)/dashboard app/\(auth\)/invoices/new app/\(auth\)/invoices/\[id\]
mkdir -p app/pay/\[code\]/success
mkdir -p app/api/auth/nonce app/api/auth/verify
mkdir -p app/api/invoices/\[id\]
```

## Todo List

- [x] Install core dependencies (wagmi, viem, react-query)
- [x] Initialize shadcn/ui
- [x] Add required shadcn components
- [x] Create Arc chain definitions
- [x] Create wagmi configuration
- [x] Create providers wrapper
- [x] Update root layout
- [x] Create environment files
- [x] Create directory structure
- [x] Test wallet connection works

## Success Criteria

- [x] `npm run dev` starts without errors
- [x] shadcn components render correctly
- [x] wagmi hooks accessible in components
- [x] Arc chain defined and selectable
- [x] Environment variables loading

## Code Review Results

**Status**: ✅ APPROVED - Production Ready
**Date**: 2026-01-04
**Report**: [Full Review](../reports/code-reviewer-260104-2357-phase1-project-setup.md)

**Summary**:
- Critical Issues: 0
- High Priority: 0
- Medium Priority: 3 (optional for MVP)
- Low Priority: 2 (nice-to-haves)
- Build: ✅ Passes
- Lint: ✅ Passes
- Type Safety: ✅ Full compliance

**Verdict**: Ready for Phase 2

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| shadcn v4 compatibility | Use latest shadcn CLI, check docs |
| Arc chain config wrong | Test on testnet immediately |
| Wallet detection issues | Have injected fallback ready |

## Next Steps

After completion, proceed to Phase 2: Database & Authentication
