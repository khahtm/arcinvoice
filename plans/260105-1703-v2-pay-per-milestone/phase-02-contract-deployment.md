# Phase 2: Contract Deployment

## Overview

Deploy modified V2 contracts to Arc testnet and update frontend addresses.

---

## Prerequisites

- Phase 1 complete (contracts modified)
- Hardhat configured for Arc testnet
- Deployer wallet funded with ARC

---

## Steps

### 1. Compile Contracts

```bash
npx hardhat compile
```

Ensure no errors in modified contracts.

### 2. Create Deployment Script

**File:** `scripts/deploy-v2-pay-per-milestone.ts`

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Existing addresses (don't redeploy)
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
  const FEE_COLLECTOR = "0xAE80D683b366e144DFdDD7e2D9667414F689CD9f";

  // Deploy new MilestoneFactory
  const MilestoneFactory = await ethers.getContractFactory("ArcMilestoneFactory");
  const factory = await MilestoneFactory.deploy(USDC_ADDRESS, FEE_COLLECTOR);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("New MilestoneFactory deployed:", factoryAddress);

  // Verify on explorer
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network arc-testnet ${factoryAddress} ${USDC_ADDRESS} ${FEE_COLLECTOR}`);
}

main().catch(console.error);
```

### 3. Deploy to Testnet

```bash
npx hardhat run scripts/deploy-v2-pay-per-milestone.ts --network arc-testnet
```

### 4. Update Frontend Addresses

**File:** `lib/contracts/addresses.ts`

```typescript
export const CONTRACTS = {
  5042002: {
    USDC: '0x3600000000000000000000000000000000000000' as const,
    FACTORY: '0x07a7be2be306a4C37c7E526235BEcB7BF4C018FB' as const,
    FEE_COLLECTOR: '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f' as const,
    // Old factory (for existing V2 escrows)
    MILESTONE_FACTORY_V2_OLD: '0x9F9c0955083459978Af2EaCc6C223315085Fb777' as const,
    // New factory (pay-per-milestone)
    MILESTONE_FACTORY: '0x<NEW_ADDRESS_HERE>' as const,
  },
  // ...
} as const;
```

### 5. Version Detection Strategy

For new invoices:
- Use new `MILESTONE_FACTORY` address
- Creates pay-per-milestone escrows

For existing invoices:
- Check `invoice.escrow_address`
- If created before this deploy → old flow
- If created after → new pay-per-milestone flow

**Option A:** Store contract version in DB (simpler)
```sql
-- Already have contract_version column
-- V2 = old fund-all-upfront
-- V3 = new pay-per-milestone
UPDATE invoices SET contract_version = 3 WHERE ...
```

**Option B:** Detect from contract (no DB change)
```typescript
// Try calling currentMilestone() - only exists in new contract
const hasPayPerMilestone = await contract.read.getCurrentMilestone?.()
  .then(() => true)
  .catch(() => false);
```

### 6. Verification

After deployment:

```bash
# Verify factory
npx hardhat verify --network arc-testnet <FACTORY_ADDRESS> \
  0x3600000000000000000000000000000000000000 \
  0xAE80D683b366e144DFdDD7e2D9667414F689CD9f
```

---

## Rollback Plan

If issues found:
1. Revert `addresses.ts` to old factory address
2. New invoices will use old flow
3. Fix issues and redeploy

---

## Checklist

- [ ] Contracts compile without errors
- [ ] Deployment script tested locally
- [ ] Deployed to testnet
- [ ] Factory address updated in frontend
- [ ] Contract verified on explorer
- [ ] Test escrow creation works
