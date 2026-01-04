# Arc Invoice MVP Architecture - Brainstorming Report

**Date:** 2026-01-04
**Session Type:** Architecture Brainstorming
**Goal:** Define simplified MVP architecture for fast delivery (2-3 weeks)

---

## Executive Summary

Arc Invoice is a payment link generator on Arc blockchain (Circle L1) with escrow protection. This session defined a **simplified MVP architecture** balancing decentralization principles with delivery speed.

### Key Decisions at a Glance

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment types | Direct + Escrow | Skip milestones for MVP |
| Dispute handling | Simple refund | Creator can refund, no arbitrator system |
| Contract pattern | Factory | On-chain tracking of all escrows |
| Auth | SIWE (Sign-In With Ethereum) | Proper wallet authentication |
| Deploy timing | Immediate | Contract exists before funding |
| Metadata | Hybrid | Essentials on-chain, descriptions in DB |
| Gas costs | Creator pays | Deployment on invoice creation |
| Event detection | Polling | Simple, reliable |
| Error handling | Show error, retry | MVP-appropriate simplicity |

---

## 1. Problem Statement

Build a payment link system on Arc blockchain that:
- Allows creators to generate shareable payment links
- Supports direct USDC transfers and escrow-protected payments
- Provides basic fund release/refund capabilities
- Ships in 2-3 weeks

---

## 2. Scope Definition (MVP vs Future)

### ✅ MVP Scope (2-3 weeks)

**Payment Types:**
- Direct payment (wallet-to-wallet USDC transfer)
- Escrow payment (funds held until creator approved)

**Features:**
- Invoice creation with payment link generation
- Wallet connection (Rabbit Wallet + wagmi v2)
- SIWE authentication
- Public payment page
- Escrow funding, release, refund
- Auto-release after deadline
- Basic dashboard

**Smart Contracts:**
- `ArcInvoiceFactory` - deploys and tracks escrows
- `ArcInvoiceEscrow` - individual escrow per invoice

### ❌ Deferred to v2

- Milestone payments
- Dispute resolution system (arbitrator, evidence, timeline)
- Email notifications (Resend)
- File uploads (Uploadthing)
- Analytics dashboard
- Multi-chain support

---

## 3. Smart Contract Architecture

### 3.1 Contract Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    MVP CONTRACT DESIGN                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────┐                                   │
│   │  ArcInvoiceFactory  │                                   │
│   │  ─────────────────  │                                   │
│   │  • createEscrow()   │──────► Deploys individual         │
│   │  • getEscrow()      │        escrow contracts           │
│   │  • allEscrows[]     │                                   │
│   └─────────────────────┘                                   │
│              │                                              │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │  ArcInvoiceEscrow   │  (one per escrow invoice)         │
│   │  ─────────────────  │                                   │
│   │  • deposit()        │  Payer funds                      │
│   │  • release()        │  Payer approves                   │
│   │  • refund()         │  Creator refunds                  │
│   │  • autoRelease()    │  After deadline                   │
│   │  • getDetails()     │  View state                       │
│   └─────────────────────┘                                   │
│                                                             │
│   SKIPPED FOR MVP:                                          │
│   • openDispute() / resolveDispute()                        │
│   • Arbitrator management                                   │
│   • Milestone contract                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 On-Chain Data (Hybrid Approach)

**Stored on-chain (in contract):**
- `creator` address
- `payer` address (set on deposit)
- `amount` (USDC wei)
- `fundedAt` timestamp
- `autoReleaseDays`
- `state` enum

**Stored off-chain (Supabase):**
- Invoice description
- Client name/email
- Due date
- Short code for payment link
- Transaction hashes
- Status history

### 3.3 State Machine

```
CREATED ──► FUNDED ──► RELEASED
              │
              └──► REFUNDED (creator voluntary refund)
              │
              └──► RELEASED (auto-release after deadline)
```

No `DISPUTED` state in MVP - disputes handled manually off-chain.

### 3.4 Gas Considerations

- **Who pays:** Creator pays deployment gas on invoice creation
- **Estimated cost:** ~$0.02-0.05 per escrow deployment on Arc
- **Trade-off:** Friction on creation vs smooth payer experience

---

## 4. Database Architecture

### 4.1 Simplified Schema

```sql
-- Single table for MVP
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(10) UNIQUE NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,

    -- Core fields
    amount DECIMAL(18, 6) NOT NULL,
    description TEXT NOT NULL,
    payment_type VARCHAR(10) NOT NULL, -- 'direct' or 'escrow'

    -- Optional client info
    client_name VARCHAR(255),
    client_email VARCHAR(255),

    -- Status: 'draft', 'pending', 'funded', 'released', 'refunded'
    status VARCHAR(20) DEFAULT 'draft',

    -- Escrow fields (nullable for direct)
    escrow_address VARCHAR(42),
    auto_release_days INTEGER DEFAULT 14,
    funded_at TIMESTAMPTZ,

    -- Transaction tracking
    tx_hash VARCHAR(66),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_creator ON invoices(creator_wallet);
CREATE INDEX idx_invoices_short_code ON invoices(short_code);
CREATE INDEX idx_invoices_status ON invoices(status);
```

### 4.2 Tables Deferred to v2

- `milestones` - not needed without milestone payments
- `disputes` - not needed with manual dispute handling
- `evidence` - not needed without formal disputes

### 4.3 Row Level Security

Simple wallet-based policy:

```sql
-- Creator can see their own invoices
CREATE POLICY "creator_select" ON invoices
    FOR SELECT USING (creator_wallet = current_setting('app.wallet')::text);

CREATE POLICY "creator_insert" ON invoices
    FOR INSERT WITH CHECK (creator_wallet = current_setting('app.wallet')::text);
```

---

## 5. Authentication Architecture

### 5.1 SIWE Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │    │   API    │    │ Supabase │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │──Connect Wallet──►            │
     │◄──Address────────             │
     │               │               │
     │──Get Nonce────►               │
     │◄──Nonce───────────            │
     │               │               │
     │──Sign Message──►              │
     │ (SIWE format)  │              │
     │               │               │
     │──Verify + Set Session────────►│
     │◄──Session Cookie──────────────│
     │               │               │
```

### 5.2 Implementation

**Dependencies:**
```bash
npm install siwe
```

**Nonce generation (API):**
```typescript
// app/api/auth/nonce/route.ts
import { generateNonce } from 'siwe';

export async function GET() {
  const nonce = generateNonce();
  // Store nonce in session/cache
  return Response.json({ nonce });
}
```

**Verification (API):**
```typescript
// app/api/auth/verify/route.ts
import { SiweMessage } from 'siwe';

export async function POST(req: Request) {
  const { message, signature } = await req.json();

  const siweMessage = new SiweMessage(message);
  const { success, data } = await siweMessage.verify({ signature });

  if (success) {
    // Set Supabase session with wallet address
    // Return session token
  }
}
```

---

## 6. Frontend Architecture

### 6.1 Page Structure

```
app/
├── page.tsx                        # Landing page
├── providers.tsx                   # wagmi + query providers
├── (auth)/                         # Authenticated routes
│   ├── layout.tsx                  # Auth check wrapper
│   ├── dashboard/page.tsx          # Overview
│   ├── invoices/
│   │   ├── page.tsx                # Invoice list
│   │   ├── new/page.tsx            # Create invoice
│   │   └── [id]/page.tsx           # Invoice detail
│   └── settings/page.tsx           # Basic settings
├── pay/[code]/                     # Public routes
│   ├── page.tsx                    # Payment page
│   └── success/page.tsx            # Confirmation
└── api/
    ├── auth/
    │   ├── nonce/route.ts
    │   └── verify/route.ts
    └── invoices/
        ├── route.ts
        └── [id]/route.ts
```

### 6.2 Component Inventory (MVP)

**Build:**
- `components/wallet/ConnectButton.tsx`
- `components/wallet/WalletInfo.tsx`
- `components/invoice/InvoiceForm.tsx`
- `components/invoice/InvoiceCard.tsx`
- `components/invoice/InvoiceList.tsx`
- `components/escrow/EscrowStatus.tsx`
- `components/escrow/FundButton.tsx`
- `components/escrow/ReleaseButton.tsx`
- `components/escrow/RefundButton.tsx`
- `components/layout/Header.tsx`
- `components/layout/Sidebar.tsx`

**Skip:**
- All milestone components
- All dispute components
- Evidence uploader

### 6.3 State Management

**Approach:** wagmi v2 hooks + React Query (built-in)

```typescript
// No additional state library needed
// wagmi handles:
// - Wallet connection state
// - Contract read caching
// - Transaction state

// Example: useEscrowStatus hook
function useEscrowStatus(escrowAddress: `0x${string}`) {
  return useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: 'getDetails',
    query: {
      refetchInterval: 10000, // Poll every 10s
    },
  });
}
```

---

## 7. API Architecture

### 7.1 Endpoints (MVP)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/nonce` | Get SIWE nonce |
| POST | `/api/auth/verify` | Verify SIWE signature |
| GET | `/api/invoices` | List creator's invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/[id]` | Get invoice details |
| PATCH | `/api/invoices/[id]` | Update invoice status |
| GET | `/api/pay/[code]` | Public: get invoice for payment |

### 7.2 Skipped for MVP

- `/api/disputes/*` - no formal disputes
- `/api/milestones/*` - no milestones
- `/api/webhooks/*` - no blockchain event webhooks

---

## 8. Event Detection Strategy

### 8.1 Polling Approach (MVP)

```typescript
// Simple polling for escrow state
function useEscrowState(escrowAddress: string) {
  const { data, refetch } = useReadContract({
    address: escrowAddress as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'state',
    query: {
      refetchInterval: 10000, // 10 seconds
    },
  });

  return { state: data, refetch };
}
```

### 8.2 Rationale

- **Simplicity:** No WebSocket complexity
- **Reliability:** Works across all RPC providers
- **MVP-appropriate:** Can upgrade to real-time later

### 8.3 Future Enhancement (v2)

- Supabase Realtime for instant updates
- Backend event indexer listening to chain
- Push notifications on state changes

---

## 9. Error Handling Strategy

### 9.1 MVP Approach: Show Error, Retry

```typescript
// Transaction error handling
function useFundEscrow() {
  const { writeContract, error, isPending } = useWriteContract();

  const fund = async (escrowAddress: string, amount: bigint) => {
    try {
      await writeContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'deposit',
      });
    } catch (err) {
      // Show toast with error message
      toast.error('Transaction failed. Please try again.');
    }
  };

  return { fund, error, isPending };
}
```

### 9.2 User-Facing Errors

| Scenario | User Message |
|----------|--------------|
| RPC failure | "Network error. Please try again." |
| Insufficient balance | "Insufficient USDC balance." |
| User rejected | "Transaction cancelled." |
| Contract revert | "Transaction failed: [reason]" |

---

## 10. Development Timeline (2-3 Weeks)

### Week 1: Foundation + Direct Payments

**Days 1-2:**
- Project setup (Next.js 14, Tailwind, shadcn/ui)
- wagmi configuration for Arc chain
- Supabase setup + schema
- Basic layout components

**Days 3-4:**
- SIWE authentication flow
- Invoice creation form (direct payments)
- Payment link generation

**Days 5-7:**
- Public payment page
- Direct USDC transfer flow
- Basic dashboard

### Week 2: Escrow + Contracts

**Days 8-9:**
- Write `ArcInvoiceFactory` contract
- Write `ArcInvoiceEscrow` contract
- Unit tests with Hardhat

**Days 10-11:**
- Deploy to Arc testnet
- Frontend contract integration
- Escrow creation flow

**Days 12-14:**
- Fund escrow flow
- Release/refund flows
- Auto-release logic

### Week 3: Polish + Launch

**Days 15-16:**
- Testing on testnet
- Bug fixes
- UX improvements

**Days 17-18:**
- Security review (self-audit)
- Documentation
- Environment variables setup

**Days 19-21:**
- Final testing
- Mainnet deployment
- Launch

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Arc chain unfamiliarity | Medium | High | Start with Hardhat local, test on testnet early |
| Rabbit Wallet issues | Low | Medium | Have fallback to injected connector |
| Contract bugs | Medium | Critical | Thorough testing, keep logic minimal |
| Gas estimation wrong | Low | Low | Test with real transactions on testnet |
| 2-week timeline slip | Medium | Medium | Strictly prioritize MVP scope |

---

## 12. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Invoice creation flow | < 30 seconds |
| Payment completion flow | < 60 seconds |
| Escrow funding | < 2 transactions (approve + deposit) |
| Error rate | < 5% of transactions |
| Time to launch | ≤ 3 weeks |

---

## 13. Next Steps

1. **Immediate:** Set up project scaffold with Next.js 14 + wagmi
2. **Day 1:** Configure Arc chain in wagmi, test wallet connection
3. **Day 2:** Supabase schema + SIWE auth
4. **Day 3-4:** Invoice creation + direct payments
5. **Day 5+:** Escrow contracts

---

## 14. Unresolved Questions

1. **Arc USDC address:** Need official USDC contract address on Arc testnet/mainnet
2. **Arc chain ID:** Confirm official chain IDs (doc shows 185/18500 as placeholders)
3. **Rabbit Wallet detection:** Confirm how Rabbit Wallet injects (window.rabbitWallet vs window.ethereum)
4. **Auto-release implementation:** Should auto-release be callable by anyone or only specific parties?
5. **Gas sponsorship:** Consider platform gas sponsorship for better UX in future

---

## Appendix: Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | 3.x |
| Wallet | wagmi + viem | 2.x |
| Database | Supabase (PostgreSQL) | Latest |
| Contracts | Solidity + Hardhat | 0.8.19 / 2.19 |
| Hosting | Vercel | - |

---

*Report generated: 2026-01-04*
*Session duration: ~30 minutes*
*Decisions made: 10 key architecture decisions*
