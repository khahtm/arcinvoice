# Debug Report: V2 Milestone Release Issues

**Date:** 2026-01-05
**Investigator:** Debugger Agent
**Priority:** HIGH

---

## Executive Summary

V2 milestone escrow funding succeeds, but:
1. **Release buttons not appearing** - Milestones remain `pending`, need `approved` status
2. **No milestone breakdown visible** - Missing UI component to show milestone list

**Root Cause:** Missing approval flow - payer must manually approve milestones before creator can release, but no UI/functionality exists for this.

---

## Technical Analysis

### 1. Contract Milestone Lifecycle (ArcMilestoneEscrow.sol)

```
pending (initial) → approved (payer action) → released (creator action)
```

**Key Contract Functions:**
- `approveMilestone(index)` - Line 112 - **onlyPayer** modifier, sets `approved=true`
- `releaseMilestone(index)` - Line 122 - **onlyCreator** modifier, requires `approved=true`

**Finding:** Contract requires explicit payer approval before creator can release.

### 2. Database Milestone Status

**Table:** `milestones`
**Status Values:** `pending | approved | released` (types/database.ts:3)

**Creation:** Milestones created with `status: 'pending'` (api/invoices/route.ts:73)

**Finding:** No code path to transition from `pending` → `approved` after funding.

### 3. Frontend Display Logic

**File:** `app/(auth)/invoices/[id]/page.tsx`

**Lines 45-51:**
```typescript
const isV2 = invoice?.contract_version === 2;
const { milestones, refetch: refetchMilestones } = useMilestones(
  isV2 ? invoice?.id ?? null : null
);
const { approveMilestone } = useMilestoneEscrow(
  invoice?.escrow_address as `0x${string}` | null
);
```

**Lines 342-349 (Release Button Condition):**
```typescript
{invoice.status === 'funded' && milestone.status === 'approved' && (
  <ReleaseMilestoneButton
    escrowAddress={invoice.escrow_address as `0x${string}`}
    milestoneIndex={index}
    onSuccess={() => handleMilestoneReleaseSuccess(milestone.id)}
  />
)}
```

**Finding:**
- Release buttons only show when `milestone.status === 'approved'`
- Hook exposes `approveMilestone` function but never used in UI
- No approval button component exists

### 4. API Invoice Response

**File:** `app/api/invoices/[id]/route.ts`

**Lines 23-33:**
```typescript
const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .eq('id', id)
  .single();

return Response.json({ invoice: data });
```

**Finding:** Returns all invoice columns including `contract_version` - isV2 detection should work correctly.

### 5. Missing Components

**Search Results:** No `ApproveMilestoneButton` component exists.

**Existing Hook:** `useMilestoneEscrow` (hooks/useMilestoneEscrow.ts) exports `approveMilestone` function but unused.

---

## Root Causes Identified

### Issue #1: Missing Approval Flow

**Severity:** CRITICAL
**Location:** Frontend UI layer

**Problem:** Payer has no way to approve milestones after funding.

**Evidence:**
1. Contract requires `approved=true` (line 124 of ArcMilestoneEscrow.sol)
2. Hook provides `approveMilestone` function (useMilestoneEscrow.ts:30)
3. No UI component calls `approveMilestone`
4. No API endpoint to sync contract approval state to DB

**User Impact:** Creator cannot release funds, payer cannot approve work completion.

### Issue #2: Missing Milestone Visibility on Payment Page

**Severity:** MEDIUM
**Location:** `app/pay/[code]/page.tsx`

**Problem:** Payer sees total amount but not milestone breakdown before funding.

**Evidence:**
- Payment page shows `invoice.amount` (line 125)
- No milestone fetch or display logic
- Payer unaware of payment structure

**User Impact:** Payer lacks transparency about payment terms.

---

## Recommended Fixes

### Priority 1: Add Approval Flow (CRITICAL)

**A. Create ApproveMilestoneButton Component**

**File:** `components/escrow/ApproveMilestoneButton.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMilestoneEscrow } from '@/hooks/useMilestoneEscrow';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApproveMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  milestoneIndex: number;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function ApproveMilestoneButton({
  escrowAddress,
  milestoneIndex,
  onSuccess,
  disabled,
}: ApproveMilestoneButtonProps) {
  const { approveMilestone, isPending, isConfirming, isSuccess, error } =
    useMilestoneEscrow(escrowAddress);

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Milestone ${milestoneIndex + 1} approved!`);
      onSuccess?.();
    }
  }, [isSuccess, milestoneIndex, onSuccess]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to approve milestone');
    }
  }, [error]);

  const isLoading = isPending || isConfirming;

  return (
    <Button
      onClick={() => approveMilestone(milestoneIndex)}
      disabled={disabled || isLoading}
      size="sm"
      variant="default"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </>
      )}
    </Button>
  );
}
```

**B. Update Invoice Detail Page**

**File:** `app/(auth)/invoices/[id]/page.tsx`

Add approval success handler after line 130:
```typescript
const handleMilestoneApprovalSuccess = async (milestoneId: string) => {
  try {
    await fetch(`/api/invoices/${id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    await refetchMilestones();
    toast.success('Milestone approved! Creator can now release funds.');
  } catch {
    toast.error('Failed to update milestone status');
  }
};
```

Update milestone display section (around line 330):
```typescript
<div className="flex items-center gap-2">
  <Badge
    variant={
      milestone.status === 'released'
        ? 'default'
        : milestone.status === 'approved'
          ? 'secondary'
          : 'outline'
    }
  >
    {milestone.status}
  </Badge>

  {/* Payer approves pending milestones */}
  {invoice.status === 'funded' &&
   milestone.status === 'pending' &&
   walletAddress === invoice.payer_wallet && (
    <ApproveMilestoneButton
      escrowAddress={invoice.escrow_address as `0x${string}`}
      milestoneIndex={index}
      onSuccess={() => handleMilestoneApprovalSuccess(milestone.id)}
    />
  )}

  {/* Creator releases approved milestones */}
  {invoice.status === 'funded' &&
   milestone.status === 'approved' &&
   walletAddress === invoice.creator_wallet && (
    <ReleaseMilestoneButton
      escrowAddress={invoice.escrow_address as `0x${string}`}
      milestoneIndex={index}
      onSuccess={() => handleMilestoneReleaseSuccess(milestone.id)}
    />
  )}
</div>
```

**C. Add payer_wallet to Invoice Model**

**Issue:** Need to identify payer to show approve buttons.

**Solution:** Read from contract `getDetails()` or store during funding.

**Option 1 (Quick):** Read from contract in EscrowStatus component, pass down as prop.

**Option 2 (Better):** Update DB schema to store `payer_wallet` during funding:

```sql
ALTER TABLE invoices ADD COLUMN payer_wallet TEXT;
```

Update funding success in `app/pay/[code]/page.tsx`:
```typescript
// After successful deposit, query contract for payer
const contract = { address: escrowAddress, abi: MILESTONE_ESCROW_ABI };
const payer = await readContract({ ...contract, functionName: 'payer' });

await fetch(`/api/pay/${code}`, {
  method: 'PATCH',
  body: JSON.stringify({
    status: 'funded',
    tx_hash: txHash,
    payer_wallet: payer,
  }),
});
```

### Priority 2: Show Milestones on Payment Page (MEDIUM)

**File:** `app/pay/[code]/page.tsx`

Add milestone fetch (after line 31):
```typescript
const [milestones, setMilestones] = useState<Milestone[]>([]);

useEffect(() => {
  if (invoice?.contract_version === 2) {
    fetch(`/api/invoices/${invoice.id}/milestones`)
      .then(res => res.json())
      .then(data => setMilestones(data.milestones || []));
  }
}, [invoice]);
```

Add milestone display section (before payment actions, around line 143):
```typescript
{/* V2 Milestone Breakdown */}
{invoice.contract_version === 2 && milestones.length > 0 && (
  <div className="py-4 border-t space-y-2">
    <p className="text-sm font-medium">Payment Milestones</p>
    {milestones.map((m, i) => (
      <div key={m.id} className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {i + 1}. {m.description}
        </span>
        <span className="font-medium">{formatUSDC(m.amount)}</span>
      </div>
    ))}
    <div className="text-xs text-muted-foreground pt-2">
      Funds released milestone-by-milestone after your approval
    </div>
  </div>
)}
```

### Priority 3: Update API to Allow 'approved' Status (LOW)

**File:** `app/api/invoices/[id]/milestones/[milestoneId]/route.ts`

Line 19 already allows `approved` status - no change needed.

---

## Implementation Order

1. **Add payer tracking** - Store payer_wallet in DB during funding
2. **Create ApproveMilestoneButton** - New component
3. **Update invoice detail page** - Add approval buttons + handler
4. **Import ApproveMilestoneButton** - Add to page imports
5. **Test approval flow** - Verify contract + DB state sync
6. **Add milestone display to payment page** - Show breakdown before payment
7. **Test full lifecycle** - Create → Fund → Approve → Release

---

## Testing Checklist

- [ ] Payer sees "Approve" button on pending milestones after funding
- [ ] Approval button calls contract `approveMilestone(index)`
- [ ] Approval success updates DB milestone status to `approved`
- [ ] Creator sees "Release" button on approved milestones
- [ ] Release button only appears for creator (not payer)
- [ ] Approve button only appears for payer (not creator)
- [ ] Payment page shows milestone breakdown for V2 invoices
- [ ] V1 invoices unaffected (no approval flow)

---

## Unresolved Questions

1. **Auto-approval option?** - Should system support auto-approve all milestones on funding for trusted relationships?
2. **Partial milestone completion?** - UI to mark milestones as "ready for approval" before payer approves?
3. **Notification system?** - Alert payer when milestone ready, alert creator when approved?
4. **Mobile wallet compatibility?** - Test approve/release on mobile wallets (MetaMask Mobile, WalletConnect)?
