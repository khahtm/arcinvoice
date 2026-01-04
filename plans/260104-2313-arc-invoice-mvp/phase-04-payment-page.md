# Phase 4: Public Payment Page

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 3](./phase-03-invoice-management.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** Pending
- **Effort:** 1.5 days

Implement public payment page where payers can view and pay invoices.

## Requirements

### Functional
- Public invoice view by short code
- Direct USDC payment flow
- Payment success confirmation
- Copy payment link functionality

### Non-Functional
- Fast page load (SSR)
- Mobile responsive
- Clear payment instructions

## Files to Create

| File | Purpose |
|------|---------|
| `app/pay/[code]/page.tsx` | Public payment page |
| `app/pay/[code]/success/page.tsx` | Payment success page |
| `app/api/pay/[code]/route.ts` | Public invoice API |
| `components/wallet/ConnectButton.tsx` | Wallet connect button |
| `components/escrow/DirectPayButton.tsx` | Direct payment button |
| `hooks/useUSDCTransfer.ts` | USDC transfer hook |
| `lib/contracts/addresses.ts` | Contract addresses |
| `lib/contracts/abi.ts` | Contract ABIs |

## Implementation Steps

### Step 1: Create Contract Config

Create `lib/contracts/addresses.ts`:

```typescript
export const CONTRACTS = {
  // Arc Testnet
  18500: {
    USDC: '0x...', // TODO: Get official address
    FACTORY: '', // Deploy in Phase 5
  },
  // Arc Mainnet
  185: {
    USDC: '0x...',
    FACTORY: '',
  },
} as const;

export function getContractAddress(chainId: number, contract: 'USDC' | 'FACTORY') {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS];
  if (!addresses) throw new Error(`Unsupported chain: ${chainId}`);
  return addresses[contract] as `0x${string}`;
}
```

Create `lib/contracts/abi.ts`:

```typescript
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
```

### Step 2: Create USDC Balance Hook

Create `hooks/useUSDCBalance.ts`:

```typescript
'use client';

import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useUSDCBalance(address?: `0x${string}`) {
  const chainId = useChainId();

  const { data, isLoading, refetch } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    balance: data ? formatUnits(data, 6) : '0',
    balanceRaw: data ?? BigInt(0),
    isLoading,
    refetch,
  };
}
```

### Step 3: Create USDC Transfer Hook

Create `hooks/useUSDCTransfer.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useUSDCTransfer() {
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const transfer = async (to: `0x${string}`, amount: string) => {
    const amountWei = parseUnits(amount, 6);

    writeContract({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountWei],
    });
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
```

### Step 4: Create Connect Button

Create `components/wallet/ConnectButton.tsx`:

```typescript
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {truncateAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(address)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
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
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
```

### Step 5: Create Direct Pay Button

Create `components/escrow/DirectPayButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useUSDCTransfer } from '@/hooks/useUSDCTransfer';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useToast } from '@/components/ui/use-toast';

interface DirectPayButtonProps {
  amount: number;
  recipient: `0x${string}`;
  onSuccess: (txHash: string) => void;
}

export function DirectPayButton({ amount, recipient, onSuccess }: DirectPayButtonProps) {
  const { address, isConnected } = useAccount();
  const { balance, balanceRaw } = useUSDCBalance(address);
  const { transfer, isPending, isConfirming, isSuccess, hash, error } = useUSDCTransfer();
  const { toast } = useToast();

  const hasEnoughBalance = balanceRaw >= BigInt(Math.floor(amount * 1e6));

  const handlePay = async () => {
    try {
      await transfer(recipient, amount.toString());
    } catch (err) {
      toast({
        title: 'Payment failed',
        description: 'Transaction was rejected or failed',
        variant: 'destructive',
      });
    }
  };

  // Success callback
  if (isSuccess && hash) {
    onSuccess(hash);
  }

  if (!isConnected) {
    return (
      <Button disabled className="w-full">
        Connect wallet to pay
      </Button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled variant="destructive" className="w-full">
        Insufficient USDC balance ({balance})
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePay}
      disabled={isPending || isConfirming}
      className="w-full"
      size="lg"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
        ? 'Processing...'
        : `Pay ${amount} USDC`}
    </Button>
  );
}
```

### Step 6: Create Public Invoice API

Create `app/api/pay/[code]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('short_code', params.code.toUpperCase())
    .single();

  if (error || !data) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Don't expose creator's sensitive data
  return Response.json({
    invoice: {
      id: data.id,
      short_code: data.short_code,
      amount: data.amount,
      description: data.description,
      payment_type: data.payment_type,
      status: data.status,
      creator_wallet: data.creator_wallet,
      escrow_address: data.escrow_address,
      auto_release_days: data.auto_release_days,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { code: string } }
) {
  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: body.status,
      tx_hash: body.tx_hash,
    })
    .eq('short_code', params.code.toUpperCase())
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ invoice: data });
}
```

### Step 7: Create Payment Page

Create `app/pay/[code]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { DirectPayButton } from '@/components/escrow/DirectPayButton';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import type { Invoice } from '@/types/database';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pay/${params.code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(data.invoice);
        }
      })
      .catch(() => setError('Failed to load invoice'))
      .finally(() => setIsLoading(false));
  }, [params.code]);

  const handlePaymentSuccess = async (txHash: string) => {
    // Update invoice status
    await fetch(`/api/pay/${params.code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'released', tx_hash: txHash }),
    });

    router.push(`/pay/${params.code}/success?tx=${txHash}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-bold text-red-500">Invoice Not Found</h1>
          <p className="text-muted-foreground mt-2">
            This invoice doesn&apos;t exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  if (invoice.status === 'released' || invoice.status === 'refunded') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-bold">Invoice {invoice.status}</h1>
          <p className="text-muted-foreground mt-2">
            This invoice has already been {invoice.status}.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Invoice</p>
            <p className="font-mono">{invoice.short_code}</p>
          </div>
          <Badge>{invoice.payment_type}</Badge>
        </div>

        <div className="text-center py-6 border-y">
          <p className="text-4xl font-bold">{formatUSDC(invoice.amount)}</p>
          <p className="text-muted-foreground">USDC</p>
        </div>

        <div className="py-4 space-y-2">
          <p className="text-sm font-medium">Description</p>
          <p className="text-muted-foreground">{invoice.description}</p>
        </div>

        <div className="py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Paying to: {truncateAddress(invoice.creator_wallet)}
          </p>
        </div>

        <div className="space-y-3 mt-4">
          <ConnectButton />

          {invoice.payment_type === 'direct' && (
            <DirectPayButton
              amount={invoice.amount}
              recipient={invoice.creator_wallet as `0x${string}`}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {invoice.payment_type === 'escrow' && (
            <p className="text-sm text-muted-foreground text-center">
              Escrow payments available in Phase 6
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
```

### Step 8: Create Success Page

Create `app/pay/[code]/success/page.tsx`:

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const txHash = searchParams.get('tx');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />

        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-muted-foreground mt-2">
          Your payment has been processed successfully.
        </p>

        {txHash && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-2">Transaction Hash</p>
            <p className="font-mono text-xs break-all bg-muted p-2 rounded">
              {txHash}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                window.open(
                  `https://testnet-explorer.arc.circle.com/tx/${txHash}`,
                  '_blank'
                )
              }
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

## Todo List

- [ ] Create contract address config
- [ ] Create ERC20 ABI
- [ ] Create useUSDCBalance hook
- [ ] Create useUSDCTransfer hook
- [ ] Create ConnectButton component
- [ ] Create DirectPayButton component
- [ ] Create public invoice API
- [ ] Create payment page
- [ ] Create success page
- [ ] Test direct payment flow end-to-end

## Success Criteria

- [ ] Payment page loads with invoice details
- [ ] Wallet connects successfully
- [ ] USDC balance displays
- [ ] Transfer executes correctly
- [ ] Success page shows with tx hash
- [ ] Invoice status updates

## Next Steps

After completion, proceed to Phase 5: Smart Contracts
