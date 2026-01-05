const { ethers, network } = require('hardhat');
const dotenv = require('dotenv');

// Load env files
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS?.trim();
  const FEE_COLLECTOR = '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f';

  if (!USDC_ADDRESS) {
    throw new Error("USDC_ADDRESS environment variable is required");
  }

  console.log("Deploying V3 pay-per-milestone factory to", network.name, "...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("FeeCollector:", FEE_COLLECTOR);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers found. Check DEPLOYER_PRIVATE_KEY in .env.local');
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Deploy new ArcMilestoneFactory (uses modified ArcMilestoneEscrow with pay-per-milestone)
  console.log("\nDeploying ArcMilestoneFactory (V3 pay-per-milestone)...");
  const Factory = await ethers.getContractFactory("ArcMilestoneFactory");
  const factory = await Factory.deploy(USDC_ADDRESS, FEE_COLLECTOR);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ArcMilestoneFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n========================================");
  console.log("V3 Pay-Per-Milestone Deployment Complete!");
  console.log("========================================");
  console.log("New MilestoneFactory:", factoryAddress);
  console.log("FeeCollector (reused):", FEE_COLLECTOR);
  console.log("USDC:", USDC_ADDRESS);
  console.log("========================================");

  // Output for addresses.ts
  console.log("\nUpdate lib/contracts/addresses.ts:");
  console.log(`  MILESTONE_FACTORY: '${factoryAddress}' as const,`);
  console.log(`  // Old V2 factory (fund-all-upfront): 0x9F9c0955083459978Af2EaCc6C223315085Fb777`);

  // Verification command
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network ${network.name} ${factoryAddress} ${USDC_ADDRESS} ${FEE_COLLECTOR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
