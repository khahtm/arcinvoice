# Phase 2: Database & Authentication

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-project-setup.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** Pending
- **Effort:** 1.5 days

Set up Supabase database, schema, and SIWE authentication.

## Requirements

### Functional
- Supabase project connected
- Invoice table with RLS
- SIWE authentication flow
- Session management

### Non-Functional
- Secure nonce handling
- Wallet address validation
- Session persistence

## Files to Create

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `lib/supabase/middleware.ts` | Auth middleware helper |
| `app/api/auth/nonce/route.ts` | SIWE nonce endpoint |
| `app/api/auth/verify/route.ts` | SIWE verify endpoint |
| `app/api/auth/logout/route.ts` | Logout endpoint |
| `hooks/useSIWE.ts` | SIWE authentication hook |
| `types/database.ts` | Database type definitions |

## Database Schema

### SQL Migration

Execute in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Invoices table (MVP: single table)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_code VARCHAR(10) UNIQUE NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,

    -- Core fields
    amount DECIMAL(18, 6) NOT NULL,
    description TEXT NOT NULL,
    payment_type VARCHAR(10) NOT NULL CHECK (payment_type IN ('direct', 'escrow')),

    -- Optional client info
    client_name VARCHAR(255),
    client_email VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'funded', 'released', 'refunded')),

    -- Escrow fields
    escrow_address VARCHAR(42),
    auto_release_days INTEGER DEFAULT 14,
    funded_at TIMESTAMPTZ,

    -- Transaction tracking
    tx_hash VARCHAR(66),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_creator ON invoices(creator_wallet);
CREATE INDEX idx_invoices_short_code ON invoices(short_code);
CREATE INDEX idx_invoices_status ON invoices(status);

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

-- Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Public can read invoices by short_code (for payment page)
CREATE POLICY "public_read_by_code" ON invoices
    FOR SELECT USING (true);

-- Authenticated users can insert their own invoices
CREATE POLICY "creator_insert" ON invoices
    FOR INSERT WITH CHECK (true);

-- Creators can update their own invoices
CREATE POLICY "creator_update" ON invoices
    FOR UPDATE USING (true);
```

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr siwe
```

### Step 2: Create Supabase Clients

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

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

### Step 3: Create Type Definitions

Create `types/database.ts`:

```typescript
export type PaymentType = 'direct' | 'escrow';
export type InvoiceStatus = 'draft' | 'pending' | 'funded' | 'released' | 'refunded';

export interface Invoice {
  id: string;
  short_code: string;
  creator_wallet: string;
  amount: number;
  description: string;
  payment_type: PaymentType;
  client_name: string | null;
  client_email: string | null;
  status: InvoiceStatus;
  escrow_address: string | null;
  auto_release_days: number;
  funded_at: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
export type InvoiceUpdate = Partial<InvoiceInsert>;
```

### Step 4: Create SIWE Nonce Endpoint

Create `app/api/auth/nonce/route.ts`:

```typescript
import { generateNonce } from 'siwe';
import { cookies } from 'next/headers';

export async function GET() {
  const nonce = generateNonce();

  // Store nonce in cookie (expires in 5 minutes)
  const cookieStore = await cookies();
  cookieStore.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 5,
  });

  return Response.json({ nonce });
}
```

### Step 5: Create SIWE Verify Endpoint

Create `app/api/auth/verify/route.ts`:

```typescript
import { SiweMessage } from 'siwe';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { message, signature } = await req.json();
    const cookieStore = await cookies();

    // Get stored nonce
    const storedNonce = cookieStore.get('siwe-nonce')?.value;
    if (!storedNonce) {
      return Response.json({ error: 'Nonce expired' }, { status: 400 });
    }

    // Verify SIWE message
    const siweMessage = new SiweMessage(message);
    const { success, data } = await siweMessage.verify({
      signature,
      nonce: storedNonce,
    });

    if (!success) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Clear nonce
    cookieStore.delete('siwe-nonce');

    // Set session cookie with wallet address
    cookieStore.set('wallet-address', data.address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json({
      success: true,
      address: data.address,
    });
  } catch (error) {
    console.error('SIWE verify error:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
```

### Step 6: Create Logout Endpoint

Create `app/api/auth/logout/route.ts`:

```typescript
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('wallet-address');
  return Response.json({ success: true });
}
```

### Step 7: Create SIWE Hook

Create `hooks/useSIWE.ts`:

```typescript
'use client';

import { useAccount, useSignMessage, useChainId } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useState, useCallback } from 'react';

export function useSIWE() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async () => {
    if (!address) throw new Error('No wallet connected');

    setIsLoading(true);
    try {
      // Get nonce
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Arc Invoice',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });

      // Sign message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Verify on backend
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        throw new Error('Verification failed');
      }

      return await verifyRes.json();
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
  }, []);

  return { signIn, signOut, isLoading };
}
```

### Step 8: Create Session Hook

Create `hooks/useSession.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';

export function useSession() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setWalletAddress(data.address || null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { walletAddress, isLoading, isAuthenticated: !!walletAddress };
}
```

Create `app/api/auth/session/route.ts`:

```typescript
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const address = cookieStore.get('wallet-address')?.value;

  return Response.json({ address: address || null });
}
```

### Step 9: Update Environment

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Todo List

- [ ] Create Supabase project
- [ ] Run database migration SQL
- [ ] Install Supabase and SIWE packages
- [ ] Create Supabase client files
- [ ] Create database type definitions
- [ ] Implement nonce endpoint
- [ ] Implement verify endpoint
- [ ] Implement logout endpoint
- [ ] Create useSIWE hook
- [ ] Create useSession hook
- [ ] Add environment variables
- [ ] Test SIWE flow end-to-end

## Success Criteria

- [ ] Supabase connection working
- [ ] Invoice table created with RLS
- [ ] SIWE nonce generation works
- [ ] SIWE signature verification works
- [ ] Session persists across page reloads
- [ ] Logout clears session

## Security Considerations

- Nonce expires after 5 minutes
- HttpOnly cookies prevent XSS
- Secure flag in production
- SameSite strict prevents CSRF

## Next Steps

After completion, proceed to Phase 3: Invoice Creation & Management
