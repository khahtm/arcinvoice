# Phase 8: Testing & Launch

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 7](./phase-07-dashboard-polish.md)

## Overview

- **Priority:** P1
- **Status:** Pending
- **Effort:** 2 days

Final testing, security review, and production deployment.

## Requirements

### Functional
- All flows working on testnet
- No critical bugs
- Production deployment

### Non-Functional
- Performance acceptable
- Security reviewed
- Documentation complete

## Testing Checklist

### Authentication Flow
- [ ] Wallet connects successfully
- [ ] SIWE sign-in works
- [ ] Session persists on refresh
- [ ] Logout clears session
- [ ] Protected routes redirect unauthenticated users

### Invoice Creation (Direct)
- [ ] Form validates correctly
- [ ] Invoice saves to database
- [ ] Short code generates
- [ ] Payment link works
- [ ] Invoice appears in list

### Invoice Creation (Escrow)
- [ ] Form validates correctly
- [ ] Escrow contract deploys
- [ ] Escrow address saved to database
- [ ] Payment link works
- [ ] Invoice appears in list

### Direct Payment
- [ ] Payment page loads
- [ ] Amount displays correctly
- [ ] Wallet connects
- [ ] Balance shows
- [ ] Transfer executes
- [ ] Success page shows
- [ ] Invoice status updates

### Escrow Payment
- [ ] Payment page loads
- [ ] Escrow details display
- [ ] Approve USDC works
- [ ] Deposit executes
- [ ] Status updates to funded

### Escrow Release
- [ ] Creator sees funded invoice
- [ ] Refund button works
- [ ] Payer can release
- [ ] Status updates to released
- [ ] Creator receives funds

### Auto-Release
- [ ] Check canAutoRelease flag
- [ ] autoRelease function works (after deadline)

### Dashboard
- [ ] Stats calculate correctly
- [ ] Recent invoices show
- [ ] Links work
- [ ] Responsive on mobile

### Error Handling
- [ ] Insufficient balance shows error
- [ ] Failed transaction shows error
- [ ] Network errors handled gracefully
- [ ] Invalid invoice shows 404

## Security Checklist

### Smart Contracts
- [ ] ReentrancyGuard on all fund transfers
- [ ] Access control enforced (onlyPayer, onlyCreator)
- [ ] State transitions validated
- [ ] No overflow/underflow issues (Solidity 0.8+)
- [ ] Events emitted for all state changes

### Frontend
- [ ] No sensitive data in localStorage
- [ ] HttpOnly cookies for session
- [ ] CSRF protection (SameSite cookies)
- [ ] XSS prevention (React default escaping)
- [ ] Input validation (Zod)

### API
- [ ] Authentication required for protected routes
- [ ] Ownership verified before updates
- [ ] Input validation on all endpoints
- [ ] Rate limiting (consider for production)

### Database
- [ ] RLS policies enabled
- [ ] No SQL injection (Supabase parameterized)
- [ ] Sensitive data not exposed in public queries

## Performance Checklist

- [ ] Page load < 3s
- [ ] Transaction confirmation < 30s
- [ ] No memory leaks
- [ ] Bundle size reasonable
- [ ] Images optimized

## Pre-Launch Steps

### Step 1: Environment Setup

Create production `.env`:

```bash
# Production environment
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Arc Mainnet (or testnet for soft launch)
NEXT_PUBLIC_CHAIN_ID=185
NEXT_PUBLIC_RPC_URL=https://rpc.arc.circle.com

# Deployed contracts
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...

# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL=your_prod_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
```

### Step 2: Contract Deployment

```bash
# Deploy to mainnet (or testnet for soft launch)
USDC_ADDRESS=0x... npx hardhat run scripts/deploy.ts --network arcMainnet
```

### Step 3: Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Step 4: DNS Configuration

- Point domain to Vercel
- Configure SSL (automatic with Vercel)

### Step 5: Monitoring Setup

- Enable Vercel Analytics
- Set up error monitoring (optional: Sentry)

## Post-Launch Monitoring

### Metrics to Watch
- Error rate in logs
- Transaction success rate
- Page load times
- User session count

### Response Plan
- Critical bugs: Hotfix and redeploy
- Contract issues: Pause and communicate
- UX issues: Document and prioritize

## Documentation

### Update README.md

```markdown
# Arc Invoice

Payment link generator with escrow protection on Arc blockchain.

## Features
- Direct USDC payments
- Escrow-protected payments
- Auto-release after deadline
- Simple refund mechanism

## Tech Stack
- Next.js 16
- wagmi v2 + viem
- Supabase (PostgreSQL)
- Solidity (Hardhat)

## Getting Started

1. Clone and install
   ```bash
   git clone ...
   npm install
   ```

2. Set up environment
   ```bash
   cp .env.example .env.local
   # Fill in values
   ```

3. Run development server
   ```bash
   npm run dev
   ```

## Contract Addresses

### Arc Testnet
- Factory: 0x...
- USDC: 0x...

### Arc Mainnet
- Factory: 0x...
- USDC: 0x...

## License
MIT
```

## Todo List

### Testing
- [ ] Test authentication flow
- [ ] Test direct invoice creation
- [ ] Test escrow invoice creation
- [ ] Test direct payment flow
- [ ] Test escrow payment flow
- [ ] Test release/refund
- [ ] Test dashboard
- [ ] Test error handling
- [ ] Test mobile responsiveness

### Security
- [ ] Review contract security
- [ ] Review frontend security
- [ ] Review API security
- [ ] Review database security

### Deployment
- [ ] Set up production environment
- [ ] Deploy contracts to mainnet/testnet
- [ ] Deploy frontend to Vercel
- [ ] Configure domain
- [ ] Test production deployment

### Documentation
- [ ] Update README
- [ ] Document contract addresses
- [ ] Create .env.example

## Success Criteria

- [ ] All tests pass
- [ ] Security checklist complete
- [ ] Production deployment working
- [ ] Domain configured
- [ ] Documentation complete

## Launch Readiness

Before announcing launch:

- [ ] All critical paths tested
- [ ] No blocking bugs
- [ ] Contracts verified on explorer
- [ ] Documentation complete
- [ ] Support channel ready

---

## MVP Complete!

Congratulations on completing Arc Invoice MVP! Key accomplishments:
- Direct USDC payments
- Escrow-protected payments
- Smart contract factory pattern
- SIWE authentication
- Dashboard with stats

### Next Steps (v2)
- Milestone payments
- Dispute resolution
- Email notifications
- Multi-chain support
