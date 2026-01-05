import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const creatorAddress = "0xb77FE1e0C23500d1A4ce6E5b8e1EF7FD87bf362F";
  const usdc = await ethers.getContractAt("IERC20", "0x3600000000000000000000000000000000000000");

  const latestBlock = await ethers.provider.getBlockNumber();
  const fromBlock = latestBlock - 5000;

  // Get all Transfer events TO creator
  console.log("=== USDC Transfers TO Creator ===");
  const inFilter = usdc.filters.Transfer(null, creatorAddress);
  const inEvents = await usdc.queryFilter(inFilter, fromBlock, latestBlock);
  let totalIn = 0;
  for (const e of inEvents) {
    const from = e.args?.from;
    const amount = Number(e.args?.value) / 1e6;
    totalIn += amount;
    console.log(`From: ${from}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Tx: ${e.transactionHash}`);
    console.log("");
  }
  console.log(`Total IN: ${totalIn} USDC\n`);

  // Get all Transfer events FROM creator
  console.log("=== USDC Transfers FROM Creator ===");
  const outFilter = usdc.filters.Transfer(creatorAddress);
  const outEvents = await usdc.queryFilter(outFilter, fromBlock, latestBlock);
  let totalOut = 0;
  for (const e of outEvents) {
    const to = e.args?.to;
    const amount = Number(e.args?.value) / 1e6;
    totalOut += amount;
    console.log(`To: ${to}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Tx: ${e.transactionHash}`);
    console.log("");
  }
  console.log(`Total OUT: ${totalOut} USDC`);
  console.log(`Net: ${totalIn - totalOut} USDC`);
}

main().catch(console.error);
