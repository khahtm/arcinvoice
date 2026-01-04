# Phase 6: Escrow Integration

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 5](./phase-05-smart-contracts.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** Pending
- **Effort:** 3 days

Integrate smart contracts with frontend for escrow payment flow.

## Requirements

### Functional
- Create escrow on invoice creation
- Fund escrow via payment page
- Release funds from invoice detail
- Refund funds from invoice detail
- Display escrow status

### Non-Functional
- Transaction feedback
- Loading states
- Error handling

## Files to Create

| File | Purpose |
|------|---------|
| `lib/contracts/abi.ts` | Add factory + escrow ABIs |
| `hooks/useCreateEscrow.ts` | Escrow creation hook |
| `hooks/useEscrowStatus.ts` | Escrow status hook |
| `hooks/useFundEscrow.ts` | Fund escrow hook |
| `hooks/useReleaseEscrow.ts` | Release funds hook |
| `hooks/useRefundEscrow.ts` | Refund funds hook |
| `components/escrow/EscrowStatus.tsx` | Status display |
| `components/escrow/FundEscrowButton.tsx` | Fund button |
| `components/escrow/ReleaseButton.tsx` | Release button |
| `components/escrow/RefundButton.tsx` | Refund button |

## Implementation Steps

### Step 1: Update Contract ABIs

Update `lib/contracts/abi.ts`:

```typescript
export const ERC20_ABI = [/* ... existing ... */] as const;

export const FACTORY_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'invoiceId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'autoReleaseDays', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'EscrowCreated',
    type: 'event',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const ESCROW_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'release',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'autoRelease',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_creator', type: 'address' },
      { name: '_payer', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_state', type: 'uint8' },
      { name: '_fundedAt', type: 'uint256' },
      { name: '_autoReleaseDays', type: 'uint256' },
    ],
  },
  {
    name: 'state',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'canAutoRelease',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'Funded',
    type: 'event',
    inputs: [
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Released',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Refunded',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
```

### Step 2: Create Escrow Creation Hook

Create `hooks/useCreateEscrow.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseUnits, keccak256, toBytes } from 'viem';
import { FACTORY_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useCreateEscrow() {
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const createEscrow = async (
    invoiceId: string,
    amount: number,
    autoReleaseDays: number
  ) => {
    const invoiceIdHash = keccak256(toBytes(invoiceId));
    const amountWei = parseUnits(amount.toString(), 6);

    writeContract({
      address: getContractAddress(chainId, 'FACTORY'),
      abi: FACTORY_ABI,
      functionName: 'createEscrow',
      args: [invoiceIdHash, amountWei, BigInt(autoReleaseDays)],
    });
  };

  // Parse escrow address from receipt logs
  const getEscrowAddress = (): string | null => {
    if (!receipt?.logs) return null;

    // Find EscrowCreated event
    for (const log of receipt.logs) {
      if (log.topics[0] === keccak256(toBytes('EscrowCreated(bytes32,address,address,uint256)'))) {
        // Escrow address is second indexed param
        return `0x${log.topics[2]?.slice(26)}`;
      }
    }
    return null;
  };

  return {
    createEscrow,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    escrowAddress: isSuccess ? getEscrowAddress() : null,
  };
}
```

### Step 3: Create Escrow Status Hook

Create `hooks/useEscrowStatus.ts`:

```typescript
'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export type EscrowState = 'CREATED' | 'FUNDED' | 'RELEASED' | 'REFUNDED';

const STATE_MAP: EscrowState[] = ['CREATED', 'FUNDED', 'RELEASED', 'REFUNDED'];

export function useEscrowStatus(escrowAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'getDetails',
    query: {
      enabled: !!escrowAddress,
      refetchInterval: 10000, // Poll every 10s
    },
  });

  const { data: canAutoRelease } = useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'canAutoRelease',
    query: {
      enabled: !!escrowAddress,
    },
  });

  if (!data) {
    return {
      isLoading,
      refetch,
      creator: null,
      payer: null,
      amount: '0',
      state: null,
      fundedAt: null,
      autoReleaseDays: 0,
      canAutoRelease: false,
    };
  }

  const [creator, payer, amount, stateNum, fundedAt, autoReleaseDays] = data;

  return {
    isLoading,
    refetch,
    creator,
    payer: payer === '0x0000000000000000000000000000000000000000' ? null : payer,
    amount: formatUnits(amount, 6),
    state: STATE_MAP[stateNum] ?? null,
    fundedAt: fundedAt > 0 ? new Date(Number(fundedAt) * 1000) : null,
    autoReleaseDays: Number(autoReleaseDays),
    canAutoRelease: canAutoRelease ?? false,
  };
}
```

### Step 4: Create Fund Escrow Hook

Create `hooks/useFundEscrow.ts`:

```typescript
'use client';

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useReadContract,
  useAccount,
} from 'wagmi';
import { parseUnits } from 'viem';
import { ERC20_ABI, ESCROW_ABI } from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useFundEscrow(escrowAddress: `0x${string}`, amount: string) {
  const chainId = useChainId();
  const { address } = useAccount();
  const amountWei = parseUnits(amount, 6);

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < amountWei;

  // Approve hook
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Deposit hook
  const {
    writeContract: deposit,
    data: depositHash,
    isPending: isDepositing,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });

  const approveUSDC = () => {
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, amountWei],
    });
  };

  const fundEscrow = () => {
    deposit({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'deposit',
    });
  };

  return {
    needsApproval,
    approveUSDC,
    fundEscrow,
    isApproving: isApproving || isApproveConfirming,
    isApproveSuccess,
    isDepositing: isDepositing || isDepositConfirming,
    isDepositSuccess,
    approveHash,
    depositHash,
  };
}
```

### Step 5: Create Release/Refund Hooks

Create `hooks/useReleaseEscrow.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts/abi';

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

  return { release, hash, isPending, isConfirming, isSuccess, error };
}
```

Create `hooks/useRefundEscrow.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ESCROW_ABI } from '@/lib/contracts/abi';

export function useRefundEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const refund = () => {
    writeContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'refund',
    });
  };

  return { refund, hash, isPending, isConfirming, isSuccess, error };
}
```

### Step 6: Create Escrow Status Component

Create `components/escrow/EscrowStatus.tsx`:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { formatUSDC, truncateAddress } from '@/lib/utils';

interface EscrowStatusProps {
  escrowAddress: `0x${string}`;
}

const stateColors: Record<string, string> = {
  CREATED: 'bg-gray-500',
  FUNDED: 'bg-blue-500',
  RELEASED: 'bg-green-500',
  REFUNDED: 'bg-red-500',
};

export function EscrowStatus({ escrowAddress }: EscrowStatusProps) {
  const {
    state,
    amount,
    payer,
    fundedAt,
    autoReleaseDays,
    canAutoRelease,
    isLoading,
  } = useEscrowStatus(escrowAddress);

  if (isLoading) return <p>Loading escrow status...</p>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Escrow Status</span>
        <Badge className={stateColors[state ?? ''] ?? 'bg-gray-500'}>
          {state ?? 'Unknown'}
        </Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Amount</p>
        <p className="font-semibold">{formatUSDC(parseFloat(amount))}</p>
      </div>

      {payer && (
        <div>
          <p className="text-sm text-muted-foreground">Funded by</p>
          <p className="font-mono text-sm">{truncateAddress(payer)}</p>
        </div>
      )}

      {fundedAt && (
        <div>
          <p className="text-sm text-muted-foreground">Funded at</p>
          <p className="text-sm">{fundedAt.toLocaleDateString()}</p>
        </div>
      )}

      {state === 'FUNDED' && (
        <div>
          <p className="text-sm text-muted-foreground">Auto-release</p>
          <p className="text-sm">
            {canAutoRelease
              ? 'Available now'
              : `In ${autoReleaseDays} days from funding`}
          </p>
        </div>
      )}
    </Card>
  );
}
```

### Step 7: Create Fund Escrow Button

Create `components/escrow/FundEscrowButton.tsx`:

```typescript
'use client';

import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFundEscrow } from '@/hooks/useFundEscrow';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { parseUnits } from 'viem';

interface FundEscrowButtonProps {
  escrowAddress: `0x${string}`;
  amount: string;
  onSuccess?: () => void;
}

export function FundEscrowButton({
  escrowAddress,
  amount,
  onSuccess,
}: FundEscrowButtonProps) {
  const { address, isConnected } = useAccount();
  const { balanceRaw } = useUSDCBalance(address);
  const {
    needsApproval,
    approveUSDC,
    fundEscrow,
    isApproving,
    isApproveSuccess,
    isDepositing,
    isDepositSuccess,
  } = useFundEscrow(escrowAddress, amount);

  const amountWei = parseUnits(amount, 6);
  const hasEnoughBalance = balanceRaw >= amountWei;

  // Call onSuccess when deposit succeeds
  if (isDepositSuccess && onSuccess) {
    onSuccess();
  }

  if (!isConnected) {
    return <Button disabled>Connect wallet to fund</Button>;
  }

  if (!hasEnoughBalance) {
    return <Button disabled variant="destructive">Insufficient USDC</Button>;
  }

  if (needsApproval && !isApproveSuccess) {
    return (
      <Button onClick={approveUSDC} disabled={isApproving} className="w-full">
        {isApproving ? 'Approving...' : `Approve ${amount} USDC`}
      </Button>
    );
  }

  return (
    <Button onClick={fundEscrow} disabled={isDepositing} className="w-full">
      {isDepositing ? 'Funding...' : `Fund Escrow (${amount} USDC)`}
    </Button>
  );
}
```

### Step 8: Create Release/Refund Buttons

Create `components/escrow/ReleaseButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useReleaseEscrow } from '@/hooks/useReleaseEscrow';

interface ReleaseButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function ReleaseButton({ escrowAddress, onSuccess }: ReleaseButtonProps) {
  const { release, isPending, isConfirming, isSuccess } = useReleaseEscrow(escrowAddress);

  if (isSuccess && onSuccess) {
    onSuccess();
  }

  return (
    <Button
      onClick={release}
      disabled={isPending || isConfirming}
      className="w-full"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
        ? 'Processing...'
        : 'Release Funds'}
    </Button>
  );
}
```

Create `components/escrow/RefundButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useRefundEscrow } from '@/hooks/useRefundEscrow';

interface RefundButtonProps {
  escrowAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function RefundButton({ escrowAddress, onSuccess }: RefundButtonProps) {
  const { refund, isPending, isConfirming, isSuccess } = useRefundEscrow(escrowAddress);

  if (isSuccess && onSuccess) {
    onSuccess();
  }

  return (
    <Button
      onClick={refund}
      disabled={isPending || isConfirming}
      variant="outline"
      className="w-full"
    >
      {isPending
        ? 'Confirm in wallet...'
        : isConfirming
        ? 'Processing...'
        : 'Refund to Payer'}
    </Button>
  );
}
```

### Step 9: Update Invoice Creation Flow

Modify invoice creation in `app/(auth)/invoices/new/page.tsx` to create escrow for escrow invoices:

```typescript
// Add to handleSubmit for escrow invoices
if (data.payment_type === 'escrow') {
  // Create escrow contract
  await createEscrow(invoice.id, data.amount, data.auto_release_days);
  // Wait for transaction...
  // Update invoice with escrow_address
}
```

### Step 10: Update Payment Page for Escrow

Update `app/pay/[code]/page.tsx` to show FundEscrowButton for escrow invoices.

## Todo List

- [ ] Update contract ABIs
- [ ] Create useCreateEscrow hook
- [ ] Create useEscrowStatus hook
- [ ] Create useFundEscrow hook
- [ ] Create useReleaseEscrow hook
- [ ] Create useRefundEscrow hook
- [ ] Create EscrowStatus component
- [ ] Create FundEscrowButton component
- [ ] Create ReleaseButton component
- [ ] Create RefundButton component
- [ ] Update invoice creation flow
- [ ] Update payment page
- [ ] Test full escrow flow

## Success Criteria

- [ ] Escrow created on invoice creation
- [ ] Payment page shows fund option
- [ ] Approve + deposit flow works
- [ ] Creator can refund
- [ ] Payer can release
- [ ] Status displays correctly

## Next Steps

After completion, proceed to Phase 7: Dashboard & Polish
