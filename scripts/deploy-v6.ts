import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying V6 with:', deployer.address);

  const USDC = '0x3600000000000000000000000000000000000000';
  const FEE_COLLECTOR = '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f';
  // Platform-controlled dispute arbiter baked into each new escrow.
  // Defaults to the deployer; owner can rotate via factory.setKlerosExecutor for future deals.
  const KLEROS_EXECUTOR = process.env.KLEROS_EXECUTOR || deployer.address;

  const Factory = await ethers.getContractFactory('ArcDealFactory');
  const factory = await Factory.deploy(USDC, FEE_COLLECTOR, KLEROS_EXECUTOR);
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log('ArcDealFactory deployed to:', addr);
  console.log('Kleros executor set to:', KLEROS_EXECUTOR);
  console.log('\nAdd to lib/contracts/addresses.ts:');
  console.log(`    DEAL_FACTORY: '${addr}' as const,`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
