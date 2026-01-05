import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const escrowAddress = "0x867d92ba8f43b74b2464725f0c876fcb1b829df3";
  const escrow = await ethers.getContractAt("ArcMilestoneEscrow", escrowAddress);

  const details = await escrow.getDetails();
  console.log("=== Escrow Details ===");
  console.log("Creator:", details[0]);
  console.log("Payer:", details[1]);
  console.log("Total Amount:", details[2].toString(), "wei =", Number(details[2]) / 1e6, "USDC");
  console.log("Funded Amount:", details[3].toString(), "wei =", Number(details[3]) / 1e6, "USDC");
  console.log("Released Amount:", details[4].toString(), "wei =", Number(details[4]) / 1e6, "USDC");
  console.log("State:", ["CREATED","ACTIVE","COMPLETED","REFUNDED"][Number(details[5])]);
  console.log("Milestone Count:", details[8].toString());

  const count = Number(details[8]);
  console.log("\n=== Milestones ===");
  for(let i = 0; i < count; i++) {
    const m = await escrow.getMilestone(i);
    console.log(`Milestone ${i}: amount=${m[0].toString()} wei (${Number(m[0])/1e6} USDC), funded=${m[1]}, released=${m[2]}`);
  }

  // Check balance
  const usdc = await ethers.getContractAt("IERC20", "0x3600000000000000000000000000000000000000");
  const balance = await usdc.balanceOf(escrowAddress);
  console.log("\nContract Balance:", Number(balance) / 1e6, "USDC");

  // Check FeeCollector
  const feeCollector = await ethers.getContractAt("FeeCollector", "0xAE80D683b366e144DFdDD7e2D9667414F689CD9f");

  // Calculate expected creator amounts
  console.log("\n=== Expected Payouts ===");
  for(let i = 0; i < count; i++) {
    const m = await escrow.getMilestone(i);
    const creatorAmt = await feeCollector.calculateCreatorAmount(m[0]);
    const fee = await feeCollector.calculateFee(m[0]);
    console.log(`Milestone ${i}: creator should get ${Number(creatorAmt)/1e6} USDC, fee=${Number(fee)/1e6} USDC`);
  }
  const feeBalance = await feeCollector.getBalance();
  const totalCollected = await feeCollector.totalCollected();
  console.log("\n=== FeeCollector ===");
  console.log("Balance:", Number(feeBalance) / 1e6, "USDC");
  console.log("Total Collected:", Number(totalCollected) / 1e6, "USDC");

  // Check creator balance
  const creatorBalance = await usdc.balanceOf("0xb77FE1e0C23500d1A4ce6E5b8e1EF7FD87bf362F");
  console.log("\nCreator Balance:", Number(creatorBalance) / 1e6, "USDC");
}

main().catch(console.error);
