const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

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

    it('should track escrow count', async function () {
      expect(await factory.getEscrowCount()).to.equal(0);

      await factory.createEscrow(ethers.id('invoice-001'), AMOUNT, AUTO_RELEASE_DAYS);
      expect(await factory.getEscrowCount()).to.equal(1);

      await factory.createEscrow(ethers.id('invoice-002'), AMOUNT, AUTO_RELEASE_DAYS);
      expect(await factory.getEscrowCount()).to.equal(2);
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

    it('should have correct initial state', async function () {
      expect(await escrow.creator()).to.equal(creator.address);
      expect(await escrow.amount()).to.equal(AMOUNT);
      expect(await escrow.autoReleaseDays()).to.equal(AUTO_RELEASE_DAYS);
      expect(await escrow.state()).to.equal(0); // CREATED
    });

    it('should allow payer to deposit', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      expect(await escrow.state()).to.equal(1); // FUNDED
      expect(await escrow.payer()).to.equal(payer.address);
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    });

    it('should prevent double deposit', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      await expect(escrow.connect(payer).deposit()).to.be.revertedWith('Invalid state');
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

    it('should prevent non-payer from releasing', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      await expect(escrow.connect(creator).release()).to.be.revertedWith('Only payer');
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

    it('should prevent non-creator from refunding', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      await expect(escrow.connect(payer).refund()).to.be.revertedWith('Only creator');
    });

    it('should allow auto-release after deadline', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      // Fast forward time
      await time.increase(AUTO_RELEASE_DAYS * 24 * 60 * 60);

      expect(await escrow.canAutoRelease()).to.be.true;

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

      expect(await escrow.canAutoRelease()).to.be.false;
      await expect(escrow.autoRelease()).to.be.revertedWith('Too early');
    });

    it('should return correct details', async function () {
      await usdc.connect(payer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(payer).deposit();

      const details = await escrow.getDetails();
      expect(details._creator).to.equal(creator.address);
      expect(details._payer).to.equal(payer.address);
      expect(details._amount).to.equal(AMOUNT);
      expect(details._state).to.equal(1); // FUNDED
      expect(details._autoReleaseDays).to.equal(AUTO_RELEASE_DAYS);
    });
  });
});
