# Phase 5: Cleanup

## Overview

Remove unused code and ensure backward compatibility with existing V2 escrows.

---

## 1. Delete Unused Components

**Delete:** `components/escrow/ApproveMilestoneButton.tsx`

```bash
rm components/escrow/ApproveMilestoneButton.tsx
```

---

## 2. Clean Up Imports

### Files to check:

1. `app/(auth)/invoices/[id]/page.tsx`
   - Remove: `import { ApproveMilestoneButton } from '@/components/escrow/ApproveMilestoneButton'`

2. `app/pay/[code]/page.tsx`
   - Remove any approve-related imports

---

## 3. Update useMilestoneEscrow Hook

**File:** `hooks/useMilestoneEscrow.ts`

Remove `approveMilestone` export:

```typescript
// BEFORE
return {
  approveMilestone,  // REMOVE
  releaseMilestone,
  ...
};

// AFTER
return {
  releaseMilestone,
  ...
};
```

---

## 4. Backward Compatibility Check

### Existing V2 Escrows (fund-all-upfront):

These escrows were created with old factory and have:
- `deposit()` function
- `approveMilestone()` function
- Old state logic

**Strategy:** Keep old ABI entries but mark as deprecated

```typescript
// In abi.ts, keep for backward compat:
export const MILESTONE_ESCROW_ABI_V2_LEGACY = [
  // Old V2 ABI entries
  { name: 'deposit', ... },
  { name: 'approveMilestone', ... },
  ...
];

// New pay-per-milestone ABI:
export const MILESTONE_ESCROW_ABI = [
  // New V3 entries
  { name: 'fundMilestone', ... },
  ...
];
```

### Version Detection in Hooks:

```typescript
// useEscrowStatus.ts
export function useEscrowStatus(
  escrowAddress?: `0x${string}`,
  contractVersion: number = 1
) {
  // V1 = basic escrow
  // V2 = milestone fund-all-upfront (legacy)
  // V3 = milestone pay-per-milestone (new)

  const isV2Legacy = contractVersion === 2;
  const isV3 = contractVersion === 3;

  const abi = isV3 ? MILESTONE_ESCROW_ABI :
              isV2Legacy ? MILESTONE_ESCROW_ABI_V2_LEGACY :
              ESCROW_ABI;
  ...
}
```

---

## 5. Database Updates

### For new invoices with milestones:

```typescript
// In POST /api/invoices
const contractVersion = hasMilestones ? 3 : 1;  // Changed from 2 to 3
```

### Migration consideration:

Existing V2 invoices keep `contract_version = 2` and continue working with legacy flow.

---

## 6. Update Contract Addresses

**File:** `lib/contracts/addresses.ts`

```typescript
export const CONTRACTS = {
  5042002: {
    USDC: '0x3600000000000000000000000000000000000000' as const,
    FACTORY: '0x07a7be2be306a4C37c7E526235BEcB7BF4C018FB' as const,
    FEE_COLLECTOR: '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f' as const,
    // V2 Legacy (fund-all-upfront) - keep for existing escrows
    MILESTONE_FACTORY_V2: '0x9F9c0955083459978Af2EaCc6C223315085Fb777' as const,
    // V3 (pay-per-milestone) - new escrows
    MILESTONE_FACTORY: '0x<NEW_V3_FACTORY_ADDRESS>' as const,
  },
};
```

---

## 7. Update getContractAddress Helper

```typescript
export type ContractName =
  | 'USDC'
  | 'FACTORY'
  | 'FEE_COLLECTOR'
  | 'MILESTONE_FACTORY'
  | 'MILESTONE_FACTORY_V2';

export function getMilestoneFactory(chainId: number, version: number) {
  if (version === 2) {
    return getContractAddress(chainId, 'MILESTONE_FACTORY_V2');
  }
  return getContractAddress(chainId, 'MILESTONE_FACTORY');
}
```

---

## 8. Update useCreateMilestoneEscrow Hook

**File:** `hooks/useCreateMilestoneEscrow.ts`

Use V3 factory for new escrows:

```typescript
writeContract({
  address: getContractAddress(chainId, 'MILESTONE_FACTORY'), // Uses V3
  abi: MILESTONE_FACTORY_ABI,
  ...
});
```

---

## 9. Final Verification

Run full build and check:

```bash
npm run build
npm run lint
```

---

## Checklist

- [ ] ApproveMilestoneButton.tsx deleted
- [ ] All imports cleaned up
- [ ] useMilestoneEscrow cleaned up
- [ ] Legacy V2 ABI preserved
- [ ] Version detection works
- [ ] New invoices use contract_version = 3
- [ ] Contract addresses updated
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] No lint errors

---

## Testing Matrix

| Scenario | Expected Behavior |
|----------|-------------------|
| New invoice with milestones | Uses V3 pay-per-milestone |
| Existing V2 invoice | Uses V2 fund-all-upfront |
| V1 basic escrow | Uses V1 flow (unchanged) |
| Fund M1 → Fund M2 | Sequential, works |
| Fund M2 first | Blocked, error |
| Release funded milestone | Works |
| Release unfunded milestone | Blocked |
| Refund funded milestones | Works |
