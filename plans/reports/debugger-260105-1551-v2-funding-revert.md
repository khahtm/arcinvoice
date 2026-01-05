# Debugging Report: V2 Milestone Escrow Funding Failure

**Date:** 2026-01-05 15:51
**Issue:** Contract revert when payer attempts to fund V2 milestone escrow
**Severity:** Critical - blocks all V2 milestone payments

---

## Root Cause

**Incorrect approval amount for V2 milestone escrow deposits**

### Issue Chain

1. **Contract expects:** `calculatePayerAmount(totalAmount)` = `totalAmount + (totalFee / 2)`
2. **Frontend approves:** `invoiceAmount` only (no fee included)
3. **Contract deposit() reverts:** Insufficient allowance

---

## Evidence

### 1. Contract Implementation (`ArcMilestoneEscrow.sol:98-108`)

```solidity
function deposit() external inState(EscrowState.CREATED) nonReentrant {
    uint256 payerAmount = feeCollector.calculatePayerAmount(totalAmount);
    require(usdc.transferFrom(msg.sender, address(this), payerAmount), "Transfer failed");
    // ...
}
```

**Contract pulls:** `totalAmount + (fee/2)` from payer

### 2. FeeCollector Calculation (`FeeCollector.sol:37-40`)

```solidity
function calculatePayerAmount(uint256 invoiceAmount) public pure returns (uint256) {
    uint256 halfFee = calculateFee(invoiceAmount) / 2;
    return invoiceAmount + halfFee;
}
```

**Example:** 100 USDC invoice → payer deposits 100.5 USDC (100 + 0.5% fee)

### 3. Frontend Approval (`useFundEscrow.ts:14-17, 50-56`)

```typescript
export function useFundEscrow(escrowAddress: `0x${string}`, amount: string) {
  const amountWei = parseUnits(amount, 6); // ← Uses invoice amount directly

  const approveUSDC = () => {
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, amountWei], // ← Approves only invoice amount
    });
  };
```

**Approved:** 100 USDC (invoice amount)
**Required:** 100.5 USDC (invoice + payer fee)
**Result:** Contract revert - insufficient allowance

### 4. Payment Page (`app/pay/[code]/page.tsx:167-174`)

```typescript
{invoice.payment_type === 'escrow' && invoice.escrow_address && (
  <FundEscrowButton
    escrowAddress={invoice.escrow_address as `0x${string}`}
    amount={invoice.amount.toString()} // ← Passes invoice amount only
    onSuccess={handlePaymentSuccess}
    onError={handlePaymentError}
  />
)}
```

**No contract version check** - treats V1 and V2 identically

---

## Technical Details

### V1 vs V2 Deposit Differences

| Aspect | V1 (ArcInvoiceEscrow) | V2 (ArcMilestoneEscrow) |
|--------|----------------------|-------------------------|
| **Deposit amount** | Invoice amount (exact) | Invoice + payer fee (0.5%) |
| **Fee handling** | No fees | Split 50/50 payer/creator |
| **Approval needed** | `invoiceAmount` | `invoiceAmount + (fee/2)` |
| **ABI** | `ESCROW_ABI` | `MILESTONE_ESCROW_ABI` |

### Missing Contract Version Detection

Payment page doesn't check `invoice.contract_version`:
- V1 invoices: `contract_version = 1`
- V2 invoices: `contract_version = 2`
- Current code: **No version check**

---

## Fix Recommendation

### Option 1: Update `useFundEscrow.ts` (Preferred)

```typescript
export function useFundEscrow(
  escrowAddress: `0x${string}`,
  amount: string,
  isV2: boolean = false // Add version flag
) {
  const invoiceAmountWei = parseUnits(amount, 6);

  // Calculate payer amount for V2 (invoice + 0.5% fee)
  const amountWei = isV2
    ? invoiceAmountWei + (invoiceAmountWei * 50n / 10000n) // Add 0.5% payer fee
    : invoiceAmountWei;

  const approveUSDC = () => {
    approve({
      address: getContractAddress(chainId, 'USDC'),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress, amountWei], // Correct amount
    });
  };

  const fundEscrow = () => {
    deposit({
      address: escrowAddress,
      abi: isV2 ? MILESTONE_ESCROW_ABI : ESCROW_ABI, // Use correct ABI
      functionName: 'deposit',
    });
  };
```

### Option 2: Update Payment Page

```typescript
// app/pay/[code]/page.tsx
const isV2 = invoice.contract_version === 2;

{invoice.payment_type === 'escrow' && invoice.escrow_address && (
  <FundEscrowButton
    escrowAddress={invoice.escrow_address as `0x${string}`}
    amount={invoice.amount.toString()}
    isV2={isV2} // Pass version flag
    onSuccess={handlePaymentSuccess}
    onError={handlePaymentError}
  />
)}
```

---

## Files to Modify

1. **`hooks/useFundEscrow.ts`** - Add V2 fee calculation
2. **`components/escrow/FundEscrowButton.tsx`** - Pass `isV2` prop
3. **`app/pay/[code]/page.tsx`** - Detect contract version

---

## Unresolved Questions

1. Are there existing V2 invoices in pending state that need manual fixing?
2. Should we add fee breakdown display on payment page for V2?
3. Do we need migration script to update stuck V2 transactions?
