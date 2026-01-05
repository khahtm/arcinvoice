# Phase 1: Smart Contract Modification

## File: `contracts/v2/ArcMilestoneEscrow.sol`

---

## Overview

Rewrite the milestone escrow contract to support pay-per-milestone funding.

---

## Changes

### 1. Update Milestone Struct

```solidity
// BEFORE
struct Milestone {
    uint256 amount;
    bool approved;
    bool released;
}

// AFTER
struct Milestone {
    uint256 amount;
    bool funded;     // renamed from approved
    bool released;
}
```

### 2. Add New State Variables

```solidity
// Add after existing state variables
uint256 public currentMilestone;  // Index of next fundable milestone
uint256 public fundedAmount;      // Total amount funded so far
```

### 3. Update State Enum

```solidity
// Keep same but document new meaning
enum EscrowState {
    CREATED,    // 0 - escrow deployed, awaiting first funding
    ACTIVE,     // 1 - at least one milestone funded (was: FUNDED)
    COMPLETED,  // 2 - all milestones released (was: RELEASED)
    REFUNDED    // 3 - refunded
}
```

### 4. Remove Functions

Delete these functions entirely:
- `deposit()` - replaced by `fundMilestone()`
- `approveMilestone()` - funding = approval

### 5. Add `fundMilestone()` Function

```solidity
/// @notice Payer funds a specific milestone (sequential order required)
/// @param index The milestone index to fund
function fundMilestone(uint256 index) external nonReentrant {
    require(index < milestones.length, "Invalid index");
    require(index == currentMilestone, "Must fund in order");
    require(!milestones[index].funded, "Already funded");

    Milestone storage m = milestones[index];

    // Calculate payer amount for this milestone
    uint256 payerAmount = feeCollector.calculatePayerAmount(m.amount);
    require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");

    // Update state
    m.funded = true;
    fundedAmount += m.amount;
    currentMilestone++;

    // Set payer on first funding
    if (state == EscrowState.CREATED) {
        payer = msg.sender;
        fundedAt = block.timestamp;
        state = EscrowState.ACTIVE;
    }

    emit MilestoneFunded(index, msg.sender, payerAmount);
}
```

### 6. Add New Event

```solidity
event MilestoneFunded(uint256 indexed index, address indexed payer, uint256 amount);
```

### 7. Modify `releaseMilestone()` Function

```solidity
/// @notice Creator releases a funded milestone to receive funds
/// @param index The milestone index to release
function releaseMilestone(uint256 index) external onlyCreator nonReentrant {
    require(state == EscrowState.ACTIVE, "Not active");
    require(index < milestones.length, "Invalid index");
    require(milestones[index].funded, "Not funded");      // Changed from: approved
    require(!milestones[index].released, "Already released");

    _releaseMilestone(index);
}
```

### 8. Modify `refund()` Function

```solidity
/// @notice Creator refunds all funded but unreleased milestones to payer
function refund() external onlyCreator nonReentrant {
    require(state == EscrowState.ACTIVE, "Not active");

    uint256 refundable = 0;
    for (uint256 i = 0; i < milestones.length; i++) {
        if (milestones[i].funded && !milestones[i].released) {
            // Calculate what was deposited for this milestone
            refundable += feeCollector.calculatePayerAmount(milestones[i].amount);
            milestones[i].funded = false;  // Reset funded state
        }
    }

    require(refundable > 0, "Nothing to refund");
    state = EscrowState.REFUNDED;
    require(usdc.transfer(payer, refundable), "Transfer failed");

    emit Refunded(payer, refundable);
}
```

### 9. Modify `autoRelease()` Function

```solidity
/// @notice Anyone can trigger auto-release after deadline
function autoRelease() external nonReentrant {
    require(state == EscrowState.ACTIVE, "Not active");
    require(
        block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
        "Too early for auto-release"
    );

    // Release all funded but unreleased milestones
    for (uint256 i = 0; i < milestones.length; i++) {
        if (milestones[i].funded && !milestones[i].released) {
            _releaseMilestone(i);
        }
    }
}
```

### 10. Update `getMilestone()` Return

```solidity
/// @notice Get milestone details
function getMilestone(uint256 index) external view returns (
    uint256 amount,
    bool funded,      // Changed from: approved
    bool released
) {
    require(index < milestones.length, "Invalid index");
    Milestone memory m = milestones[index];
    return (m.amount, m.funded, m.released);
}
```

### 11. Add `getCurrentMilestone()` View

```solidity
/// @notice Get the index of the next fundable milestone
function getCurrentMilestone() external view returns (uint256) {
    return currentMilestone;
}
```

### 12. Update `getDetails()` Return

```solidity
/// @notice Get escrow details
function getDetails() external view returns (
    address _creator,
    address _payer,
    uint256 _totalAmount,
    uint256 _fundedAmount,      // Changed from: releasedAmount
    uint256 _releasedAmount,
    EscrowState _state,
    uint256 _fundedAt,
    uint256 _autoReleaseDays,
    uint256 _milestoneCount,
    uint256 _currentMilestone   // NEW
) {
    return (
        creator,
        payer,
        totalAmount,
        fundedAmount,
        releasedAmount,
        state,
        fundedAt,
        autoReleaseDays,
        milestones.length,
        currentMilestone
    );
}
```

### 13. Update State Check Modifier

```solidity
// Update inState modifier usage throughout
// Replace: inState(EscrowState.FUNDED)
// With:    require(state == EscrowState.ACTIVE, "Not active")
```

---

## Complete Modified Contract

See full implementation in: `contracts/v2/ArcMilestoneEscrowV2.sol` (to be created)

---

## Compilation & Testing

```bash
# Compile
npx hardhat compile

# Test (create test file first)
npx hardhat test test/ArcMilestoneEscrowV2.test.ts
```

---

## Backward Compatibility

- Old escrows created with previous factory continue to work
- New factory creates escrows with pay-per-milestone logic
- Frontend must detect contract version to use correct flow
