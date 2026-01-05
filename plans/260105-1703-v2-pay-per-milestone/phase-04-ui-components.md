# Phase 4: UI Components

## Overview

Update payment page and invoice detail page to support pay-per-milestone flow.

---

## 1. Create FundMilestoneButton Component

**File:** `components/escrow/FundMilestoneButton.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFundMilestone } from '@/hooks/useFundMilestone';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { Loader2 } from 'lucide-react';

interface FundMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  milestoneIndex: number;
  milestoneAmount: number;
  isCurrentMilestone: boolean;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function FundMilestoneButton({
  escrowAddress,
  milestoneIndex,
  milestoneAmount,
  isCurrentMilestone,
  onSuccess,
  onError,
}: FundMilestoneButtonProps) {
  const { address, isConnected } = useAccount();
  const { balanceRaw } = useUSDCBalance(address);
  const {
    needsApproval,
    approveUSDC,
    fundMilestone,
    isApproving,
    isApproveSuccess,
    isFunding,
    isFundSuccess,
    fundHash,
    payerAmountDisplay,
    isLoadingAmount,
  } = useFundMilestone(escrowAddress, milestoneIndex, milestoneAmount);

  // Balance check
  const payerAmountWei = BigInt(Math.round(payerAmountDisplay * 1_000_000));
  const hasEnoughBalance = balanceRaw >= payerAmountWei;

  // Success callback
  useEffect(() => {
    if (isFundSuccess && fundHash && onSuccess) {
      onSuccess(fundHash);
    }
  }, [isFundSuccess, fundHash, onSuccess]);

  if (!isConnected) {
    return <Button disabled size="sm">Connect wallet</Button>;
  }

  if (!isCurrentMilestone) {
    return (
      <Button disabled size="sm" variant="outline">
        Pending
      </Button>
    );
  }

  if (isLoadingAmount) {
    return (
      <Button disabled size="sm">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!hasEnoughBalance) {
    return (
      <Button disabled size="sm" variant="destructive">
        Insufficient USDC
      </Button>
    );
  }

  if (needsApproval) {
    return (
      <Button onClick={approveUSDC} disabled={isApproving} size="sm">
        {isApproving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Approve ${payerAmountDisplay.toFixed(2)}
      </Button>
    );
  }

  return (
    <Button onClick={fundMilestone} disabled={isFunding} size="sm">
      {isFunding ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : null}
      Fund ${payerAmountDisplay.toFixed(2)}
    </Button>
  );
}
```

---

## 2. Update Payment Page

**File:** `app/pay/[code]/page.tsx`

### Changes:

1. **Fetch milestones with on-chain status**
2. **Show milestone list with individual fund buttons**
3. **Track current fundable milestone**

### Key Updates:

```typescript
// Add imports
import { FundMilestoneButton } from '@/components/escrow/FundMilestoneButton';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';

// Inside component, after invoice fetch:
const { currentMilestone } = useEscrowStatus(
  invoice?.escrow_address as `0x${string}` | undefined,
  invoice?.contract_version
);

// Replace V2 milestone section with:
{invoice.contract_version === 3 && milestones.length > 0 && (
  <div className="py-4 border-t space-y-3">
    <p className="text-sm font-medium">Payment Milestones</p>
    {milestones.map((m, i) => (
      <div key={m.id} className="flex justify-between items-center p-3 border rounded-lg">
        <div>
          <p className="font-medium">
            {i + 1}. {m.description}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatUSDC(m.amount)}
          </p>
        </div>
        <div>
          {m.status === 'released' ? (
            <Badge>Released</Badge>
          ) : m.status === 'funded' ? (
            <Badge variant="secondary">Funded</Badge>
          ) : (
            <FundMilestoneButton
              escrowAddress={invoice.escrow_address as `0x${string}`}
              milestoneIndex={i}
              milestoneAmount={m.amount}
              isCurrentMilestone={i === currentMilestone}
              onSuccess={(txHash) => handleMilestoneFundSuccess(m.id, txHash)}
            />
          )}
        </div>
      </div>
    ))}
    <p className="text-xs text-muted-foreground">
      Fund milestones sequentially as work is completed
    </p>
  </div>
)}
```

### Add handler:

```typescript
const handleMilestoneFundSuccess = async (milestoneId: string, txHash: string) => {
  try {
    await fetch(`/api/invoices/${invoice.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'funded' }),
    });
    toast.success('Milestone funded!');
    // Refresh milestones
    fetchMilestones();
  } catch {
    toast.error('Status update failed');
  }
};
```

---

## 3. Update Invoice Detail Page

**File:** `app/(auth)/invoices/[id]/page.tsx`

### Changes:

1. **Remove ApproveMilestoneButton import and usage**
2. **Update milestone display to show funded status**
3. **Show release button when milestone is funded**

### Key Updates:

```typescript
// REMOVE this import
// import { ApproveMilestoneButton } from '@/components/escrow/ApproveMilestoneButton';

// Update milestone rendering:
{milestones.map((milestone, index) => (
  <div key={milestone.id} className="...">
    <div>
      <p className="font-medium">
        Milestone {index + 1}: {formatUSDC(milestone.amount)}
      </p>
      <p className="text-sm text-muted-foreground">
        {milestone.description}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <Badge
        variant={
          milestone.status === 'released' ? 'default' :
          milestone.status === 'funded' ? 'secondary' : 'outline'
        }
      >
        {milestone.status}
      </Badge>

      {/* Creator releases funded milestones */}
      {invoice.status === 'funded' &&
        milestone.status === 'funded' &&
        walletAddress?.toLowerCase() === invoice.creator_wallet?.toLowerCase() && (
          <ReleaseMilestoneButton
            escrowAddress={invoice.escrow_address as `0x${string}`}
            milestoneIndex={index}
            onSuccess={() => handleMilestoneReleaseSuccess(milestone.id)}
          />
        )}
    </div>
  </div>
))}
```

---

## 4. Update EscrowStatus Component

**File:** `components/escrow/EscrowStatus.tsx`

Add funded amount display for V3:

```typescript
{contractVersion === 3 && (
  <div>
    <p className="text-sm text-muted-foreground">Funded</p>
    <p className="font-semibold">
      {formatUSDC(parseFloat(fundedAmount))} / {formatUSDC(parseFloat(amount))}
    </p>
  </div>
)}
```

---

## 5. Update Milestone Badge Colors

```typescript
// Status to color mapping
const milestoneStatusColors = {
  pending: 'outline',      // Gray outline
  funded: 'secondary',     // Blue-ish
  released: 'default',     // Green
};
```

---

## Checklist

- [ ] FundMilestoneButton component created
- [ ] Payment page shows milestone fund buttons
- [ ] Sequential funding enforced in UI
- [ ] Invoice detail removes approve button
- [ ] Invoice detail shows funded status
- [ ] Release button shows for funded milestones
- [ ] EscrowStatus shows funded amount
- [ ] All TypeScript errors resolved
