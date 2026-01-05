# Brainstorm Report: V2 Pay-Per-Milestone

**Date:** 2026-01-05
**Status:** Approved for Implementation

---

## Problem Statement

Current V2 milestone escrow requires payer to fund ALL milestones upfront. User wants pay-per-milestone design where payer funds each milestone individually after work completion.

## Current vs Desired Flow

### Current Flow (Fund-All-Upfront)
```
1. Creator creates invoice with milestones
2. Payer funds TOTAL amount + fee (one transaction)
3. Payer approves each milestone individually
4. Creator releases each approved milestone
```

### Desired Flow (Pay-Per-Milestone)
```
1. Creator creates invoice with milestones
2. Creator completes milestone 1
3. Payer funds milestone 1 + fee
4. Creator releases milestone 1
5. Repeat for each milestone...
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Funding order | Sequential only | Ensures work is done in order |
| Release order | Any order (batch OK) | Flexibility for creator |
| Approval step | Removed | Funding = approval |
| Fee calculation | 0.5% per milestone | Applied when each milestone funded |
| Global state | CREATED→ACTIVE→COMPLETED | Tracks overall escrow progress |

## Contract Changes

### Remove
- `deposit()` - replaced by `fundMilestone`
- `approveMilestone(i)` - funding = approval

### Add
- `fundMilestone(i)` - fund specific milestone + fee
- `currentMilestone` - track which milestone can be funded next

### Modify
- `refund()` - only refund funded but unreleased milestones
- Milestone struct - add `funded` boolean
- State logic - ACTIVE when first milestone funded

## Frontend Changes

### Payment Page (`/pay/[code]`)
- Show milestone list with fund buttons
- Only enable "Fund Milestone X" for current sequential milestone
- Disable funded milestones

### Invoice Detail (`/invoices/[id]`)
- Remove `ApproveMilestoneButton` component
- Show fund status per milestone (pending/funded/released)
- Creator sees release button for funded milestones

### Components
- `FundMilestoneButton` - new, replaces `FundEscrowButton` for V2
- `ApproveMilestoneButton` - remove (unused)
- `EscrowStatus` - update to show per-milestone fund status

## Trade-offs

### Pros
- Lower upfront capital for payer
- More granular payment control
- Payer only pays for completed work
- Reduced risk for payer

### Cons
- More gas fees (N transactions vs 1)
- Creator has no guaranteed payment commitment
- Payer could abandon mid-project
- More complex state management

## Implementation Phases

### Phase 1: Contract Modification
- Modify `ArcMilestoneEscrow.sol`
- Update `ArcMilestoneFactory.sol` if needed
- Deploy new contracts
- Update contract addresses

### Phase 2: Frontend Hooks
- Create `useFundMilestone` hook
- Modify `useEscrowStatus` for new state logic
- Remove approval-related code

### Phase 3: UI Components
- Create `FundMilestoneButton` component
- Update payment page with milestone funding
- Update invoice detail page
- Remove `ApproveMilestoneButton`

### Phase 4: Testing
- Test sequential funding enforcement
- Test release after funding
- Test refund scenarios
- Test state transitions

---

## Next Steps

Create detailed implementation plan with `/plan` command.
