import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const fc = await ethers.getContractAt("FeeCollector", "0xAE80D683b366e144DFdDD7e2D9667414F689CD9f");

  console.log("=== FeeCollector Info ===");
  console.log("Owner:", await fc.owner());
  console.log("Balance:", Number(await fc.getBalance()) / 1e6, "USDC");
  console.log("Total Collected:", Number(await fc.totalCollected()) / 1e6, "USDC");
}

main().catch(console.error);
