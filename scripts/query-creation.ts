import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const factory = await ethers.getContractAt("ArcMilestoneFactory", "0x254B00aeCF760Fff8d06364F22c035C077923ac4");
  const escrow = await ethers.getContractAt("ArcMilestoneEscrow", "0x867d92ba8f43b74b2464725f0c876fcb1b829df3");

  // Get latest block
  const latestBlock = await ethers.provider.getBlockNumber();
  const fromBlock = latestBlock - 5000; // Last 5000 blocks

  // Get release events
  const releaseFilter = escrow.filters.MilestoneReleased();
  const releaseEvents = await escrow.queryFilter(releaseFilter, fromBlock, latestBlock);

  console.log("=== MilestoneReleased Events ===");
  for (const e of releaseEvents) {
    console.log(`Milestone ${e.args?.index}: creatorAmount=${Number(e.args?.creatorAmount)/1e6} USDC, fee=${Number(e.args?.fee)/1e6} USDC`);
    console.log(`  Tx: ${e.transactionHash}`);
  }

  // Get funding events
  const fundFilter = escrow.filters.MilestoneFunded();
  const fundEvents = await escrow.queryFilter(fundFilter, fromBlock, latestBlock);

  console.log("\n=== MilestoneFunded Events ===");
  for (const e of fundEvents) {
    console.log(`Milestone ${e.args?.index}: payer=${e.args?.payer}, amount=${Number(e.args?.amount)/1e6} USDC`);
    console.log(`  Tx: ${e.transactionHash}`);
  }
}

main().catch(console.error);
