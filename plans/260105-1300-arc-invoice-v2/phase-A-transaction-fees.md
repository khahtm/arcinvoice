# Phase A: Transaction Fees

## Context

- Plan: [plan.md](./plan.md)
- Depends on: MVP complete

## Overview

- **Priority:** P1
- **Status:** Planned
- **Effort:** 1 week

Implement transaction fee collection with 50/50 split between payer and creator.

## Requirements

### Functional
- 1% total fee (0.5% each party)
- Fee collected on escrow release only (direct payments free for now)
- Fee recipient address configurable
- Fee tracking in database
- Admin view of collected fees

### Non-Functional
- No breaking changes to existing contracts
- Deploy as v2 contracts alongside v1
- Gas-efficient fee calculation

## Fee Model

```
Invoice: $1,000 USDC

Payer deposits:  $1,005 USDC (amount + 0.5% fee)
Escrow holds:    $1,005 USDC
On release:
  - Creator gets: $995 USDC (amount - 0.5% fee)
  - Fee recipient: $10 USDC (1% total)
```

## Smart Contract Changes

### New: `contracts/v2/FeeCollector.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FeeCollector
/// @notice Collects and manages protocol fees
contract FeeCollector is Ownable {
    IERC20 public immutable usdc;

    uint256 public constant FEE_BPS = 100; // 1% total (100 basis points)
    uint256 public totalCollected;

    event FeeCollected(address indexed from, uint256 amount);
    event FeeWithdrawn(address indexed to, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /// @notice Calculate fee for amount
    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BPS) / 10000;
    }

    /// @notice Calculate payer amount (amount + half fee)
    function calculatePayerAmount(uint256 invoiceAmount) public pure returns (uint256) {
        uint256 halfFee = calculateFee(invoiceAmount) / 2;
        return invoiceAmount + halfFee;
    }

    /// @notice Calculate creator amount (amount - half fee)
    function calculateCreatorAmount(uint256 invoiceAmount) public pure returns (uint256) {
        uint256 halfFee = calculateFee(invoiceAmount) / 2;
        return invoiceAmount - halfFee;
    }

    /// @notice Record fee collection (called by escrow contracts)
    function recordFee(uint256 amount) external {
        totalCollected += amount;
        emit FeeCollected(msg.sender, amount);
    }

    /// @notice Withdraw collected fees
    function withdraw(address to) external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        require(usdc.transfer(to, balance), "Transfer failed");
        emit FeeWithdrawn(to, balance);
    }
}
```

### New: `contracts/v2/ArcMilestoneEscrow.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FeeCollector.sol";

/// @title ArcMilestoneEscrow
/// @notice Escrow with milestone support and fee collection
contract ArcMilestoneEscrow is ReentrancyGuard {
    enum EscrowState { CREATED, FUNDED, RELEASED, REFUNDED }

    struct Milestone {
        uint256 amount;
        bool approved;
        bool released;
    }

    address public immutable creator;
    address public payer;
    IERC20 public immutable usdc;
    FeeCollector public immutable feeCollector;

    uint256 public immutable totalAmount;
    uint256 public immutable autoReleaseDays;
    uint256 public fundedAt;
    uint256 public releasedAmount;

    Milestone[] public milestones;
    EscrowState public state;

    event Funded(address indexed payer, uint256 amount, uint256 timestamp);
    event MilestoneApproved(uint256 indexed index);
    event MilestoneReleased(uint256 indexed index, uint256 amount, uint256 fee);
    event Refunded(address indexed recipient, uint256 amount);

    modifier onlyPayer() {
        require(msg.sender == payer, "Only payer");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid state");
        _;
    }

    constructor(
        address _creator,
        address _usdc,
        address _feeCollector,
        uint256[] memory _milestoneAmounts,
        uint256 _autoReleaseDays
    ) {
        require(_creator != address(0), "Invalid creator");
        require(_usdc != address(0), "Invalid USDC");
        require(_milestoneAmounts.length > 0, "No milestones");
        require(_autoReleaseDays > 0 && _autoReleaseDays <= 90, "Invalid days");

        creator = _creator;
        usdc = IERC20(_usdc);
        feeCollector = FeeCollector(_feeCollector);
        autoReleaseDays = _autoReleaseDays;
        state = EscrowState.CREATED;

        uint256 total;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Invalid milestone amount");
            milestones.push(Milestone({
                amount: _milestoneAmounts[i],
                approved: false,
                released: false
            }));
            total += _milestoneAmounts[i];
        }
        totalAmount = total;
    }

    /// @notice Payer deposits with fee
    function deposit() external inState(EscrowState.CREATED) nonReentrant {
        uint256 payerAmount = feeCollector.calculatePayerAmount(totalAmount);
        require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");

        payer = msg.sender;
        fundedAt = block.timestamp;
        state = EscrowState.FUNDED;

        emit Funded(msg.sender, payerAmount, fundedAt);
    }

    /// @notice Payer approves milestone
    function approveMilestone(uint256 index) external onlyPayer inState(EscrowState.FUNDED) {
        require(index < milestones.length, "Invalid index");
        require(!milestones[index].approved, "Already approved");

        milestones[index].approved = true;
        emit MilestoneApproved(index);
    }

    /// @notice Creator releases approved milestone
    function releaseMilestone(uint256 index) external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        require(index < milestones.length, "Invalid index");
        require(milestones[index].approved, "Not approved");
        require(!milestones[index].released, "Already released");

        Milestone storage m = milestones[index];
        m.released = true;

        uint256 creatorAmount = feeCollector.calculateCreatorAmount(m.amount);
        uint256 fee = feeCollector.calculateFee(m.amount);

        // Transfer to creator
        require(usdc.transfer(creator, creatorAmount), "Creator transfer failed");

        // Transfer fee to collector
        require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
        feeCollector.recordFee(fee);

        releasedAmount += m.amount;
        emit MilestoneReleased(index, creatorAmount, fee);

        // Check if all released
        if (releasedAmount >= totalAmount) {
            state = EscrowState.RELEASED;
        }
    }

    /// @notice Creator refunds remaining amount
    function refund() external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        uint256 remaining = _getBalance();
        require(remaining > 0, "Nothing to refund");

        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, remaining), "Transfer failed");

        emit Refunded(payer, remaining);
    }

    /// @notice Auto-release all remaining milestones after deadline
    function autoRelease() external inState(EscrowState.FUNDED) nonReentrant {
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Too early"
        );

        // Release all unreleased milestones
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                milestones[i].approved = true;
                milestones[i].released = true;

                uint256 creatorAmount = feeCollector.calculateCreatorAmount(milestones[i].amount);
                uint256 fee = feeCollector.calculateFee(milestones[i].amount);

                require(usdc.transfer(creator, creatorAmount), "Creator transfer failed");
                require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
                feeCollector.recordFee(fee);

                releasedAmount += milestones[i].amount;
                emit MilestoneReleased(i, creatorAmount, fee);
            }
        }

        state = EscrowState.RELEASED;
    }

    /// @notice Get milestone count
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    /// @notice Get milestone details
    function getMilestone(uint256 index) external view returns (
        uint256 amount,
        bool approved,
        bool released
    ) {
        require(index < milestones.length, "Invalid index");
        Milestone memory m = milestones[index];
        return (m.amount, m.approved, m.released);
    }

    /// @notice Check if can auto-release
    function canAutoRelease() external view returns (bool) {
        return state == EscrowState.FUNDED &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }

    /// @notice Get contract balance
    function _getBalance() internal view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
```

### New: `contracts/v2/ArcMilestoneFactory.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ArcMilestoneEscrow.sol";

/// @title ArcMilestoneFactory
/// @notice Factory for creating milestone escrow contracts
contract ArcMilestoneFactory {
    address public immutable usdc;
    address public immutable feeCollector;

    mapping(bytes32 => address) public invoiceToEscrow;
    address[] public allEscrows;

    event EscrowCreated(
        bytes32 indexed invoiceId,
        address indexed escrow,
        address indexed creator,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    constructor(address _usdc, address _feeCollector) {
        require(_usdc != address(0), "Invalid USDC");
        require(_feeCollector != address(0), "Invalid fee collector");
        usdc = _usdc;
        feeCollector = _feeCollector;
    }

    /// @notice Create new milestone escrow
    function createEscrow(
        bytes32 invoiceId,
        uint256[] calldata milestoneAmounts,
        uint256 autoReleaseDays
    ) external returns (address) {
        require(invoiceToEscrow[invoiceId] == address(0), "Already exists");

        ArcMilestoneEscrow escrow = new ArcMilestoneEscrow(
            msg.sender,
            usdc,
            feeCollector,
            milestoneAmounts,
            autoReleaseDays
        );

        address escrowAddress = address(escrow);
        invoiceToEscrow[invoiceId] = escrowAddress;
        allEscrows.push(escrowAddress);

        uint256 total;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            total += milestoneAmounts[i];
        }

        emit EscrowCreated(invoiceId, escrowAddress, msg.sender, total, milestoneAmounts.length);

        return escrowAddress;
    }

    function getEscrow(bytes32 invoiceId) external view returns (address) {
        return invoiceToEscrow[invoiceId];
    }

    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
```

## Database Changes

```sql
-- Add fee tracking columns
ALTER TABLE invoices ADD COLUMN fee_amount BIGINT DEFAULT 0;
ALTER TABLE invoices ADD COLUMN fee_collected BOOLEAN DEFAULT false;

-- Add contract version tracking
ALTER TABLE invoices ADD COLUMN contract_version INT DEFAULT 1;
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `contracts/v2/FeeCollector.sol` | Create | Fee collection contract |
| `contracts/v2/ArcMilestoneEscrow.sol` | Create | Escrow with fees + milestones |
| `contracts/v2/ArcMilestoneFactory.sol` | Create | Factory for v2 escrows |
| `scripts/deploy-v2.ts` | Create | Deploy v2 contracts |
| `lib/contracts/addresses.ts` | Modify | Add v2 addresses |
| `lib/contracts/abi.ts` | Modify | Add v2 ABIs |
| `hooks/useFeeCalculation.ts` | Create | Calculate fees for UI |
| `components/payment/FeeBreakdown.tsx` | Create | Display fee breakdown |
| `app/(auth)/admin/fees/page.tsx` | Create | Admin fee dashboard |

## Implementation Steps

### Step 1: Smart Contracts (2 days)

1. Create `contracts/v2/` directory
2. Write `FeeCollector.sol`
3. Write `ArcMilestoneEscrow.sol`
4. Write `ArcMilestoneFactory.sol`
5. Write unit tests for fee calculations
6. Compile and verify

### Step 2: Deploy Script (0.5 days)

Create `scripts/deploy-v2.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS!;

  // Deploy FeeCollector
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(USDC_ADDRESS);
  await feeCollector.waitForDeployment();
  console.log("FeeCollector:", await feeCollector.getAddress());

  // Deploy MilestoneFactory
  const Factory = await ethers.getContractFactory("ArcMilestoneFactory");
  const factory = await Factory.deploy(
    USDC_ADDRESS,
    await feeCollector.getAddress()
  );
  await factory.waitForDeployment();
  console.log("MilestoneFactory:", await factory.getAddress());
}

main().catch(console.error);
```

### Step 3: Frontend Integration (1.5 days)

1. Update `lib/contracts/addresses.ts` with v2 addresses
2. Add ABIs for v2 contracts
3. Create `useFeeCalculation` hook
4. Create `FeeBreakdown` component
5. Update payment flow to show fee breakdown

### Step 4: Database & API (1 day)

1. Run migration for fee columns
2. Update invoice API to track fees
3. Create admin fee endpoint

### Step 5: Testing (1 day)

1. Test fee calculation on testnet
2. Test full payment flow with fees
3. Verify fee collection in FeeCollector

## Fee Calculation Hook

```typescript
// hooks/useFeeCalculation.ts
import { useMemo } from 'react';

const FEE_BPS = 100; // 1%

export function useFeeCalculation(amount: number) {
  return useMemo(() => {
    const fee = Math.floor((amount * FEE_BPS) / 10000);
    const halfFee = Math.floor(fee / 2);

    return {
      invoiceAmount: amount,
      payerAmount: amount + halfFee,     // What payer deposits
      creatorAmount: amount - halfFee,   // What creator receives
      totalFee: fee,
      payerFee: halfFee,
      creatorFee: halfFee,
    };
  }, [amount]);
}
```

## Fee Breakdown Component

```typescript
// components/payment/FeeBreakdown.tsx
'use client';

import { useFeeCalculation } from '@/hooks/useFeeCalculation';
import { formatUSDC } from '@/lib/utils';

interface FeeBreakdownProps {
  amount: number;
  variant: 'payer' | 'creator';
}

export function FeeBreakdown({ amount, variant }: FeeBreakdownProps) {
  const fees = useFeeCalculation(amount);

  if (variant === 'payer') {
    return (
      <div className="text-sm space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>Invoice amount</span>
          <span>{formatUSDC(fees.invoiceAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Platform fee (0.5%)</span>
          <span>+{formatUSDC(fees.payerFee)}</span>
        </div>
        <div className="flex justify-between font-medium text-foreground border-t pt-1">
          <span>You pay</span>
          <span>{formatUSDC(fees.payerAmount)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm space-y-1 text-muted-foreground">
      <div className="flex justify-between">
        <span>Invoice amount</span>
        <span>{formatUSDC(fees.invoiceAmount)}</span>
      </div>
      <div className="flex justify-between">
        <span>Platform fee (0.5%)</span>
        <span>-{formatUSDC(fees.creatorFee)}</span>
      </div>
      <div className="flex justify-between font-medium text-foreground border-t pt-1">
        <span>You receive</span>
        <span>{formatUSDC(fees.creatorAmount)}</span>
      </div>
    </div>
  );
}
```

## Admin Fee Dashboard

```typescript
// app/(auth)/admin/fees/page.tsx
'use client';

import { useReadContract } from 'wagmi';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { formatUSDC } from '@/lib/utils';
import { FEE_COLLECTOR_ABI } from '@/lib/contracts/abi';
import { getContractAddresses } from '@/lib/contracts/addresses';

export default function AdminFeesPage() {
  const addresses = getContractAddresses();

  const { data: totalCollected } = useReadContract({
    address: addresses.feeCollector,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'totalCollected',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fee Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Fees Collected"
          value={formatUSDC(Number(totalCollected || 0))}
        />
        {/* Add more stats */}
      </div>
    </div>
  );
}
```

## Todo List

- [ ] Create contracts/v2/ directory
- [ ] Write FeeCollector.sol
- [ ] Write ArcMilestoneEscrow.sol
- [ ] Write ArcMilestoneFactory.sol
- [ ] Write contract unit tests
- [ ] Create deploy-v2.ts script
- [ ] Deploy to testnet
- [ ] Update lib/contracts/addresses.ts
- [ ] Update lib/contracts/abi.ts
- [ ] Create useFeeCalculation hook
- [ ] Create FeeBreakdown component
- [ ] Update payment page with fee display
- [ ] Run database migration
- [ ] Create admin fee dashboard
- [ ] Test full flow on testnet

## Success Criteria

- [ ] v2 contracts deployed on testnet
- [ ] Fee calculation accurate (within 1 wei tolerance)
- [ ] Fee displayed to users before payment
- [ ] Fees successfully collected in FeeCollector
- [ ] Admin can view total collected fees
- [ ] v1 contracts still functional

## Next Steps

After completion, proceed to Phase B: Milestone Payments
