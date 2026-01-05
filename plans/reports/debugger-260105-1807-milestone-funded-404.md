# Debug Report: Milestone Status Mismatch (funded vs pending)

**Date:** 2026-01-05 18:07
**Type:** Bug - Status Update Failure
**Severity:** High - Core feature broken

---

## Executive Summary

**Issue:** After payer funds milestone, status remains "pending" instead of "funded", preventing receiver from releasing funds.

**Root Cause:** Database schema constraint mismatch - milestone status column only allows `['pending', 'approved', 'released']` but payment page attempts to set `'funded'`.

**Impact:**
- V3 pay-per-milestone escrow completely broken
- Receivers cannot release funded milestones
- Contract state (funded) diverges from DB state (pending)

**Fix Priority:** CRITICAL - requires immediate database migration + code update

---

## Root Cause Analysis

### 1. Database Schema Definition

**File:** `supabase/migrations/001_milestones.sql` (line 11)

```sql
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released'))
```

**Problem:** `'funded'` status not included in constraint

### 2. Payment Flow Attempt

**File:** `app/pay/[code]/page.tsx` (line 105-119)

```typescript
const handleMilestoneFundSuccess = async (milestoneId: string) => {
  try {
    await fetch(`/api/invoices/${invoice?.id}/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'funded' }),  // ← REJECTED by DB constraint
    });
    toast.success('Milestone funded!');
    fetchMilestones();  // ← Refetches but status still 'pending'
    refetchEscrow();
  } catch {
    toast.error('Status update failed');
  }
}
```

### 3. API Validation Layer

**File:** `app/api/invoices/[id]/milestones/[milestoneId]/route.ts` (line 19-21)

```typescript
if (!['approved', 'released'].includes(status)) {
  return Response.json({ error: 'Invalid status' }, { status: 400 });
}
```

**Problem:** Double validation - API rejects 'funded' before DB even sees it

### 4. Receiver View Condition

**File:** `app/(auth)/invoices/[id]/page.tsx` (line 339-346)

```typescript
{milestone.status === 'funded' &&
  walletAddress?.toLowerCase() === invoice.creator_wallet?.toLowerCase() && (
    <ReleaseMilestoneButton
      escrowAddress={invoice.escrow_address as `0x${string}`}
      milestoneIndex={index}
      onSuccess={() => handleMilestoneReleaseSuccess(milestone.id)}
    />
  )}
```

**Problem:** Release button only shows when `status === 'funded'`, but status never reaches 'funded'

---

## Call Stack Trace

1. **Payer funds milestone** (on-chain tx succeeds)
   - `FundMilestoneButton` → `useFundMilestone` hook
   - Success callback fires: `onSuccess(fundHash)`

2. **Success handler executes**
   - `handleMilestoneFundSuccess(milestoneId)` called
   - Sends `PATCH /api/invoices/${id}/milestones/${milestoneId}`
   - Body: `{ status: 'funded' }`

3. **API validation fails**
   - Route handler checks: `!['approved', 'released'].includes('funded')`
   - Returns 400 error: `{ error: 'Invalid status' }`

4. **Catch block executes**
   - `toast.error('Status update failed')` shown
   - `fetchMilestones()` refetches data
   - Status still `'pending'` in DB (unchanged)

5. **Receiver view renders**
   - Milestone shows as "pending" badge
   - Release button hidden (condition `status === 'funded'` false)

---

## Evidence

### Database Constraint
- Location: `supabase/migrations/001_milestones.sql:11`
- Allowed values: `['pending', 'approved', 'released']`
- Missing: `'funded'`

### API Request (fails)
```json
PATCH /api/invoices/{id}/milestones/{milestoneId}
Body: { "status": "funded" }
Response: 400 { "error": "Invalid status" }
```

### UI Behavior
- Payment page: Shows "Milestone funded!" toast (misleading - only tx succeeded, not status)
- Invoice detail: Shows "pending" badge (correct DB state)
- Release button: Hidden (correct logic, wrong data)

### Contract vs DB Divergence
- **On-chain state:** Milestone funded (USDC in escrow)
- **Database state:** Milestone pending (status not updated)
- **User impact:** Receiver sees "pending", cannot release despite funds being available

---

## Solution Design

### Option A: Add 'funded' to Schema (Recommended)

**Pros:**
- Matches contract state lifecycle
- Clear separation: pending → funded → released
- Minimal code changes

**Cons:**
- Requires DB migration (downtime risk)

**Implementation:**
```sql
-- Migration: Add 'funded' status to milestones
ALTER TABLE milestones
DROP CONSTRAINT milestones_status_check;

ALTER TABLE milestones
ADD CONSTRAINT milestones_status_check
CHECK (status IN ('pending', 'funded', 'approved', 'released'));
```

```typescript
// API route update
if (!['funded', 'approved', 'released'].includes(status)) {
  return Response.json({ error: 'Invalid status' }, { status: 400 });
}

// Add funded_at timestamp
if (status === 'funded') {
  updateData.funded_at = new Date().toISOString();
}
```

### Option B: Reuse 'approved' as 'funded' (Not Recommended)

**Pros:**
- No migration needed
- Works with existing schema

**Cons:**
- Semantically incorrect (approved ≠ funded)
- Confusing for V2 contracts (uses approved differently)
- Technical debt

---

## Recommended Fix

### Step 1: Database Migration

**File:** `supabase/migrations/005_add_funded_status.sql`

```sql
-- Add 'funded' status to milestones constraint
ALTER TABLE milestones
DROP CONSTRAINT IF EXISTS milestones_status_check;

ALTER TABLE milestones
ADD CONSTRAINT milestones_status_check
CHECK (status IN ('pending', 'funded', 'approved', 'released'));

-- Add funded_at timestamp
ALTER TABLE milestones
ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;

-- Optionally: update existing records if needed
-- UPDATE milestones SET status = 'funded' WHERE status = 'pending' AND ...;
```

### Step 2: API Route Update

**File:** `app/api/invoices/[id]/milestones/[milestoneId]/route.ts`

```typescript
// Line 19: Update validation
if (!['funded', 'approved', 'released'].includes(status)) {
  return Response.json({ error: 'Invalid status' }, { status: 400 });
}

// Line 27-29: Add funded_at
if (status === 'funded') {
  updateData.funded_at = new Date().toISOString();
} else if (status === 'released') {
  updateData.released_at = new Date().toISOString();
}
```

### Step 3: Verify Flow

Test sequence:
1. Payer funds milestone → `handleMilestoneFundSuccess` sends `status: 'funded'`
2. API accepts 'funded' → DB updates successfully
3. Refetch returns updated milestone with `status: 'funded'`
4. Receiver view shows "Funded" badge
5. Release button appears (condition `status === 'funded'` now true)
6. Receiver clicks release → status updates to 'released'

---

## Testing Checklist

- [ ] Run migration on test DB
- [ ] Fund milestone as payer
- [ ] Verify API returns 200 (not 400)
- [ ] Verify DB shows `status = 'funded'`
- [ ] Verify `funded_at` timestamp populated
- [ ] Verify receiver sees "Funded" badge
- [ ] Verify release button appears
- [ ] Click release, verify status → 'released'
- [ ] Check `released_at` timestamp
- [ ] Test V2 contracts (ensure no regression)

---

## Related Files

### Modified
- `supabase/migrations/005_add_funded_status.sql` (new)
- `app/api/invoices/[id]/milestones/[milestoneId]/route.ts` (validation + timestamp)

### No Changes Needed (already correct)
- `app/pay/[code]/page.tsx` (sends 'funded')
- `app/(auth)/invoices/[id]/page.tsx` (checks 'funded')
- `components/escrow/FundMilestoneButton.tsx` (calls success callback)

### Reviewed (working as designed)
- `components/escrow/ReleaseMilestoneButton.tsx`
- `hooks/useFundMilestone.ts`
- `hooks/useMilestones.ts`

---

## Unresolved Questions

1. Should V2 contracts also use 'funded' status or keep current flow?
2. How to handle existing invoices with milestones stuck in 'pending' after failed funding attempts?
3. Should we add DB index on `status` column for performance?
4. Consider adding `funded_tx_hash` to track which transaction funded each milestone?

---

## Summary

**What happened:** DB schema excludes 'funded', API rejects it, status stays 'pending'
**Why it matters:** V3 escrow completely broken - payers can fund but receivers can't release
**How to fix:** Add 'funded' to schema constraint + API validation (5min migration)
**Risk level:** Low - additive change, no data loss, backwards compatible
