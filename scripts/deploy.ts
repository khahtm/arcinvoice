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
