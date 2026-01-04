# Phase 5: Smart Contracts

## Context

- Plan: [plan.md](./plan.md)
- Architecture: [brainstorm report](../reports/brainstorm-260104-2309-arc-invoice-mvp-architecture.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** Pending
- **Effort:** 2 days

Develop and deploy smart contracts for escrow functionality.

## Requirements

### Functional
- Factory contract deploys individual escrows
- Escrow holds USDC until release
- Payer can fund escrow
- Payer can release to creator
- Creator can refund to payer
- Auto-release after deadline

### Non-Functional
- Gas optimized
- Reentrancy protected
- Event emissions for tracking

## Files to Create

| File | Purpose |
|------|---------|
| `contracts/ArcInvoiceFactory.sol` | Factory contract |
| `contracts/ArcInvoiceEscrow.sol` | Escrow contract |
| `contracts/interfaces/IERC20.sol` | ERC20 interface |
| `hardhat.config.ts` | Hardhat config |
| `scripts/deploy.ts` | Deployment script |
| `test/ArcInvoiceEscrow.test.ts` | Contract tests |

## Implementation Steps

### Step 1: Initialize Hardhat

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Select: TypeScript project

### Step 2: Install OpenZeppelin

```bash
npm install @openzeppelin/contracts
```

### Step 3: Create Hardhat Config

Create `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || 'https://testnet-rpc.arc.circle.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 18500,
    },
    arcMainnet: {
      url: process.env.ARC_MAINNET_RPC_URL || 'https://rpc.arc.circle.com',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 185,
    },
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_EXPLORER_API_KEY || '',
    },
    customChains: [
      {
        network: 'arcTestnet',
        chainId: 18500,
        urls: {
          apiURL: 'https://testnet-explorer.arc.circle.com/api',
          browserURL: 'https://testnet-explorer.arc.circle.com',
        },
      },
    ],
  },
};

export default config;
```

### Step 4: Create Escrow Contract

Create `contracts/ArcInvoiceEscrow.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ArcInvoiceEscrow is ReentrancyGuard {
    // State
    enum EscrowState { CREATED, FUNDED, RELEASED, REFUNDED }

    address public immutable creator;
    address public payer;
    IERC20 public immutable usdc;
    uint256 public immutable amount;
    uint256 public immutable autoReleaseDays;
    uint256 public fundedAt;
    EscrowState public state;

    // Events
    event Funded(address indexed payer, uint256 amount, uint256 timestamp);
    event Released(address indexed recipient, uint256 amount);
    event Refunded(address indexed recipient, uint256 amount);

    // Modifiers
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
        uint256 _amount,
        uint256 _autoReleaseDays
    ) {
        require(_creator != address(0), "Invalid creator");
        require(_usdc != address(0), "Invalid USDC");
        require(_amount > 0, "Invalid amount");
        require(_autoReleaseDays > 0 && _autoReleaseDays <= 90, "Invalid days");

        creator = _creator;
        usdc = IERC20(_usdc);
        amount = _amount;
        autoReleaseDays = _autoReleaseDays;
        state = EscrowState.CREATED;
    }

    /// @notice Payer deposits USDC into escrow
    function deposit() external inState(EscrowState.CREATED) nonReentrant {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        payer = msg.sender;
        fundedAt = block.timestamp;
        state = EscrowState.FUNDED;

        emit Funded(msg.sender, amount, fundedAt);
    }

    /// @notice Payer releases funds to creator (approves work)
    function release() external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");

        emit Released(creator, amount);
    }

    /// @notice Creator voluntarily refunds payer
    function refund() external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, amount), "Transfer failed");

        emit Refunded(payer, amount);
    }

    /// @notice Auto-release after deadline (callable by anyone)
    function autoRelease() external inState(EscrowState.FUNDED) nonReentrant {
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Too early"
        );

        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");

        emit Released(creator, amount);
    }

    /// @notice Get escrow details
    function getDetails() external view returns (
        address _creator,
        address _payer,
        uint256 _amount,
        EscrowState _state,
        uint256 _fundedAt,
        uint256 _autoReleaseDays
    ) {
        return (creator, payer, amount, state, fundedAt, autoReleaseDays);
    }

    /// @notice Check if auto-release is available
    function canAutoRelease() external view returns (bool) {
        return state == EscrowState.FUNDED &&
               block.timestamp >= fundedAt + (autoReleaseDays * 1 days);
    }
}
```

### Step 5: Create Factory Contract

Create `contracts/ArcInvoiceFactory.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ArcInvoiceEscrow.sol";

contract ArcInvoiceFactory {
    address public immutable usdc;

    // Tracking
    mapping(bytes32 => address) public invoiceToEscrow;
    address[] public allEscrows;

    // Events
    event EscrowCreated(
        bytes32 indexed invoiceId,
        address indexed escrow,
        address indexed creator,
        uint256 amount
    );

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC");
        usdc = _usdc;
    }

    /// @notice Create new escrow for an invoice
    function createEscrow(
        bytes32 invoiceId,
        uint256 amount,
        uint256 autoReleaseDays
    ) external returns (address) {
        require(invoiceToEscrow[invoiceId] == address(0), "Already exists");

        ArcInvoiceEscrow escrow = new ArcInvoiceEscrow(
            msg.sender, // creator
            usdc,
            amount,
            autoReleaseDays
        );

        address escrowAddress = address(escrow);
        invoiceToEscrow[invoiceId] = escrowAddress;
        allEscrows.push(escrowAddress);

        emit EscrowCreated(invoiceId, escrowAddress, msg.sender, amount);

        return escrowAddress;
    }

    /// @notice Get escrow address for invoice
    function getEscrow(bytes32 invoiceId) external view returns (address) {
        return invoiceToEscrow[invoiceId];
    }

    /// @notice Get total escrow count
    function getEscrowCount() external view returns (uint256) {
        return allEscrows.length;
    }
}
```

### Step 6: Create Deployment Script

Create `scripts/deploy.ts`:

```typescript
import { ethers, run, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  // Get USDC address for network
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  if (!USDC_ADDRESS) {
    throw new Error('USDC_ADDRESS not set');
  }

  console.log('USDC Address:', USDC_ADDRESS);

  // Deploy Factory
  const Factory = await ethers.getContractFactory('ArcInvoiceFactory');
  const factory = await Factory.deploy(USDC_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log('ArcInvoiceFactory deployed to:', factoryAddress);

  // Verify on explorer (if not local)
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('Waiting for confirmations...');
    await factory.deploymentTransaction()?.wait(5);

    console.log('Verifying on explorer...');
    try {
      await run('verify:verify', {
        address: factoryAddress,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log('Verified!');
    } catch (error) {
      console.log('Verification failed:', error);
    }
  }

  // Output for .env
  console.log('\n--- Add to .env ---');
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 7: Create Tests

Create `test/ArcInvoiceEscrow.test.ts`:

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('ArcInvoiceEscrow', function () {
  let factory: any;
  let usdc: any;
  let creator: any;
  let payer: any;

  const AMOUNT = ethers.parseUnits('100', 6); // 100 USDC
  const AUTO_RELEASE_DAYS = 14;

  beforeEach(async function () {
    [creator, payer] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    usdc = await MockERC20.deploy('USD Coin', 'USDC', 6);

    // Mint USDC to payer
    await usdc.mint(payer.address, ethers.parseUnits('10000', 6));

    // Deploy factory
    const Factory = await ethers.getContractFactory('ArcInvoiceFactory');
    factory = await Factory.deploy(await usdc.getAddress());
  });

  describe('Factory', function () {
    it('should create escrow', async function () {
      const invoiceId = ethers.id('invoice-001');

      const tx = await factory.createEscrow(invoiceId, AMOUNT, AUTO_RELEASE_DAYS);
      await tx.wait();

      const escrowAddress = await factory.getEscrow(invoiceId);
      expect(escrowAddress).to.not.equal(ethers.ZeroAddress);
    });

    it('should prevent duplicate invoice IDs', async function () {
      const invoiceId = ethers.id('invoice-001');

      await factory.createEscrow(invoiceId, AMOUNT, AUTO_RELEASE_DAYS);

      await expect(
        factory.createEscrow(invoiceId, AMOUNT, AUTO_RELEASE_DAYS)
      ).to.be.revertedWith('Already exists');
    });
  });

  describe('Escrow', function () {
    let escrow: any;

    beforeEach(async function () {
      const invoiceId = ethers.id('invoice-001');
      await factory.createEscrow(invoiceId, AMOUNT, AUTO_RELEASE_DAYS);
      const escrowAddress = await factory.getEscrow(invoiceId);

      escrow = await ethers.getContractAt('ArcInvoiceEscrow', escrowAddress);
    });

    it('should allow payer to deposit', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      expect(await escrow.state()).to.equal(1); // FUNDED
      expect(await escrow.payer()).to.equal(payer.address);
    });

    it('should allow payer to release', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      const creatorBalanceBefore = await usdc.balanceOf(creator.address);
      await escrow.connect(payer).release();

      expect(await escrow.state()).to.equal(2); // RELEASED
      expect(await usdc.balanceOf(creator.address)).to.equal(
        creatorBalanceBefore + AMOUNT
      );
    });

    it('should allow creator to refund', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      const payerBalanceBefore = await usdc.balanceOf(payer.address);
      await escrow.connect(creator).refund();

      expect(await escrow.state()).to.equal(3); // REFUNDED
      expect(await usdc.balanceOf(payer.address)).to.equal(
        payerBalanceBefore + AMOUNT
      );
    });

    it('should allow auto-release after deadline', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      // Fast forward time
      await time.increase(AUTO_RELEASE_DAYS * 24 * 60 * 60);

      const creatorBalanceBefore = await usdc.balanceOf(creator.address);
      await escrow.autoRelease();

      expect(await escrow.state()).to.equal(2); // RELEASED
      expect(await usdc.balanceOf(creator.address)).to.equal(
        creatorBalanceBefore + AMOUNT
      );
    });

    it('should prevent auto-release before deadline', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      await expect(escrow.autoRelease()).to.be.revertedWith('Too early');
    });
  });
});
```

### Step 8: Create Mock ERC20 for Tests

Create `contracts/test/MockERC20.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

### Step 9: Add Scripts to package.json

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test:contracts": "hardhat test",
    "deploy:testnet": "hardhat run scripts/deploy.ts --network arcTestnet",
    "deploy:mainnet": "hardhat run scripts/deploy.ts --network arcMainnet"
  }
}
```

## Todo List

- [ ] Initialize Hardhat project
- [ ] Install OpenZeppelin contracts
- [ ] Create Hardhat config with Arc networks
- [ ] Create ArcInvoiceEscrow contract
- [ ] Create ArcInvoiceFactory contract
- [ ] Create MockERC20 for testing
- [ ] Write comprehensive tests
- [ ] Run tests locally
- [ ] Deploy to Arc testnet
- [ ] Verify contracts on explorer
- [ ] Update .env with deployed addresses

## Success Criteria

- [ ] All tests pass
- [ ] Factory deploys escrows correctly
- [ ] Deposit/release/refund work
- [ ] Auto-release works after deadline
- [ ] Contracts verified on explorer
- [ ] Gas costs acceptable

## Security Considerations

- ReentrancyGuard on all fund transfers
- Access control on sensitive functions
- State machine prevents invalid transitions
- Immutable addresses prevent tampering

## Next Steps

After completion, proceed to Phase 6: Escrow Integration
