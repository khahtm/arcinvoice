# Implementation Plan: V2 Pay-Per-Milestone Escrow

**Date:** 2026-01-05
**Status:** Ready for Implementation
**Brainstorm Report:** `plans/reports/brainstorm-260105-1703-v2-pay-per-milestone.md`

---

## Overview

Modify V2 milestone escrow from "fund-all-upfront" to "pay-per-milestone" where payer funds each milestone individually after work completion.

## Current vs New Architecture

```
CURRENT:                          NEW:
┌────────────────┐               ┌────────────────┐
│ deposit()      │──────────────▶│ fundMilestone()│
│ (fund ALL)     │               │ (fund ONE)     │
├────────────────┤               ├────────────────┤
│approveMilestone│      REMOVED  │                │
├────────────────┤               ├────────────────┤
│releaseMilestone│──────────────▶│releaseMilestone│
│ (needs approve)│               │ (needs funded) │
└────────────────┘               └────────────────┘
```

## Phases

| Phase | Description | Estimated Scope |
|-------|-------------|-----------------|
| 1 | Smart Contract Modification | `ArcMilestoneEscrow.sol` rewrite |
| 2 | Contract Deployment | Deploy + update addresses |
| 3 | Frontend ABIs & Hooks | Update ABIs, create new hooks |
| 4 | UI Components | Payment page + invoice detail |
| 5 | Cleanup | Remove unused components |

---

## Phase Details

### Phase 1: Smart Contract Modification

**File:** `contracts/v2/ArcMilestoneEscrow.sol`

**Changes:**

1. **State Changes:**
   - Add `currentMilestone` - tracks next fundable milestone index
   - Add `funded` boolean to Milestone struct
   - Add `fundedAmount` - total funded so far
   - Change state enum: `CREATED → ACTIVE → COMPLETED`

2. **Remove Functions:**
   - `deposit()` - replaced by fundMilestone
   - `approveMilestone()` - funding = approval

3. **Add Functions:**
   - `fundMilestone(uint256 index)` - fund specific milestone + fee
   - `getCurrentMilestone()` - view function for UI

4. **Modify Functions:**
   - `releaseMilestone()` - require funded instead of approved
   - `refund()` - only refund funded but unreleased
   - `getDetails()` - update return values
   - `getMilestone()` - return funded instead of approved

**New Contract Structure:**
```solidity
struct Milestone {
    uint256 amount;
    bool funded;    // was: approved
    bool released;
}

// New state
uint256 public currentMilestone;  // next fundable index
uint256 public fundedAmount;      // total funded

// States: CREATED=0, ACTIVE=1, COMPLETED=2, REFUNDED=3
```

See: `phase-01-contract-modification.md`

### Phase 2: Contract Deployment

1. Compile modified contracts
2. Deploy new `ArcMilestoneEscrow` (factory creates instances)
3. Deploy new `ArcMilestoneFactory` with same FeeCollector
4. Update `lib/contracts/addresses.ts` with new factory address
5. Keep old factory address for existing escrows (backward compat)

See: `phase-02-contract-deployment.md`

### Phase 3: Frontend Hooks & ABIs

**Files to Update:**

1. `lib/contracts/abi.ts`:
   - Update `MILESTONE_ESCROW_ABI` with new functions
   - Remove `approveMilestone` from ABI
   - Add `fundMilestone`, `currentMilestone`, `fundedAmount`
   - Update `getMilestone` return (funded instead of approved)

2. `hooks/useFundMilestone.ts` (NEW):
   - Calculate per-milestone payer amount
   - USDC approval for specific milestone
   - Call `fundMilestone(index)`

3. `hooks/useEscrowStatus.ts`:
   - Update to read new state format
   - Add `currentMilestone` to return

4. `hooks/useMilestoneEscrow.ts`:
   - Remove `approveMilestone` function
   - Update `releaseMilestone` logic

See: `phase-03-frontend-hooks.md`

### Phase 4: UI Components

**Payment Page** (`app/pay/[code]/page.tsx`):
- Show milestone list with per-milestone fund buttons
- Only enable current milestone button (sequential)
- Show funded/pending status per milestone
- Display milestone amount + fee

**Invoice Detail** (`app/(auth)/invoices/[id]/page.tsx`):
- Remove `ApproveMilestoneButton` usage
- Show fund status per milestone
- Creator sees release button for funded milestones
- Update EscrowStatus display

**New Component** (`components/escrow/FundMilestoneButton.tsx`):
- Props: escrowAddress, milestoneIndex, amount
- Handles approval + funding in one flow
- Shows milestone-specific amount + fee

See: `phase-04-ui-components.md`

### Phase 5: Cleanup

1. Delete `components/escrow/ApproveMilestoneButton.tsx`
2. Remove `approveMilestone` from `useMilestoneEscrow` hook
3. Update any remaining references
4. Clean up unused imports

See: `phase-05-cleanup.md`

---

## Key Technical Decisions

### 1. Sequential Funding Enforcement
```solidity
function fundMilestone(uint256 index) external {
    require(index == currentMilestone, "Must fund in order");
    // ... fund logic
    currentMilestone++;
}
```

### 2. Fee Calculation Per Milestone
Each `fundMilestone` calculates fee on that milestone's amount:
```solidity
uint256 milestoneAmount = milestones[index].amount;
uint256 payerAmount = feeCollector.calculatePayerAmount(milestoneAmount);
```

### 3. State Transitions
```
CREATED → (first fundMilestone) → ACTIVE
ACTIVE  → (last releaseMilestone) → COMPLETED
ACTIVE  → (refund) → REFUNDED
```

### 4. Refund Behavior
Only funded but unreleased milestones can be refunded:
```solidity
function refund() external onlyCreator {
    // Sum up funded but not released amounts
    uint256 refundable = 0;
    for (uint i = 0; i < milestones.length; i++) {
        if (milestones[i].funded && !milestones[i].released) {
            refundable += milestones[i].amount;
        }
    }
    // Transfer to payer
}
```

---

## Testing Checklist

- [ ] Fund milestones sequentially (1→2→3)
- [ ] Cannot fund out of order
- [ ] Release requires funded status
- [ ] Refund only funded, unreleased milestones
- [ ] Fee calculation correct per milestone
- [ ] State transitions work correctly
- [ ] Auto-release after deadline
- [ ] V1 escrows still work (backward compat)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing V2 escrows | Keep old factory, new factory for new invoices |
| Gas cost increase | Document multi-tx cost to users |
| Payer abandonment | Add notification when milestone pending |
| Sequential blocking | Consider future "skip milestone" feature |

---

## Files Changed Summary

| File | Action |
|------|--------|
| `contracts/v2/ArcMilestoneEscrow.sol` | Major rewrite |
| `contracts/v2/ArcMilestoneFactory.sol` | Minor update (if any) |
| `lib/contracts/addresses.ts` | Add new factory address |
| `lib/contracts/abi.ts` | Update MILESTONE_ESCROW_ABI |
| `hooks/useFundMilestone.ts` | NEW |
| `hooks/useFundEscrow.ts` | Keep for V1 |
| `hooks/useEscrowStatus.ts` | Update for new states |
| `hooks/useMilestoneEscrow.ts` | Remove approve |
| `components/escrow/FundMilestoneButton.tsx` | NEW |
| `components/escrow/ApproveMilestoneButton.tsx` | DELETE |
| `app/pay/[code]/page.tsx` | Major update |
| `app/(auth)/invoices/[id]/page.tsx` | Major update |
