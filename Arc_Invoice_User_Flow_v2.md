# Arc Invoice

## Payment Link Generator with Smart Contract Escrow

### User Flow Document v2.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Flow 1: Direct Payment](#2-flow-1-direct-payment-no-escrow)
3. [Flow 2: Escrow Payment](#3-flow-2-escrow-payment)
4. [Flow 3: Milestone Payment](#4-flow-3-milestone-payment)
5. [Flow 4: Dispute Resolution](#5-flow-4-dispute-resolution)
6. [Smart Contract Architecture](#6-smart-contract-architecture)
7. [Security Considerations](#7-security-considerations)
8. [Page Inventory](#8-page-inventory)
9. [Development Phases](#9-development-phases)

---

## 1. Overview

Arc Invoice is a payment link generator built on the **Arc blockchain** by Circle. It allows freelancers, small businesses, and creators to generate shareable payment links with optional escrow protection, milestone-based releases, and instant settlement in USDC.

### 1.1 Key Features

| Feature | Description |
|---------|-------------|
| **Direct Payments** | Simple wallet-to-wallet USDC transfers |
| **Escrow Payments** | Funds held in smart contract until work is approved |
| **Milestone Payments** | Split projects into phases with incremental fund release |
| **Dispute Resolution** | Built-in arbitration for disagreements |
| **Instant Settlement** | Sub-second finality on Arc blockchain |

### 1.2 User Roles

| Role | Description |
|------|-------------|
| **Creator** | Person creating invoices and receiving payments (freelancer, business, creator) |
| **Payer** | Person receiving the payment link and making the payment (client, customer) |
| **Arbitrator** | Third party who resolves disputes (platform-provided or user-chosen) |

### 1.3 Payment Types Comparison

| Type | Best For | Protection | Complexity |
|------|----------|------------|------------|
| **Direct** | Trusted relationships, small amounts | None | Low |
| **Escrow** | New clients, one-time projects | Funds locked until approval | Medium |
| **Milestone** | Large projects, ongoing work | Incremental releases | High |

---

## 2. Flow 1: Direct Payment (No Escrow)

> **Goal:** Simple wallet-to-wallet payment for trusted relationships.

### 2.1 Creator Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CREATOR FLOW                            │
├─────────────────────────────────────────────────────────────┤
│  1. Connect wallet                                          │
│  2. Click "Create Invoice"                                  │
│  3. Select payment type: "Direct Payment"                   │
│  4. Fill invoice details:                                   │
│     • Amount (e.g., 500 USDC)                               │
│     • Description                                           │
│     • Client info (optional)                                │
│     • Due date (optional)                                   │
│  5. Generate payment link                                   │
│  6. Share link with client                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Payer Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      PAYER FLOW                             │
├─────────────────────────────────────────────────────────────┤
│  1. Open payment link                                       │
│  2. Review invoice details                                  │
│  3. Connect wallet                                          │
│  4. Confirm payment (direct USDC transfer)                  │
│  5. Receive confirmation                                    │
│     → Funds sent immediately to creator                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Sequence Diagram

```
Creator                     App                      Payer
   │                         │                         │
   │──── Create Invoice ────►│                         │
   │◄─── Payment Link ───────│                         │
   │                         │                         │
   │──── Share Link ─────────┼────────────────────────►│
   │                         │                         │
   │                         │◄──── Open Link ─────────│
   │                         │───── Show Invoice ─────►│
   │                         │                         │
   │                         │◄──── Connect Wallet ────│
   │                         │◄──── Confirm Payment ───│
   │                         │                         │
   │◄─── USDC Transfer ──────┼─────────────────────────│
   │                         │───── Confirmation ─────►│
   │                         │                         │
```

---

## 3. Flow 2: Escrow Payment

> **Goal:** Protect both parties by holding funds in smart contract until work is approved.

### 3.1 How Escrow Works

Funds are deposited into the `ArcInvoiceEscrow` smart contract. The creator cannot access funds until the payer approves the work. If there's a dispute, an arbitrator decides the outcome.

### 3.2 Escrow State Lifecycle

```
                    ┌──────────────┐
                    │   CREATED    │
                    │ (awaiting    │
                    │  deposit)    │
                    └──────┬───────┘
                           │
                    Payer deposits USDC
                           │
                           ▼
                    ┌──────────────┐
                    │    FUNDED    │
                    │ (work in     │
                    │  progress)   │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    Payer approves    Either party    Mutual cancel
           │            disputes           │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   RELEASED   │ │   DISPUTED   │ │  CANCELLED   │
    │ (paid to     │ │ (frozen,     │ │ (refunded)   │
    │  creator)    │ │  arbitrator) │ │              │
    └──────────────┘ └──────┬───────┘ └──────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       Arbitrator rules          Arbitrator rules
        for creator               for payer
              │                         │
              ▼                         ▼
       ┌──────────────┐          ┌──────────────┐
       │   RELEASED   │          │   REFUNDED   │
       └──────────────┘          └──────────────┘
```

### 3.3 State Definitions

| State | Trigger | What Happens |
|-------|---------|--------------|
| `CREATED` | Invoice created | Escrow contract deployed, awaiting deposit |
| `FUNDED` | Payer deposits USDC | Funds locked in contract, creator can start work |
| `RELEASED` | Payer approves work | Funds transferred to creator's wallet |
| `DISPUTED` | Either party disputes | Funds frozen, arbitrator notified |
| `REFUNDED` | Arbitrator rules for payer | Funds returned to payer's wallet |
| `CANCELLED` | Mutual cancellation | Funds returned to payer (if funded) |

### 3.4 Creator Flow (Escrow)

1. **Create Escrow Invoice**
   - Connect wallet
   - Click "Create Invoice"
   - Select "Escrow Payment" type
   - Fill in amount, description, client details
   - Optionally set auto-release timer (e.g., funds release automatically after 14 days if no dispute)

2. **Share Payment Link**
   - Copy link and send to client
   - Link shows escrow terms clearly

3. **Wait for Funding**
   - Dashboard shows "Awaiting Deposit"
   - Receive notification when payer funds escrow

4. **Complete Work**
   - Once funded, complete the work
   - Optionally click "Mark as Delivered" to notify payer

5. **Receive Payment**
   - When payer approves, funds are released instantly to wallet

### 3.5 Payer Flow (Escrow)

1. **Review Escrow Terms**
   - Open payment link
   - Page clearly shows:
     - This is an escrow payment
     - Funds are held until you approve
     - Dispute process explained

2. **Fund Escrow**
   - Connect wallet
   - Click "Fund Escrow"
   - USDC is transferred to smart contract (not to creator)
   - Confirmation shows contract address and transaction hash

3. **Wait for Delivery**
   - Receive notification when creator marks work as delivered

4. **Review and Approve**
   - Review the delivered work
   - If satisfied, click "Approve & Release Funds"
   - Funds transferred to creator instantly

5. **Or: Request Revisions / Dispute**
   - If not satisfied:
     - Message creator for revisions (off-chain)
     - Or click "Open Dispute" to involve arbitrator

### 3.6 Escrow Sequence Diagram

```
Creator              App              Contract              Payer
   │                  │                   │                   │
   │── Create ───────►│                   │                   │
   │   Escrow Invoice │                   │                   │
   │                  │── Deploy ────────►│                   │
   │                  │   Escrow          │                   │
   │◄── Link ─────────│                   │                   │
   │                  │                   │                   │
   │── Share Link ────┼───────────────────┼──────────────────►│
   │                  │                   │                   │
   │                  │                   │◄── Deposit USDC ──│
   │                  │                   │    (approve+fund) │
   │◄── Notification ─│◄── Event ─────────│                   │
   │    "Funded!"     │   EscrowFunded    │                   │
   │                  │                   │                   │
   │                  │                   │                   │
   │ (Complete work)  │                   │                   │
   │                  │                   │                   │
   │── Mark Delivered►│                   │                   │
   │                  │── Notification ───┼──────────────────►│
   │                  │                   │                   │
   │                  │                   │◄── release() ─────│
   │                  │                   │    (approve work) │
   │◄── USDC ─────────┼───────────────────│                   │
   │                  │◄── Event ─────────│                   │
   │                  │   FundsReleased   │                   │
   │                  │                   │                   │
```

---

## 4. Flow 3: Milestone Payment

> **Goal:** Split large projects into phases with incremental fund release.

### 4.1 How Milestones Work

The total project amount is divided into milestones. Payer funds the entire amount upfront, but funds are released incrementally as each milestone is approved.

**Benefits:**
- **Creator:** Assured payment exists before starting work
- **Payer:** Only releases funds for completed work

### 4.2 Example: Website Project ($5,000)

| # | Milestone | Amount | Percentage | Status |
|---|-----------|--------|------------|--------|
| 1 | Design Mockups | $1,000 | 20% | ✅ Released |
| 2 | Frontend Development | $2,000 | 40% | 🔄 In Progress |
| 3 | Backend Integration | $1,500 | 30% | ⏳ Pending |
| 4 | Launch & Handoff | $500 | 10% | ⏳ Pending |

### 4.3 Milestone State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MILESTONE PAYMENT FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Full Amount Funded: $5,000                                    │
│   ══════════════════════════════════════════════════            │
│                                                                 │
│   Milestone 1: Design ($1,000)                                  │
│   [████████████████████] RELEASED → Creator receives $1,000     │
│                                                                 │
│   Milestone 2: Frontend ($2,000)                                │
│   [██████████░░░░░░░░░░] IN PROGRESS                            │
│                                                                 │
│   Milestone 3: Backend ($1,500)                                 │
│   [░░░░░░░░░░░░░░░░░░░░] PENDING                                │
│                                                                 │
│   Milestone 4: Launch ($500)                                    │
│   [░░░░░░░░░░░░░░░░░░░░] PENDING                                │
│                                                                 │
│   ──────────────────────────────────────────────────            │
│   Released: $1,000  |  In Escrow: $4,000                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Creator Flow (Milestones)

1. **Create Milestone Invoice**
   - Select "Milestone Payment" type
   - Enter total amount
   - Add milestones:
     - Name
     - Description
     - Amount (or percentage)
   - Reorder milestones as needed

2. **Share and Get Funded**
   - Share link with client
   - Payer funds the full amount (held in escrow)

3. **Complete Milestone 1**
   - Work on first milestone
   - Click "Submit Milestone" when ready
   - Optionally attach deliverables or notes

4. **Receive Partial Payment**
   - When payer approves milestone, that portion of funds is released
   - Remaining funds stay in escrow

5. **Repeat for Each Milestone**
   - Continue through all milestones
   - Dashboard shows progress and amounts released/remaining

### 4.5 Payer Flow (Milestones)

1. **Review Milestone Plan**
   - Open payment link
   - See full milestone breakdown:
     - What's included in each phase
     - Amounts
     - Timeline

2. **Fund Full Amount**
   - Deposit total project amount into escrow
   - Funds are secure in smart contract

3. **Approve Milestones Incrementally**
   - As creator submits each milestone, review and approve
   - Can request revisions before approving

4. **Track Progress**
   - Dashboard shows:
     - Which milestones approved
     - How much released
     - How much remaining in escrow

### 4.6 Milestone Sequence Diagram

```
Creator              App              Contract              Payer
   │                  │                   │                   │
   │── Create ───────►│                   │                   │
   │   Milestone      │── Deploy ────────►│                   │
   │   Invoice        │   MilestoneEscrow │                   │
   │                  │   (4 milestones)  │                   │
   │◄── Link ─────────│                   │                   │
   │                  │                   │                   │
   │                  │                   │◄── Deposit $5000 ─│
   │◄── "Funded!" ────│◄── Event ─────────│                   │
   │                  │                   │                   │
   │                  │                   │                   │
   │ (Complete M1)    │                   │                   │
   │── Submit M1 ────►│                   │                   │
   │                  │── Notify ─────────┼──────────────────►│
   │                  │                   │                   │
   │                  │                   │◄─ approveMilestone│
   │                  │                   │   (id: 1)         │
   │◄── $1,000 ───────┼───────────────────│                   │
   │                  │◄── Event ─────────│                   │
   │                  │   MilestoneApproved                   │
   │                  │                   │                   │
   │ (Complete M2)    │                   │                   │
   │── Submit M2 ────►│                   │                   │
   │        ...       │        ...        │        ...        │
   │                  │                   │                   │
```

---

## 5. Flow 4: Dispute Resolution

> **Goal:** Fair resolution when creator and payer disagree.

### 5.1 When Can Disputes Be Opened?

| By | Reason |
|----|--------|
| **Payer** | Work not delivered, quality issues, scope disagreement |
| **Creator** | Payer not approving completed work, unreasonable demands |

**Time Limit:** Disputes must be opened within 30 days of funding (configurable)

### 5.2 Dispute Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISPUTE RESOLUTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. OPEN DISPUTE                                                │
│     • Either party clicks "Open Dispute"                        │
│     • Must provide reason and evidence                          │
│     • Funds automatically frozen                                │
│                                                                 │
│  2. RESPONSE PERIOD (7 days)                                    │
│     • Other party notified                                      │
│     • Submit counter-evidence                                   │
│                                                                 │
│  3. ARBITRATOR REVIEW                                           │
│     • Reviews all evidence                                      │
│     • May request additional info                               │
│                                                                 │
│  4. DECISION                                                    │
│     ┌─────────────┬─────────────┬─────────────┐                 │
│     │   Release   │    Split    │   Refund    │                 │
│     │ to Creator  │   (partial) │  to Payer   │                 │
│     └─────────────┴─────────────┴─────────────┘                 │
│                                                                 │
│  5. AUTOMATIC EXECUTION                                         │
│     • Smart contract distributes funds                          │
│     • No manual intervention needed                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Dispute Steps (Detailed)

1. **Open Dispute**
   - Either party clicks "Open Dispute" on the escrow
   - Must provide:
     - Reason (dropdown + free text)
     - Evidence (file uploads, screenshots, links)

2. **Funds Frozen**
   - Smart contract automatically freezes funds
   - Neither party can withdraw
   - State changes to `DISPUTED`

3. **Other Party Responds**
   - Receives notification
   - Has 7 days to respond with their side and evidence

4. **Arbitrator Reviews**
   - Platform arbitrator (or chosen third party) reviews all evidence
   - May request additional information from either party

5. **Decision Made**
   - Arbitrator decides one of three outcomes:
     - **Release to Creator:** Full amount sent to creator
     - **Refund to Payer:** Full amount returned to payer
     - **Split:** Partial payment to creator, partial refund to payer

6. **Automatic Execution**
   - Arbitrator calls smart contract function
   - Funds distributed according to decision
   - No manual intervention needed

### 5.4 Arbitrator Options

| Option | Description | Fee |
|--------|-------------|-----|
| **Platform Default** | Arc Invoice team handles dispute | 5% of disputed amount |
| **Mutual Agreement** | Parties agree on trusted third party | Set by arbitrator |
| **DAO Arbitration** | Decentralized jury (future feature) | TBD |

### 5.5 Dispute Sequence Diagram

```
Creator           App           Contract        Arbitrator         Payer
   │               │                │                │               │
   │               │                │◄── openDispute()───────────────│
   │               │                │    (reason, evidence)          │
   │               │◄── Event ──────│                │               │
   │               │   DisputeOpened│                │               │
   │◄── Notify ────│                │                │               │
   │   "Disputed!" │                │                │               │
   │               │                │                │               │
   │── Evidence ──►│────────────────┼───────────────►│               │
   │               │                │                │               │
   │               │                │                │◄── Evidence ──│
   │               │                │                │               │
   │               │                │◄── resolveDispute()────────────│
   │               │                │    (creatorAmt, payerAmt)      │
   │               │                │                │               │
   │◄── $XXX ──────┼────────────────│                │               │
   │               │                │────────────────┼── $XXX ──────►│
   │               │◄── Event ──────│                │               │
   │               │ DisputeResolved│                │               │
   │               │                │                │               │
```

---

## 6. Smart Contract Architecture

### 6.1 Contract Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTRACT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐                                       │
│   │  ArcInvoiceFactory  │                                       │
│   │  ─────────────────  │                                       │
│   │  • createEscrow()   │                                       │
│   │  • createMilestone()│                                       │
│   │  • getInvoice()     │                                       │
│   └──────────┬──────────┘                                       │
│              │ deploys                                          │
│              ▼                                                  │
│   ┌─────────────────────┐    ┌─────────────────────┐            │
│   │  ArcInvoiceEscrow   │    │ ArcMilestoneEscrow  │            │
│   │  ─────────────────  │    │ ─────────────────── │            │
│   │  • deposit()        │    │ • deposit()         │            │
│   │  • release()        │    │ • submitMilestone() │            │
│   │  • refund()         │    │ • approveMilestone()│            │
│   │  • openDispute()    │    │ • openDispute()     │            │
│   │  • resolveDispute() │    │ • resolveDispute()  │            │
│   └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Contract Descriptions

| Contract | Purpose |
|----------|---------|
| **ArcInvoiceFactory** | Deploys new escrow contracts for each invoice. Tracks all invoices. |
| **ArcInvoiceEscrow** | Individual escrow for each invoice. Holds funds, manages state, handles releases. |
| **ArcMilestoneEscrow** | Extended escrow with milestone tracking and partial releases. |

### 6.3 ArcInvoiceEscrow - Key Functions

| Function | Called By | Description |
|----------|-----------|-------------|
| `deposit()` | Payer | Deposit USDC into escrow. Requires approval first. |
| `release()` | Payer | Release funds to creator. Only when state is FUNDED. |
| `refund()` | Creator | Voluntarily refund payer (e.g., can't complete work). |
| `openDispute(reason)` | Either | Freeze funds and initiate dispute process. |
| `resolveDispute(creatorAmt, payerAmt)` | Arbitrator | Distribute funds according to decision (split possible). |
| `autoRelease()` | Anyone | Release funds if auto-release deadline passed with no dispute. |
| `cancel()` | Both | Mutual cancellation, refund to payer. |

### 6.4 ArcMilestoneEscrow - Additional Functions

| Function | Called By | Description |
|----------|-----------|-------------|
| `submitMilestone(id)` | Creator | Mark milestone as submitted for review. |
| `approveMilestone(id)` | Payer | Approve and release funds for specific milestone. |
| `rejectMilestone(id, reason)` | Payer | Request revisions on milestone. |
| `getMilestoneStatus(id)` | Anyone | View status of a specific milestone. |
| `getProgress()` | Anyone | Returns released amount, remaining amount, completed count. |

### 6.5 Events Emitted

Smart contracts emit events for frontend tracking and notifications:

```solidity
// Escrow Events
event EscrowCreated(bytes32 indexed invoiceId, address creator, address payer, uint256 amount);
event EscrowFunded(bytes32 indexed invoiceId, uint256 amount, uint256 timestamp);
event FundsReleased(bytes32 indexed invoiceId, address recipient, uint256 amount);
event FundsRefunded(bytes32 indexed invoiceId, address recipient, uint256 amount);
event DisputeOpened(bytes32 indexed invoiceId, address openedBy, string reason);
event DisputeResolved(bytes32 indexed invoiceId, uint256 creatorAmount, uint256 payerAmount);

// Milestone Events
event MilestoneSubmitted(bytes32 indexed invoiceId, uint256 milestoneId);
event MilestoneApproved(bytes32 indexed invoiceId, uint256 milestoneId, uint256 amount);
event MilestoneRejected(bytes32 indexed invoiceId, uint256 milestoneId, string reason);
```

### 6.6 Data Structures

```solidity
// Escrow State Enum
enum EscrowState {
    CREATED,    // 0 - Awaiting deposit
    FUNDED,     // 1 - Funds deposited, work in progress
    RELEASED,   // 2 - Funds sent to creator
    DISPUTED,   // 3 - Dispute opened, funds frozen
    REFUNDED,   // 4 - Funds returned to payer
    CANCELLED   // 5 - Mutually cancelled
}

// Milestone State Enum
enum MilestoneState {
    PENDING,    // 0 - Not started
    SUBMITTED,  // 1 - Creator submitted for review
    APPROVED,   // 2 - Payer approved, funds released
    REJECTED    // 3 - Payer requested revisions
}

// Escrow Struct
struct Escrow {
    bytes32 invoiceId;
    address creator;
    address payer;
    address arbitrator;
    uint256 amount;
    uint256 fundedAt;
    uint256 autoReleaseAt;
    EscrowState state;
}

// Milestone Struct
struct Milestone {
    string name;
    string description;
    uint256 amount;
    MilestoneState state;
}
```

### 6.7 Sample Solidity Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ArcInvoiceEscrow is ReentrancyGuard {
    
    // State Variables
    address public immutable creator;
    address public immutable payer;
    address public immutable arbitrator;
    IERC20 public immutable usdc;
    
    uint256 public amount;
    uint256 public fundedAt;
    uint256 public autoReleaseDays;
    
    EscrowState public state;
    
    // Events
    event Funded(uint256 amount, uint256 timestamp);
    event Released(address recipient, uint256 amount);
    event Refunded(address recipient, uint256 amount);
    event DisputeOpened(address openedBy, string reason);
    event DisputeResolved(uint256 creatorAmount, uint256 payerAmount);
    
    // Modifiers
    modifier onlyPayer() {
        require(msg.sender == payer, "Only payer");
        _;
    }
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }
    
    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator");
        _;
    }
    
    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid state");
        _;
    }
    
    // Constructor
    constructor(
        address _creator,
        address _payer,
        address _arbitrator,
        address _usdc,
        uint256 _amount,
        uint256 _autoReleaseDays
    ) {
        creator = _creator;
        payer = _payer;
        arbitrator = _arbitrator;
        usdc = IERC20(_usdc);
        amount = _amount;
        autoReleaseDays = _autoReleaseDays;
        state = EscrowState.CREATED;
    }
    
    // Deposit funds into escrow
    function deposit() external onlyPayer inState(EscrowState.CREATED) nonReentrant {
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        fundedAt = block.timestamp;
        state = EscrowState.FUNDED;
        emit Funded(amount, fundedAt);
    }
    
    // Release funds to creator (payer approves)
    function release() external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");
        emit Released(creator, amount);
    }
    
    // Refund to payer (creator voluntarily refunds)
    function refund() external onlyCreator inState(EscrowState.FUNDED) nonReentrant {
        state = EscrowState.REFUNDED;
        require(usdc.transfer(payer, amount), "Transfer failed");
        emit Refunded(payer, amount);
    }
    
    // Open dispute
    function openDispute(string calldata reason) external inState(EscrowState.FUNDED) {
        require(msg.sender == creator || msg.sender == payer, "Not authorized");
        state = EscrowState.DISPUTED;
        emit DisputeOpened(msg.sender, reason);
    }
    
    // Resolve dispute (arbitrator only)
    function resolveDispute(
        uint256 creatorAmount, 
        uint256 payerAmount
    ) external onlyArbitrator inState(EscrowState.DISPUTED) nonReentrant {
        require(creatorAmount + payerAmount == amount, "Amounts must equal total");
        
        state = EscrowState.RELEASED; // Or REFUNDED based on outcome
        
        if (creatorAmount > 0) {
            require(usdc.transfer(creator, creatorAmount), "Creator transfer failed");
        }
        if (payerAmount > 0) {
            require(usdc.transfer(payer, payerAmount), "Payer transfer failed");
        }
        
        emit DisputeResolved(creatorAmount, payerAmount);
    }
    
    // Auto-release after deadline
    function autoRelease() external inState(EscrowState.FUNDED) nonReentrant {
        require(
            block.timestamp >= fundedAt + (autoReleaseDays * 1 days),
            "Auto-release not yet available"
        );
        state = EscrowState.RELEASED;
        require(usdc.transfer(creator, amount), "Transfer failed");
        emit Released(creator, amount);
    }
    
    // View functions
    function getDetails() external view returns (
        address _creator,
        address _payer,
        uint256 _amount,
        EscrowState _state,
        uint256 _fundedAt
    ) {
        return (creator, payer, amount, state, fundedAt);
    }
}
```

---

## 7. Security Considerations

### 7.1 Smart Contract Security

| Protection | Implementation |
|------------|----------------|
| **Reentrancy Protection** | Use `ReentrancyGuard` on all fund transfer functions |
| **Access Control** | Only authorized parties can call sensitive functions |
| **State Machine** | Strict state transitions prevent invalid operations |
| **Timelock** | Auto-release requires time delay, giving parties chance to dispute |
| **No ETH Handling** | Only USDC transfers, simplifying security surface |

### 7.2 Recommended Audit Checklist

- [ ] Integer overflow/underflow (use SafeMath or Solidity 0.8+)
- [ ] Reentrancy attacks
- [ ] Access control bypass
- [ ] Front-running vulnerabilities
- [ ] Denial of service
- [ ] USDC approval/transfer edge cases
- [ ] State transition validation
- [ ] Event emission accuracy
- [ ] Gas optimization

### 7.3 Best Practices

1. **Use OpenZeppelin Contracts**
   - ReentrancyGuard
   - Ownable (for factory)
   - SafeERC20

2. **Immutable Variables**
   - Creator, payer, arbitrator addresses set at construction
   - Cannot be changed after deployment

3. **Event Logging**
   - All state changes emit events
   - Frontend can track via logs

4. **Fail-Safe Defaults**
   - Auto-release protects creators from unresponsive payers
   - Dispute window protects payers from fraud

---

## 8. Page Inventory

### 8.1 Public Pages (No Auth)

| Page | Route | Purpose |
|------|-------|---------|
| Landing Page | `/` | Marketing, feature overview, CTA |
| Payment Page | `/pay/[code]` | Public invoice view and payment |
| Escrow Status | `/escrow/[id]` | Public escrow status viewer |
| Payment Success | `/pay/[code]/success` | Post-payment confirmation |

### 8.2 Authenticated Pages (Wallet Required)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard` | Overview, stats, recent invoices |
| Create Invoice | `/invoices/new` | Invoice creation form |
| Invoice List | `/invoices` | All invoices with filters |
| Invoice Detail | `/invoices/[id]` | Single invoice management |
| Dispute Center | `/disputes` | All disputes |
| Dispute Detail | `/disputes/[id]` | Single dispute with evidence |
| Settings | `/settings` | Profile, preferences, defaults |

### 8.3 Arbitrator Pages (Role Required)

| Page | Route | Purpose |
|------|-------|---------|
| Arbitrator Panel | `/arbitrator` | Pending disputes queue |
| Case Review | `/arbitrator/[id]` | Review evidence, make decision |

### 8.4 UI Component Inventory

```
components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   └── WalletButton.tsx
├── invoice/
│   ├── InvoiceForm.tsx
│   ├── MilestoneEditor.tsx
│   ├── PaymentTypeSelector.tsx
│   ├── InvoiceCard.tsx
│   └── InvoiceStatusBadge.tsx
├── escrow/
│   ├── EscrowStatus.tsx
│   ├── EscrowActions.tsx
│   ├── FundEscrowButton.tsx
│   ├── ReleaseButton.tsx
│   └── DisputeButton.tsx
├── milestone/
│   ├── MilestoneList.tsx
│   ├── MilestoneProgress.tsx
│   ├── SubmitMilestoneButton.tsx
│   └── ApproveMilestoneButton.tsx
├── dispute/
│   ├── DisputeForm.tsx
│   ├── EvidenceUploader.tsx
│   ├── DisputeTimeline.tsx
│   └── ResolutionPanel.tsx
└── common/
    ├── Button.tsx
    ├── Card.tsx
    ├── Modal.tsx
    ├── Toast.tsx
    └── Loading.tsx
```

---

## 9. Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Next.js 14 setup with App Router
- [ ] Tailwind CSS configuration
- [ ] wagmi/viem wallet connection
- [ ] Supabase database setup
- [ ] Basic layout components

### Phase 2: Direct Payments (Week 2)
- [ ] Invoice creation form
- [ ] Payment link generation
- [ ] Public payment page
- [ ] Direct USDC transfers
- [ ] Basic dashboard

### Phase 3: Escrow Contract (Week 3)
- [ ] ArcInvoiceEscrow Solidity contract
- [ ] Deploy script for Arc testnet
- [ ] Contract interaction hooks
- [ ] Unit tests (Hardhat/Foundry)

### Phase 4: Escrow UI (Week 4)
- [ ] Escrow payment flow
- [ ] Deposit interface
- [ ] Status tracking
- [ ] Release/refund UI
- [ ] Event listeners

### Phase 5: Dispute System (Week 5)
- [ ] Dispute opening flow
- [ ] Evidence submission
- [ ] Response period UI
- [ ] Arbitrator interface
- [ ] Resolution execution

### Phase 6: Milestones (Week 6)
- [ ] ArcMilestoneEscrow contract
- [ ] Milestone creation UI
- [ ] Submit/approve flow
- [ ] Progress tracking
- [ ] Partial release handling

### Phase 7: Polish (Week 7)
- [ ] Email notifications (Resend/SendGrid)
- [ ] Auto-release timers
- [ ] Analytics dashboard
- [ ] Mobile optimization
- [ ] Error handling

### Phase 8: Security & Launch (Week 8)
- [ ] Smart contract audit
- [ ] Testnet deployment
- [ ] Bug bounty program
- [ ] Documentation
- [ ] Mainnet launch

---

## Appendix A: Database Schema

```sql
-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(10) UNIQUE NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,
    
    -- Invoice details
    amount DECIMAL(18, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',
    description TEXT NOT NULL,
    
    -- Client info
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    
    -- Payment type
    payment_type VARCHAR(20) NOT NULL, -- 'direct', 'escrow', 'milestone'
    
    -- Dates
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Escrow details (if applicable)
    escrow_address VARCHAR(42),
    auto_release_days INTEGER DEFAULT 14,
    
    -- Transaction info
    tx_hash VARCHAR(66),
    paid_at TIMESTAMP
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    
    -- Milestone details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(18, 6) NOT NULL,
    order_index INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    tx_hash VARCHAR(66)
);

-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    
    -- Dispute details
    opened_by VARCHAR(42) NOT NULL,
    reason TEXT NOT NULL,
    
    -- Response
    response TEXT,
    responded_at TIMESTAMP,
    
    -- Resolution
    resolution VARCHAR(20), -- 'creator', 'payer', 'split'
    creator_amount DECIMAL(18, 6),
    payer_amount DECIMAL(18, 6),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(42),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP
);

-- Evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id),
    
    -- Evidence details
    submitted_by VARCHAR(42) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'file', 'link', 'text'
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_creator ON invoices(creator_wallet);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_short_code ON invoices(short_code);
CREATE INDEX idx_milestones_invoice ON milestones(invoice_id);
CREATE INDEX idx_disputes_invoice ON disputes(invoice_id);
```

---

## Appendix B: API Routes

```
API Routes
├── /api/invoices
│   ├── GET     - List invoices for connected wallet
│   ├── POST    - Create new invoice
│   └── /[id]
│       ├── GET     - Get invoice details
│       ├── PATCH   - Update invoice
│       └── DELETE  - Delete draft invoice
│
├── /api/pay/[code]
│   └── GET     - Get public invoice for payment
│
├── /api/escrow
│   └── /[id]
│       ├── GET     - Get escrow status from contract
│       └── /events - Get escrow events
│
├── /api/milestones
│   └── /[id]
│       ├── PATCH   - Update milestone status
│       └── POST    - Submit milestone
│
├── /api/disputes
│   ├── GET     - List disputes
│   ├── POST    - Create dispute
│   └── /[id]
│       ├── GET     - Get dispute details
│       ├── POST    - Add evidence
│       └── /resolve - Resolve dispute (arbitrator)
│
└── /api/webhooks
    └── /events - Blockchain event listener
```

---

*Document Version: 2.0*  
*Last Updated: January 2025*  
*Built for Arc Blockchain by Circle*
