# Phase 3: Frontend Hooks & ABIs

## Overview

Update ABIs for new contract functions and create hooks for pay-per-milestone flow.

---

## 1. Update ABI

**File:** `lib/contracts/abi.ts`

### Remove from MILESTONE_ESCROW_ABI:
```typescript
// DELETE these entries
{
  name: 'deposit',
  ...
},
{
  name: 'approveMilestone',
  ...
},
{
  name: 'MilestoneApproved',
  ...
},
```

### Add to MILESTONE_ESCROW_ABI:
```typescript
// ADD these entries
{
  name: 'fundMilestone',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'index', type: 'uint256' }],
  outputs: [],
},
{
  name: 'getCurrentMilestone',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
},
{
  name: 'fundedAmount',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint256' }],
},
{
  name: 'MilestoneFunded',
  type: 'event',
  inputs: [
    { name: 'index', type: 'uint256', indexed: true },
    { name: 'payer', type: 'address', indexed: true },
    { name: 'amount', type: 'uint256', indexed: false },
  ],
},
```

### Update getMilestone return:
```typescript
{
  name: 'getMilestone',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'index', type: 'uint256' }],
  outputs: [
    { name: 'amount', type: 'uint256' },
    { name: 'funded', type: 'bool' },   // was: approved
    { name: 'released', type: 'bool' },
  ],
},
```

### Update getDetails return:
```typescript
{
  name: 'getDetails',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [
    { name: '_creator', type: 'address' },
    { name: '_payer', type: 'address' },
    { name: '_totalAmount', type: 'uint256' },
    { name: '_fundedAmount', type: 'uint256' },     // NEW
    { name: '_releasedAmount', type: 'uint256' },
    { name: '_state', type: 'uint8' },
    { name: '_fundedAt', type: 'uint256' },
    { name: '_autoReleaseDays', type: 'uint256' },
    { name: '_milestoneCount', type: 'uint256' },
    { name: '_currentMilestone', type: 'uint256' }, // NEW
  ],
},
```

---

## 2. Create useFundMilestone Hook

**File:** `hooks/useFundMilestone.ts`

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
import {
  ERC20_ABI,
  MILESTONE_ESCROW_ABI,
  FEE_COLLECTOR_ABI,
} from '@/lib/contracts/abi';
import { getContractAddress } from '@/lib/contracts/addresses';

export function useFundMilestone(
  escrowAddress: `0x${string}`,
  milestoneIndex: number,
  milestoneAmount: number // in USDC (not micro)
) {
  const chainId = useChainId();
  const { address } = useAccount();

  // Convert to wei
  const amountWei = parseUnits(milestoneAmount.toString(), 6);

  // Calculate payer amount (milestone + fee)
  const { data: payerAmountWei, isLoading: isLoadingAmount } = useReadContract({
    address: getContractAddress(chainId, 'FEE_COLLECTOR'),
    abi: FEE_COLLECTOR_ABI,
    functionName: 'calculatePayerAmount',
    args: [amountWei],
  });

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: getContractAddress(chainId, 'USDC'),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, escrowAddress] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = isLoadingAmount || !allowance || !payerAmountWei ||
    allowance < payerAmountWei;

  // Approve hook
  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Fund hook
  const {
    writeContract: fund,
    data: fundHash,
    isPending: isFunding,
  } = useWriteContract();

  const { isLoading: isFundConfirming, isSuccess: isFundSuccess } =
    useWaitForTransactionReceipt({ hash: fundHash });

  const approveUSDC = () => {
    if (!payerAmountWei) return;
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, payerAmountWei],
    });
  };

  const fundMilestone = () => {
    fund({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'fundMilestone',
      args: [BigInt(milestoneIndex)],
    });
  };

  // Display amount
  const payerAmountDisplay = payerAmountWei
    ? Number(payerAmountWei) / 1_000_000
    : 0;

  return {
    needsApproval: needsApproval && !isApproveSuccess,
    approveUSDC,
    fundMilestone,
    isApproving: isApproving || isApproveConfirming,
    isApproveSuccess,
    isFunding: isFunding || isFundConfirming,
    isFundSuccess,
    fundHash,
    payerAmountDisplay,
    isLoadingAmount,
  };
}
```

---

## 3. Update useEscrowStatus Hook

**File:** `hooks/useEscrowStatus.ts`

Update the V2 branch to handle new getDetails return:

```typescript
// V3: Pay-per-milestone (10 return values)
if (isV3) {
  const [
    creator,
    payer,
    totalAmount,
    fundedAmount,      // NEW
    releasedAmount,
    stateNum,
    fundedAt,
    autoReleaseDays,
    milestoneCount,
    currentMilestone,  // NEW
  ] = data as [...];

  return {
    isLoading,
    refetch,
    creator,
    payer: payer === ZERO_ADDRESS ? null : payer,
    amount: formatUnits(totalAmount, 6),
    fundedAmount: formatUnits(fundedAmount, 6),      // NEW
    releasedAmount: formatUnits(releasedAmount, 6),
    state: STATE_MAP[stateNum] ?? null,
    fundedAt: fundedAt > BigInt(0) ? new Date(Number(fundedAt) * 1000) : null,
    autoReleaseDays: Number(autoReleaseDays),
    canAutoRelease: canAutoRelease ?? false,
    milestoneCount: Number(milestoneCount),
    currentMilestone: Number(currentMilestone),      // NEW
  };
}
```

---

## 4. Update useMilestoneEscrow Hook

**File:** `hooks/useMilestoneEscrow.ts`

Remove approveMilestone:

```typescript
// DELETE
const approveMilestone = (index: number) => {
  ...
};

// KEEP
const releaseMilestone = (index: number) => {
  ...
};

// UPDATE return
return {
  // REMOVE: approveMilestone,
  releaseMilestone,
  isPending,
  isConfirming,
  isSuccess,
  hash,
  error,
};
```

---

## 5. Add useMilestoneStatus Hook

**File:** `hooks/useMilestoneStatus.ts`

Read individual milestone status from contract:

```typescript
'use client';

import { useReadContract } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

export function useMilestoneStatus(
  escrowAddress: `0x${string}` | undefined,
  milestoneIndex: number
) {
  const { data, isLoading, refetch } = useReadContract({
    address: escrowAddress,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getMilestone',
    args: [BigInt(milestoneIndex)],
    query: { enabled: !!escrowAddress },
  });

  if (!data) {
    return {
      isLoading,
      refetch,
      amount: 0,
      funded: false,
      released: false,
    };
  }

  const [amount, funded, released] = data as [bigint, boolean, boolean];

  return {
    isLoading,
    refetch,
    amount: Number(amount) / 1_000_000,
    funded,
    released,
  };
}
```

---

## Checklist

- [ ] ABI updated with new functions
- [ ] ABI removed old functions (deposit, approveMilestone)
- [ ] useFundMilestone hook created
- [ ] useEscrowStatus updated for V3
- [ ] useMilestoneEscrow cleaned up
- [ ] useMilestoneStatus created
- [ ] TypeScript compiles without errors
