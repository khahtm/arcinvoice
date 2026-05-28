const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('ArcDealEscrow V6', function () {
  let usdc: any;
  let feeCollector: any;
  let factory: any;
  let creator: any;
  let client: any;
  let other: any;
  let executor: any;

  const MILESTONE_AMOUNTS = [
    ethers.parseUnits('500', 6),
    ethers.parseUnits('1500', 6),
    ethers.parseUnits('500', 6),
  ];
  const TERMS_HASH = ethers.keccak256(ethers.toUtf8Bytes('deal-terms-v1'));
  const AUTO_RELEASE_DAYS = 14;

  const DISPUTE_TIMEOUT_DAYS = 30;

  async function deployDeal(expectedClient: string = ethers.ZeroAddress) {
    const dealId = ethers.keccak256(ethers.toUtf8Bytes('deal-001'));
    const tx = await factory.connect(creator).createDeal(
      dealId, MILESTONE_AMOUNTS, TERMS_HASH, AUTO_RELEASE_DAYS, expectedClient
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === 'DealCreated');
    const escrowAddr = event ? event.args[1] : await factory.getEscrow(dealId);
    return ethers.getContractAt('ArcDealEscrow', escrowAddr);
  }

  async function signedDeal() {
    const deal = await deployDeal();
    await deal.connect(client).signTerms();
    return deal;
  }

  async function fundedDeal() {
    const deal = await signedDeal();
    const amt0 = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[0]);
    await usdc.connect(client).approve(await deal.getAddress(), amt0);
    await deal.connect(client).fundMilestone(0);
    return deal;
  }

  beforeEach(async function () {
    [creator, client, other, executor] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    usdc = await MockERC20.deploy('USD Coin', 'USDC', 6);

    const FeeCollector = await ethers.getContractFactory('FeeCollector');
    feeCollector = await FeeCollector.deploy(await usdc.getAddress());

    const Factory = await ethers.getContractFactory('ArcDealFactory');
    factory = await Factory.deploy(
      await usdc.getAddress(), await feeCollector.getAddress(), executor.address
    );

    await usdc.mint(client.address, ethers.parseUnits('50000', 6));
  });

  // ==========================================================================
  // Factory
  // ==========================================================================

  describe('Factory', function () {
    it('creates deal escrow with correct state', async function () {
      const deal = await deployDeal();
      const [_creator, _client, _hash] = await deal.getParties();
      expect(_creator).to.equal(creator.address);
      expect(_client).to.equal(ethers.ZeroAddress);
      expect(_hash).to.equal(TERMS_HASH);

      const [total, funded, released, count, current] = await deal.getAmounts();
      expect(total).to.equal(ethers.parseUnits('2500', 6));
      expect(funded).to.equal(0);
      expect(count).to.equal(3);
    });

    it('rejects duplicate deal id', async function () {
      const dealId = ethers.keccak256(ethers.toUtf8Bytes('dup-deal'));
      await factory.connect(creator).createDeal(dealId, MILESTONE_AMOUNTS, TERMS_HASH, 14, ethers.ZeroAddress);
      await expect(
        factory.connect(creator).createDeal(dealId, MILESTONE_AMOUNTS, TERMS_HASH, 14, ethers.ZeroAddress)
      ).to.be.revertedWith('Deal already exists');
    });

    it('rejects 0 milestones', async function () {
      const dealId = ethers.keccak256(ethers.toUtf8Bytes('empty'));
      await expect(
        factory.connect(creator).createDeal(dealId, [], TERMS_HASH, 14, ethers.ZeroAddress)
      ).to.be.revertedWith('1-20 milestones');
    });

    it('rejects >20 milestones', async function () {
      const dealId = ethers.keccak256(ethers.toUtf8Bytes('toomany'));
      const amounts = Array(21).fill(ethers.parseUnits('1', 6));
      await expect(
        factory.connect(creator).createDeal(dealId, amounts, TERMS_HASH, 14, ethers.ZeroAddress)
      ).to.be.revertedWith('1-20 milestones');
    });

    it('rejects dust total (<$1)', async function () {
      const dealId = ethers.keccak256(ethers.toUtf8Bytes('dust'));
      await expect(
        factory.connect(creator).createDeal(dealId, [100n], TERMS_HASH, 14, ethers.ZeroAddress) // $0.0001
      ).to.be.revertedWith('Min $1 total');
    });
  });

  // ==========================================================================
  // Sign Terms
  // ==========================================================================

  describe('Sign Terms', function () {
    it('client signs and state becomes SIGNED', async function () {
      const deal = await deployDeal();
      await deal.connect(client).signTerms();
      const [s] = await deal.getState();
      expect(s).to.equal(1); // SIGNED
      const [, _client] = await deal.getParties();
      expect(_client).to.equal(client.address);
    });

    it('blocks self-deal (creator cannot sign)', async function () {
      const deal = await deployDeal();
      await expect(deal.connect(creator).signTerms()).to.be.revertedWith('Self-deal blocked');
    });

    it('rejects signing when not in CREATED state', async function () {
      const deal = await signedDeal();
      await expect(deal.connect(other).signTerms()).to.be.revertedWith('Invalid state');
    });
  });

  // ==========================================================================
  // Fund Milestone
  // ==========================================================================

  describe('Fund Milestone', function () {
    it('funds milestone 0 and transitions to ACTIVE', async function () {
      const deal = await fundedDeal();
      const [s] = await deal.getState();
      expect(s).to.equal(3); // ACTIVE

      const [amt, funded] = await deal.getMilestone(0);
      expect(funded).to.be.true;
    });

    it('rejects funding out of order', async function () {
      const deal = await signedDeal();
      const amt1 = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[1]);
      await usdc.connect(client).approve(await deal.getAddress(), amt1);
      await expect(deal.connect(client).fundMilestone(1)).to.be.revertedWith('Fund in order');
    });

    it('rejects double funding (currentMilestone already advanced)', async function () {
      const deal = await fundedDeal();
      const amt0 = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[0]);
      await usdc.connect(client).approve(await deal.getAddress(), amt0);
      await expect(deal.connect(client).fundMilestone(0)).to.be.revertedWith('Fund in order');
    });

    it('rejects non-client funding', async function () {
      const deal = await signedDeal();
      const amt0 = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[0]);
      await usdc.mint(other.address, amt0);
      await usdc.connect(other).approve(await deal.getAddress(), amt0);
      await expect(deal.connect(other).fundMilestone(0)).to.be.revertedWith('Only client');
    });
  });

  // ==========================================================================
  // Deliver → Approve → Release
  // ==========================================================================

  describe('Delivery Flow', function () {
    it('full flow: deliver → approve → release', async function () {
      const deal = await fundedDeal();
      const creatorBefore = await usdc.balanceOf(creator.address);

      await deal.connect(creator).submitDelivery(0);
      const [, , delivered] = await deal.getMilestone(0);
      expect(delivered).to.be.true;

      await deal.connect(client).approveMilestone(0);
      const [, , , approved] = await deal.getMilestone(0);
      expect(approved).to.be.true;

      await deal.connect(creator).releaseMilestone(0);
      const [, , , , released] = await deal.getMilestone(0);
      expect(released).to.be.true;

      const creatorAfter = await usdc.balanceOf(creator.address);
      expect(creatorAfter).to.be.greaterThan(creatorBefore);
    });

    it('rejects delivery on unfunded milestone', async function () {
      const deal = await fundedDeal();
      await expect(deal.connect(creator).submitDelivery(1)).to.be.revertedWith('Not funded');
    });

    it('rejects approval before delivery', async function () {
      const deal = await fundedDeal();
      await expect(deal.connect(client).approveMilestone(0)).to.be.revertedWith('Not delivered');
    });

    it('rejects release before approval', async function () {
      const deal = await fundedDeal();
      await deal.connect(creator).submitDelivery(0);
      await expect(deal.connect(creator).releaseMilestone(0)).to.be.revertedWith('Not approved');
    });

    it('client cannot submit delivery', async function () {
      const deal = await fundedDeal();
      await expect(deal.connect(client).submitDelivery(0)).to.be.revertedWith('Only creator');
    });

    it('creator cannot approve', async function () {
      const deal = await fundedDeal();
      await deal.connect(creator).submitDelivery(0);
      await expect(deal.connect(creator).approveMilestone(0)).to.be.revertedWith('Only client');
    });
  });

  // ==========================================================================
  // Auto-Release
  // ==========================================================================

  describe('Auto-Release', function () {
    it('releases after deadline', async function () {
      const deal = await fundedDeal();
      await time.increase(AUTO_RELEASE_DAYS * 86400 + 1);
      await deal.autoRelease();
      const [, , , , released] = await deal.getMilestone(0);
      expect(released).to.be.true;
    });

    it('rejects before deadline', async function () {
      const deal = await fundedDeal();
      await expect(deal.autoRelease()).to.be.revertedWith('Too early');
    });

    it('rejects during dispute', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      await time.increase(AUTO_RELEASE_DAYS * 86400 + 1);
      await expect(deal.autoRelease()).to.be.revertedWith('Not active');
    });
  });

  // ==========================================================================
  // Dispute
  // ==========================================================================

  describe('Dispute', function () {
    it('client opens dispute, state becomes DISPUTED', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      const [s, , , , disputeActive] = await deal.getState();
      expect(s).to.equal(4); // DISPUTED
      expect(disputeActive).to.be.true;
    });

    it('creator opens dispute', async function () {
      const deal = await fundedDeal();
      await deal.connect(creator).openDispute(0);
      const [s] = await deal.getState();
      expect(s).to.equal(4);
    });

    it('third party cannot open dispute', async function () {
      const deal = await fundedDeal();
      await expect(deal.connect(other).openDispute(0)).to.be.revertedWith('Not a party');
    });

    it('cannot dispute released milestone', async function () {
      const deal = await fundedDeal();
      await deal.connect(creator).submitDelivery(0);
      await deal.connect(client).approveMilestone(0);
      await deal.connect(creator).releaseMilestone(0);
      await expect(deal.connect(client).openDispute(0)).to.be.revertedWith('Already released');
    });
  });

  // ==========================================================================
  // Refund
  // ==========================================================================

  describe('Refund', function () {
    it('creator refunds client', async function () {
      const deal = await fundedDeal();
      const clientBefore = await usdc.balanceOf(client.address);
      await deal.connect(creator).refund();
      const clientAfter = await usdc.balanceOf(client.address);
      expect(clientAfter).to.be.greaterThan(clientBefore);
      const [s] = await deal.getState();
      expect(s).to.equal(6); // REFUNDED
    });

    it('rejects refund during dispute', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      await expect(deal.connect(creator).refund()).to.be.revertedWith('Not refundable');
    });
  });

  // ==========================================================================
  // Inactivity Refund
  // ==========================================================================

  describe('Inactivity Refund', function () {
    it('client refunds after 2x inactivity', async function () {
      const deal = await fundedDeal();
      await time.increase(AUTO_RELEASE_DAYS * 2 * 86400 + 1);
      const clientBefore = await usdc.balanceOf(client.address);
      await deal.connect(client).refundInactive();
      const clientAfter = await usdc.balanceOf(client.address);
      expect(clientAfter).to.be.greaterThan(clientBefore);
    });

    it('rejects before inactivity period', async function () {
      const deal = await fundedDeal();
      await expect(deal.connect(client).refundInactive()).to.be.revertedWith('Not inactive long enough');
    });

    it('creator cannot call inactivity refund', async function () {
      const deal = await fundedDeal();
      await time.increase(AUTO_RELEASE_DAYS * 2 * 86400 + 1);
      await expect(deal.connect(creator).refundInactive()).to.be.revertedWith('Only client');
    });
  });

  // ==========================================================================
  // Dispute Resolution (platform-controlled executor — audit fix #1)
  // ==========================================================================

  describe('Dispute Resolution', function () {
    it('escrow inherits executor from the factory', async function () {
      const deal = await deployDeal();
      expect(await deal.klerosExecutor()).to.equal(executor.address);
    });

    it('only the executor can resolve a dispute', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      const milestoneWei = MILESTONE_AMOUNTS[0];
      await expect(
        deal.connect(other).resolveDispute(milestoneWei, 0)
      ).to.be.revertedWith('Only Kleros executor');
      await expect(
        deal.connect(creator).resolveDispute(milestoneWei, 0)
      ).to.be.revertedWith('Only Kleros executor');
    });

    it('executor resolves dispute in client favor', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      const clientBefore = await usdc.balanceOf(client.address);
      await deal.connect(executor).resolveDispute(MILESTONE_AMOUNTS[0], 0);
      expect(await usdc.balanceOf(client.address)).to.be.greaterThan(clientBefore);
      const [s] = await deal.getState();
      expect(s).to.equal(5); // COMPLETED
    });

    it('creator cannot change the executor (no setter on escrow)', async function () {
      const deal = await deployDeal();
      expect((deal as any).setKlerosExecutor).to.be.undefined;
    });

    it('factory owner can rotate executor for future deals only', async function () {
      const deal = await deployDeal(); // uses original executor
      await factory.connect(creator).setKlerosExecutor(other.address);
      expect(await factory.klerosExecutor()).to.equal(other.address);
      // already-deployed escrow keeps its original immutable executor
      expect(await deal.klerosExecutor()).to.equal(executor.address);
    });

    it('non-owner cannot rotate the factory executor', async function () {
      await expect(
        factory.connect(client).setKlerosExecutor(client.address)
      ).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount');
    });
  });

  // ==========================================================================
  // Dispute Timeout escape hatch (audit fix #2)
  // ==========================================================================

  describe('Dispute Timeout', function () {
    it('refunds the client after the timeout and sets REFUNDED', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);

      const clientBefore = await usdc.balanceOf(client.address);
      await time.increase(DISPUTE_TIMEOUT_DAYS * 86400 + 1);

      await expect(deal.connect(other).resolveDisputeTimeout())
        .to.emit(deal, 'DisputeTimedOut');

      const clientAfter = await usdc.balanceOf(client.address);
      const refunded = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[0]);
      expect(clientAfter - clientBefore).to.equal(refunded);

      const [s] = await deal.getState();
      expect(s).to.equal(6); // REFUNDED
    });

    it('callable by anyone (not just a party)', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      await time.increase(DISPUTE_TIMEOUT_DAYS * 86400 + 1);
      // `other` is a third party — must still succeed
      await expect(deal.connect(other).resolveDisputeTimeout()).to.not.be.reverted;
    });

    it('rejects before the timeout is reached', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      await expect(
        deal.connect(other).resolveDisputeTimeout()
      ).to.be.revertedWith('Timeout not reached');
    });

    it('rejects when there is no active dispute', async function () {
      const deal = await fundedDeal(); // ACTIVE, no dispute
      await time.increase(DISPUTE_TIMEOUT_DAYS * 86400 + 1);
      await expect(
        deal.connect(other).resolveDisputeTimeout()
      ).to.be.revertedWith('Not disputed');
    });

    it('canResolveDisputeTimeout flips true only after the window', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      expect(await deal.canResolveDisputeTimeout()).to.be.false;
      await time.increase(DISPUTE_TIMEOUT_DAYS * 86400 + 1);
      expect(await deal.canResolveDisputeTimeout()).to.be.true;
    });

    it('executor resolution still wins if it happens before timeout', async function () {
      const deal = await fundedDeal();
      await deal.connect(client).openDispute(0);
      await deal.connect(executor).resolveDispute(MILESTONE_AMOUNTS[0], 0);
      // dispute already resolved → COMPLETED, timeout path no longer applies
      await time.increase(DISPUTE_TIMEOUT_DAYS * 86400 + 1);
      await expect(
        deal.connect(other).resolveDisputeTimeout()
      ).to.be.revertedWith('Not disputed');
    });
  });

  // ==========================================================================
  // Complete flow: all milestones
  // ==========================================================================

  describe('Full Deal Lifecycle', function () {
    it('complete deal: sign → fund all → deliver all → approve all → release all → COMPLETED', async function () {
      const deal = await signedDeal();

      for (let i = 0; i < 3; i++) {
        const payerAmt = await feeCollector.calculatePayerAmount(MILESTONE_AMOUNTS[i]);
        await usdc.connect(client).approve(await deal.getAddress(), payerAmt);
        await deal.connect(client).fundMilestone(i);
      }

      for (let i = 0; i < 3; i++) {
        await deal.connect(creator).submitDelivery(i);
        await deal.connect(client).approveMilestone(i);
        await deal.connect(creator).releaseMilestone(i);
      }

      const [s] = await deal.getState();
      expect(s).to.equal(5); // COMPLETED
    });
  });
});
