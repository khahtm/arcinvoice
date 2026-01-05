# Arc Invoice

Payment link generator with escrow protection on Arc blockchain (Circle L1).

## Features

- **Direct USDC Payments** - Instant wallet-to-wallet transfers
- **Escrow Protection** - Funds held in smart contract until release
- **Auto-Release** - Automatic fund release after deadline
- **Simple Refunds** - Creator can refund before release
- **SIWE Authentication** - Sign-In with Ethereum for secure access
- **Dashboard** - Stats overview and invoice management

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Web3:** wagmi v2, viem, SIWE
- **Database:** Supabase (PostgreSQL)
- **Smart Contracts:** Solidity 0.8.28, Hardhat
- **UI:** shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Wallet with Arc testnet USDC

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/arc-invoice.git
cd arc-invoice

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your values (see Environment Variables section)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Create `.env.local` with the following:

```bash
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Arc Chain Configuration
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://arc-testnet.drpc.org

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Contract Deployment (optional - for deploying contracts)
DEPLOYER_PRIVATE_KEY=your_private_key
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

## Contract Addresses

### Arc Testnet (Chain ID: 5042002)

| Contract | Address |
|----------|---------|
| Factory  | `0x07a7be2be306a4C37c7E526235BEcB7BF4C018FB` |
| USDC     | `0x3600000000000000000000000000000000000000` |

### Arc Mainnet (Chain ID: 5042001)

| Contract | Address |
|----------|---------|
| Factory  | TBD |
| USDC     | `0x3600000000000000000000000000000000000000` |

## Smart Contracts

### ArcInvoiceFactory

Factory contract for deploying escrow contracts:

- `createEscrow(invoiceId, amount, autoReleaseDays)` - Deploy new escrow
- `getEscrow(invoiceId)` - Get escrow address for invoice

### ArcInvoiceEscrow

Individual escrow contract:

- `deposit()` - Fund the escrow (payer)
- `release()` - Release funds to creator (payer)
- `refund()` - Refund to payer (creator)
- `autoRelease()` - Release after deadline (anyone)

## Project Structure

```
arc-invoice/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authenticated routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── invoices/      # Invoice management
│   │   └── settings/      # User settings
│   ├── api/               # API routes
│   └── pay/               # Public payment pages
├── components/            # React components
│   ├── common/            # Shared components
│   ├── escrow/            # Escrow components
│   ├── invoice/           # Invoice components
│   ├── layout/            # Layout components
│   ├── payment/           # Payment components
│   ├── ui/                # shadcn/ui components
│   └── wallet/            # Wallet components
├── contracts/             # Solidity smart contracts
├── hooks/                 # React hooks
├── lib/                   # Utilities and helpers
└── types/                 # TypeScript types
```

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

### Contract Development

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
USDC_ADDRESS=0x... npx hardhat run scripts/deploy.ts --network arcTestnet
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual

```bash
npm run build
npm start
```

## Security

- Smart contracts use OpenZeppelin's ReentrancyGuard
- SIWE for secure wallet authentication
- Supabase RLS for database security
- Input validation with Zod schemas

## License

MIT
