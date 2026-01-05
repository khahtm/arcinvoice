import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const escrowAddress = "0x867d92ba8f43b74b2464725f0c876fcb1b829df3";
  const creatorAddress = "0xb77FE1e0C23500d1A4ce6E5b8e1EF7FD87bf362F";
  const feeCollectorAddress = "0xAE80D683b366e144DFdDD7e2D9667414F689CD9f";

  const usdc = await ethers.getContractAt("IERC20", "0x3600000000000000000000000000000000000000");

  const latestBlock = await ethers.provider.getBlockNumber();
  const fromBlock = latestBlock - 5000;

  // Get all Transfer events where escrow sent USDC
  const transferFilter = usdc.filters.Transfer(escrowAddress);
  const transferEvents = await usdc.queryFilter(transferFilter, fromBlock, latestBlock);

  console.log("=== USDC Transfers FROM Escrow ===");
  for (const e of transferEvents) {
    const to = e.args?.to;
    const amount = Number(e.args?.value) / 1e6;
    const label = to === creatorAddress ? "(Creator)" : to === feeCollectorAddress ? "(FeeCollector)" : "";
    console.log(`To: ${to} ${label}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Tx: ${e.transactionHash}`);
    console.log("");
  }
}

main().catch(console.error);
