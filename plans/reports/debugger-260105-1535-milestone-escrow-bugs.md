# Milestone Escrow Bug Investigation

**Date:** 2026-01-05
**Investigator:** Debugger Agent
**Issues:** 2 critical bugs in milestone escrow implementation

---

## Executive Summary

**Issue 1: No UI distinction between normal escrow and milestone escrow**
- Payment type 'milestone' not implemented in codebase
- All invoices use only 'direct' or 'escrow' payment types
- Milestone data exists but no UI renders it on payment page

**Issue 2: Transaction reverts when releasing funds**
- Wrong ABI being used for v2 milestone contracts
- `ReleaseButton` calls v1 `release()` function (no parameters)
- Should call v2 `releaseMilestone(index)` function (requires milestone index)
- Causes contract revert: function signature mismatch

---

## Issue 1: No Milestone Distinction in UI

### Root Cause

**File:** `types/database.ts` (line 1)
```typescript
export type PaymentType = 'direct' | 'escrow';
```

**Problem:** Type definition missing 'milestone' payment type. Documentation shows it should be:
```typescript
export type PaymentType = 'direct' | 'escrow' | 'milestone';
```

**Evidence from docs:**
- `Arc_Invoice_User_Flow_v2.md:967`: `payment_type VARCHAR(20) NOT NULL, -- 'direct', 'escrow', 'milestone'`
- `Arc_Invoice_Tech_Stack.md:864`: `payment_type: 'direct' | 'escrow' | 'milestone';`

### Impact on Payment Page

**File:** `app/pay/[code]/page.tsx` (lines 167-180)

Current logic only checks for 'escrow':
```typescript
{invoice.payment_type === 'escrow' && invoice.escrow_address && (
  <FundEscrowButton
    escrowAddress={invoice.escrow_address as `0x${string}`}
    amount={invoice.amount.toString()}
    onSuccess={handlePaymentSuccess}
    onError={handlePaymentError}
  />
)}
```

**Missing:** No check for `payment_type === 'milestone'` to:
1. Display milestone list to payer
2. Show funding button (same as escrow)
3. Indicate milestone-based payment flow

### Invoice Detail Page Issues

**File:** `app/(auth)/invoices/[id]/page.tsx` (lines 212-276)

Only checks `payment_type === 'escrow'`:
- Line 212: Auto-release info shown only for 'escrow'
- Line 240: Create escrow button shown only for 'escrow'
- Line 257: Escrow management shown only for 'escrow'

**Missing:** No milestone management UI:
- No milestone list display
- No approve/release milestone buttons
- No milestone status tracking

---

## Issue 2: Contract Function Mismatch

### Root Cause Analysis

**File:** `app/(auth)/invoices/[id]/page.tsx` (lines 265-268)

Uses generic `ReleaseButton`:
```typescript
<ReleaseButton
  escrowAddress={invoice.escrow_address as `0x${string}`}
  onSuccess={handleReleaseSuccess}
/>
```

**File:** `components/escrow/ReleaseButton.tsx` (lines 13-18)

Calls v1 escrow ABI:
```typescript
const { release, hash, isPending, isConfirming, isSuccess } =
  useReleaseEscrow(escrowAddress);
```

**File:** `hooks/useReleaseEscrow.ts` (lines 13-18)

Uses wrong ABI:
```typescript
writeContract({
  address: escrowAddress,
  abi: ESCROW_ABI,  // ❌ V1 ABI - has release() with no params
  functionName: 'release',
});
```

**File:** `lib/contracts/abi.ts` (lines 98-103)

V1 escrow has `release()` with no parameters:
```typescript
{
  name: 'release',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [],  // ❌ No parameters
  outputs: [],
}
```

### Correct Implementation

**File:** `contracts/v2/ArcMilestoneEscrow.sol` (line 122)

V2 milestone escrow requires milestone index:
```solidity
function releaseMilestone(uint256 index) external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
    require(index < milestones.length, "Invalid index");
    require(milestones[index].approved, "Not approved");
    require(!milestones[index].released, "Already released");
    _releaseMilestone(index);
}
```

**File:** `lib/contracts/abi.ts` (lines 287-293)

V2 ABI correctly defines `releaseMilestone`:
```typescript
{
  name: 'releaseMilestone',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'index', type: 'uint256' }],  // ✅ Requires index
  outputs: [],
}
```

### Transaction Failure Flow

1. User clicks "Release Funds" button
2. `ReleaseButton` calls `useReleaseEscrow(escrowAddress)`
3. Hook attempts `release()` with V1 ESCROW_ABI
4. V2 milestone contract deployed at address doesn't have `release()` function
5. Contract reverts with function signature mismatch
6. Transaction fails with "execution reverted" error

---

## Supporting Evidence

### Contract Version Field

**File:** `types/database.ts` (line 19)
```typescript
contract_version: number;
```

Database tracks contract version but UI doesn't use it to determine:
- Which ABI to use (v1 vs v2)
- Which components to render (escrow vs milestone)
- Which hooks to call (release vs releaseMilestone)

### Existing Milestone Components

These components exist but aren't integrated:
- `components/escrow/MilestoneStatus.tsx` - renders milestone list
- `components/escrow/ApproveMilestoneButton.tsx` - payer approves milestone
- `components/escrow/ReleaseMilestoneButton.tsx` - creator releases milestone
- `hooks/useMilestoneEscrow.ts` - correct v2 hooks
- `hooks/useMilestones.ts` - fetches milestone data from DB

### Database Schema Evidence

**File:** `types/database.ts` (lines 24-33)

Milestone table exists:
```typescript
export interface Milestone {
  id: string;
  invoice_id: string;
  order_index: number;
  amount: number;
  description: string;
  status: MilestoneStatus;
  released_at: string | null;
  created_at: string;
}
```

---

## Technical Analysis

### Issue 1: Type System Mismatch

**Problem Chain:**
1. Documentation defines 3 payment types: direct, escrow, milestone
2. TypeScript type only defines 2: direct, escrow
3. UI checks only handle 2 types
4. Milestone invoices treated as regular escrow
5. No milestone-specific UI rendered

**Why It Appears to Work:**
- Milestone invoices likely saved with `payment_type: 'escrow'`
- Database accepts any VARCHAR(20) value
- TypeScript type narrowing doesn't catch runtime data
- Invoice list shows "escrow" payment type (technically correct from DB)

### Issue 2: ABI Version Detection Failure

**Problem Chain:**
1. Invoice has `contract_version: 2` in database
2. Code doesn't check contract_version field
3. All escrow addresses use same v1 ABI
4. V2 contract has different function signatures
5. Transaction fails at contract call

**Smart Contract Differences:**

V1 ArcInvoiceEscrow:
- `release()` - payer releases all funds at once
- No milestone support
- Single-step release

V2 ArcMilestoneEscrow:
- `releaseMilestone(uint256 index)` - release specific milestone
- `approveMilestone(uint256 index)` - payer approves milestone first
- Multi-step release process
- Requires approval before release

---

## Actionable Recommendations

### Immediate Fixes (Priority 1)

**Fix 1.1: Update PaymentType definition**
```typescript
// types/database.ts:1
export type PaymentType = 'direct' | 'escrow' | 'milestone';
```

**Fix 1.2: Add milestone detection to payment page**
```typescript
// app/pay/[code]/page.tsx:167
{(invoice.payment_type === 'escrow' || invoice.payment_type === 'milestone') &&
  invoice.escrow_address && (
  <>
    {invoice.payment_type === 'milestone' && (
      <MilestoneStatus milestones={milestones} />
    )}
    <FundEscrowButton
      escrowAddress={invoice.escrow_address as `0x${string}`}
      amount={invoice.amount.toString()}
      onSuccess={handlePaymentSuccess}
      onError={handlePaymentError}
    />
  </>
)}
```

**Fix 2.1: Create version-aware release component**
```typescript
// components/escrow/SmartReleaseButton.tsx
export function SmartReleaseButton({
  escrowAddress,
  contractVersion,
  milestones,
  onSuccess
}: Props) {
  if (contractVersion === 2 && milestones?.length) {
    return <MilestoneReleaseFlow milestones={milestones} ... />
  }
  return <ReleaseButton escrowAddress={escrowAddress} ... />
}
```

**Fix 2.2: Update invoice detail page to use smart button**
```typescript
// app/(auth)/invoices/[id]/page.tsx:265
<SmartReleaseButton
  escrowAddress={invoice.escrow_address as `0x${string}`}
  contractVersion={invoice.contract_version}
  milestones={milestones}
  onSuccess={handleReleaseSuccess}
/>
```

### Long-term Improvements (Priority 2)

**1. Contract Version Detection Helper**
```typescript
// lib/contracts/utils.ts
export function getContractABI(version: number) {
  return version === 2 ? MILESTONE_ESCROW_ABI : ESCROW_ABI;
}

export function getContractType(version: number): 'v1' | 'v2' {
  return version === 2 ? 'v2' : 'v1';
}
```

**2. Unified Escrow Management Component**
```typescript
// components/escrow/EscrowManager.tsx
export function EscrowManager({ invoice, milestones }: Props) {
  const isV2 = invoice.contract_version === 2;
  const isMilestone = invoice.payment_type === 'milestone';

  if (isV2 && isMilestone) {
    return <MilestoneEscrowManager invoice={invoice} milestones={milestones} />
  }
  return <StandardEscrowManager invoice={invoice} />
}
```

**3. Type-safe invoice creation validation**
```typescript
// Validate milestone data when payment_type === 'milestone'
if (paymentType === 'milestone' && !milestones?.length) {
  throw new Error('Milestone payment requires at least one milestone');
}
```

**4. Database migration to enforce constraints**
```sql
ALTER TABLE invoices
  ADD CONSTRAINT valid_payment_type
  CHECK (payment_type IN ('direct', 'escrow', 'milestone'));

ALTER TABLE invoices
  ADD CONSTRAINT milestone_requires_milestones
  CHECK (
    payment_type != 'milestone' OR
    EXISTS (SELECT 1 FROM milestones WHERE invoice_id = invoices.id)
  );
```

---

## Prevention Measures

**1. Add contract version tests**
```typescript
// Ensure v1 and v2 contracts use correct ABIs
describe('Contract ABI Matching', () => {
  it('uses ESCROW_ABI for v1 contracts', ...)
  it('uses MILESTONE_ESCROW_ABI for v2 contracts', ...)
  it('fails gracefully when version unknown', ...)
});
```

**2. Add payment type validation**
```typescript
// Ensure milestone payments show milestone UI
describe('Payment Page Rendering', () => {
  it('shows milestone list for milestone payments', ...)
  it('shows standard UI for escrow payments', ...)
  it('hides escrow UI for direct payments', ...)
});
```

**3. Runtime type validation**
```typescript
// Use Zod or similar for runtime validation
const InvoiceSchema = z.object({
  payment_type: z.enum(['direct', 'escrow', 'milestone']),
  contract_version: z.number().int().min(1).max(2),
  // Conditional validation
}).refine(
  data => data.payment_type !== 'milestone' || data.contract_version === 2,
  'Milestone payments require v2 contracts'
);
```

**4. Add monitoring/alerts**
- Track failed transactions by contract version
- Alert when v1 ABI called on v2 contract
- Monitor payment type distribution

---

## Unresolved Questions

1. Are there existing milestone invoices in production database? Check:
   ```sql
   SELECT COUNT(*) FROM invoices WHERE payment_type = 'milestone';
   SELECT COUNT(*) FROM invoices WHERE contract_version = 2;
   ```

2. Should milestone invoices also support auto-release after deadline?
   - V2 contract has `autoRelease()` function (line 213-226)
   - Auto-releases all unreleased milestones
   - Should this be exposed in UI?

3. What happens to pending v2 escrows during migration?
   - Need migration script to update invoice pages
   - Coordinate with users who have v2 contracts deployed

4. Should 'escrow' payment type be deprecated for v2 contracts?
   - Force all v2 to use 'milestone' even for single milestone?
   - Or keep 'escrow' for backward compatibility?

5. How to handle mixed contract versions in invoice list?
   - Add version indicator badge?
   - Filter by version?
   - Group by version in analytics?
