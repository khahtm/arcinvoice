const { ethers, network } = require('hardhat');
const dotenv = require('dotenv');

// Load env files
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS?.trim();

  if (!USDC_ADDRESS) {
    throw new Error("USDC_ADDRESS environment variable is required");
  }

  console.log("Deploying v2 contracts to", network.name, "...");
  console.log("USDC Address:", USDC_ADDRESS);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers found. Check DEPLOYER_PRIVATE_KEY in .env.local');
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Deploy FeeCollector
  console.log("\n1. Deploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(USDC_ADDRESS);
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log("   FeeCollector deployed to:", feeCollectorAddress);

  // Deploy ArcMilestoneFactory
  console.log("\n2. Deploying ArcMilestoneFactory...");
  const Factory = await ethers.getContractFactory("ArcMilestoneFactory");
  const factory = await Factory.deploy(USDC_ADDRESS, feeCollectorAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   ArcMilestoneFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n========================================");
  console.log("V2 Deployment Complete!");
  console.log("========================================");
  console.log("FeeCollector:        ", feeCollectorAddress);
  console.log("MilestoneFactory:    ", factoryAddress);
  console.log("USDC:                ", USDC_ADDRESS);
  console.log("========================================");

  // Output for addresses.ts
  console.log("\nAdd to lib/contracts/addresses.ts:");
  console.log(`  feeCollector: '${feeCollectorAddress}' as \`0x\${string}\`,`);
  console.log(`  milestoneFactory: '${factoryAddress}' as \`0x\${string}\`,`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
