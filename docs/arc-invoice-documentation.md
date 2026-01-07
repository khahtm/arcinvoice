# Arc Invoice - Complete Documentation

**Version:** 1.0.0
**Last Updated:** January 2026
**Repository:** https://github.com/khahtm/arcinvoice

---

## Overview

Arc Invoice is a payment link generator with escrow protection built on Arc blockchain (Circle L1). It enables freelancers, businesses, and service providers to create secure payment links with optional escrow protection for milestone-based payments.

### Key Features

| Feature | Description |
|---------|-------------|
| **Direct Payments** | Instant USDC wallet-to-wallet transfers |
| **Escrow Protection** | Funds held in smart contract until release |
| **Milestone Payments** | Pay-per-milestone with individual releases |
| **Auto-Release** | Automatic fund release after deadline |
| **Dispute Resolution** | Built-in dispute system with Kleros integration |
| **Analytics Dashboard** | Revenue tracking and invoice statistics |
| **Email Notifications** | Payment alerts and status updates |
| **Fiat On-Ramp** | Transak integration for card payments |

---

## Architecture

### Tech Stack

```
Frontend:       Next.js 16 + React 19 + TypeScript
Styling:        Tailwind CSS + shadcn/ui
Web3:           wagmi v2 + viem + SIWE
Database:       Supabase (PostgreSQL)
Smart Contracts: Solidity 0.8.28 + Hardhat
Blockchain:     Arc (Circle L1) - Chain ID 5042002
```

### Project Structure

```
arc-invoice/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated app routes
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── dashboard/            # Main dashboard
│   │   ├── invoices/             # Invoice management
│   │   └── settings/             # User settings
│   ├── (marketing)/              # Public marketing pages
│   ├── api/                      # API routes
│   │   ├── analytics/            # Analytics endpoints
│   │   ├── auth/                 # SIWE authentication
│   │   ├── invoices/             # Invoice CRUD + disputes
│   │   ├── notifications/        # Email notifications
│   │   └── webhooks/             # External webhooks
│   └── pay/                      # Public payment pages
├── components/                   # React components
│   ├── analytics/                # Charts and stats
│   ├── common/                   # Shared components
│   ├── dispute/                  # Dispute resolution UI
│   ├── escrow/                   # Escrow interactions
│   ├── invoice/                  # Invoice components
│   ├── layout/                   # App layout
│   ├── milestone/                # Milestone UI
│   ├── notification/             # Notification settings
│   ├── payment/                  # Payment flows
│   ├── transak/                  # Fiat on-ramp
│   ├── ui/                       # shadcn/ui components
│   └── wallet/                   # Wallet connection
├── contracts/                    # Solidity contracts
├── hooks/                        # React hooks
├── lib/                          # Utilities
│   ├── chains/                   # Chain definitions
│   ├── contracts/                # Contract ABIs
│   ├── supabase/                 # Database client
│   └── validation/               # Zod schemas
└── types/                        # TypeScript types
```

---

## Smart Contracts

### Contract Addresses

**Arc Testnet (Chain ID: 5042002)**

| Contract | Address |
|----------|---------|
| Factory v1 | `0x07a7be2be306a4C37c7E526235BEcB7BF4C018FB` |
| Factory v3 (Milestones) | `0xYourV3FactoryAddress` |
| USDC | `0x3600000000000000000000000000000000000000` |

### ArcInvoiceFactory (v1)

Factory for deploying escrow contracts.

```solidity
// Deploy new escrow
function createEscrow(
    bytes32 invoiceId,
    uint256 amount,
    uint256 autoReleaseDays
) external returns (address)

// Get escrow address
function getEscrow(bytes32 invoiceId) external view returns (address)
```

### ArcInvoiceEscrow (v1)

Individual escrow contract for single payments.

```solidity
function deposit() external                 // Fund escrow (payer)
function release() external                 // Release to creator (payer only)
function refund() external                  // Refund to payer (creator only)
function autoRelease() external             // Release after deadline (anyone)
```

### ArcMilestoneEscrow (v3)

Escrow contract for milestone-based payments.

```solidity
function depositMilestone(uint8 index) external   // Fund specific milestone
function releaseMilestone(uint8 index) external   // Release milestone
function refundMilestone(uint8 index) external    // Refund milestone
```

---

## Payment Types

### 1. Direct Payment

Instant wallet-to-wallet USDC transfer. No escrow, immediate settlement.

**Flow:**
1. Creator creates invoice with `payment_type: 'direct'`
2. Payer clicks pay link
3. USDC transferred directly to creator's wallet
4. Invoice marked as `released`

### 2. Escrow Payment

Funds held in smart contract until released.

**Flow:**
1. Creator creates invoice with `payment_type: 'escrow'`
2. Escrow contract deployed on first payment
3. Payer deposits USDC into escrow
4. Payer can release funds to creator
5. Creator can refund before release
6. Auto-release after deadline if not released

**States:** `pending` → `funded` → `released` or `refunded`

### 3. Milestone Payment

Multiple milestones with individual payments.

**Flow:**
1. Creator creates invoice with milestones
2. Milestone escrow contract deployed
3. Payer funds milestones individually
4. Each milestone released independently
5. Partial payments supported

---

## Database Schema

### invoices

```sql
id              UUID PRIMARY KEY
short_code      VARCHAR(8) UNIQUE      -- Payment link code
creator_wallet  VARCHAR(42)            -- Creator's address
amount          BIGINT                 -- Amount in micro USDC
description     TEXT
payment_type    VARCHAR(20)            -- 'direct', 'escrow'
status          VARCHAR(20)            -- 'pending', 'funded', 'released', etc.
contract_address VARCHAR(42)           -- Escrow contract (if escrow)
contract_version INTEGER               -- 1 or 3
auto_release_days INTEGER DEFAULT 14
payer_wallet    VARCHAR(42)            -- Payer's address (after payment)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### milestones

```sql
id              UUID PRIMARY KEY
invoice_id      UUID REFERENCES invoices
order_index     INTEGER                -- 0, 1, 2...
amount          BIGINT                 -- Amount in micro USDC
description     TEXT
status          VARCHAR(20)            -- 'pending', 'funded', 'released'
```

### disputes

```sql
id              UUID PRIMARY KEY
invoice_id      UUID REFERENCES invoices
initiator_wallet VARCHAR(42)
reason          TEXT
status          VARCHAR(20)            -- 'open', 'resolved', 'escalated'
resolution      TEXT
kleros_dispute_id VARCHAR
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/nonce` | Get SIWE nonce |
| POST | `/api/auth/verify` | Verify SIWE signature |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/session` | Get current session |

### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List user's invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/[id]` | Get invoice details |
| PATCH | `/api/invoices/[id]` | Update invoice |
| DELETE | `/api/invoices/[id]` | Delete invoice |

### Milestones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices/[id]/milestones` | List milestones |
| PATCH | `/api/invoices/[id]/milestones/[idx]` | Update milestone status |

### Disputes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices/[id]/disputes` | List disputes |
| POST | `/api/invoices/[id]/disputes` | Open dispute |
| POST | `/api/invoices/[id]/disputes/[id]/escalate` | Escalate to Kleros |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get analytics data |
| GET | `/api/analytics/export` | Export as CSV |

---

## User Flows

### Creating an Invoice

1. Connect wallet (MetaMask, WalletConnect, or Coinbase Wallet)
2. Sign in with Ethereum (SIWE)
3. Navigate to "Create Invoice"
4. Fill in amount, description, payment type
5. (Optional) Add milestones for milestone payments
6. Submit - invoice created with unique short code
7. Share payment link: `https://arcinvoice.com/pay/[short_code]`

### Paying an Invoice

1. Open payment link
2. Connect wallet
3. Review invoice details
4. Click "Pay" button
5. Approve USDC spending (if first time)
6. Confirm transaction
7. Wait for confirmation
8. Redirected to success page

### Releasing Escrow

1. Payer navigates to invoice detail page
2. Click "Release" button
3. Confirm transaction
4. Funds transferred to creator

---

## Environment Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=/dashboard

# Arc Chain
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://arc-testnet.drpc.org

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Transak (Fiat On-Ramp)
NEXT_PUBLIC_TRANSAK_API_KEY=your_api_key
NEXT_PUBLIC_TRANSAK_ENV=STAGING

# Contract Deployment
DEPLOYER_PRIVATE_KEY=0x...
```

---

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/khahtm/arcinvoice.git
cd arc-invoice

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
```

### Contract Development

```bash
npx hardhat compile                                    # Compile contracts
npx hardhat test                                       # Run tests
npx hardhat run scripts/deploy.ts --network arcTestnet # Deploy
```

---

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy

```bash
npm i -g vercel
vercel --prod
```

### Docker

```bash
docker build -t arc-invoice .
docker run -p 3000:3000 arc-invoice
```

---

## Security

| Layer | Protection |
|-------|------------|
| Smart Contracts | OpenZeppelin ReentrancyGuard, SafeERC20 |
| Authentication | SIWE (Sign-In with Ethereum) |
| Database | Supabase Row Level Security (RLS) |
| Input Validation | Zod schemas |
| API | Rate limiting, CORS |

---

## Integrations

### Transak

Fiat on-ramp for users without crypto.

```typescript
// Initialize Transak widget
const transak = new Transak({
  apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY,
  environment: 'STAGING',
  walletAddress: userAddress,
  cryptoCurrencyCode: 'USDC',
  network: 'arc',
});
```

### Kleros

Decentralized dispute resolution.

- Disputes can be escalated to Kleros Court
- Evidence submitted on-chain
- Ruling enforced automatically

---

## Troubleshooting

### Common Issues

**"Wrong Network" Error**
- Switch wallet to Arc Testnet (Chain ID: 5042002)
- Add network manually if needed

**Transaction Fails**
- Check USDC balance
- Ensure sufficient gas (Arc uses USDC for gas)
- Check contract state (not already funded/released)

**Wallet Not Connecting**
- Clear browser cache
- Try different wallet
- Check if wallet supports Arc chain

---

## Support

- **GitHub Issues:** https://github.com/khahtm/arcinvoice/issues
- **Documentation:** https://arcinvoice.com/docs

---

## License

MIT License - See LICENSE file for details.
