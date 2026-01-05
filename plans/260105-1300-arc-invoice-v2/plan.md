---
title: "Arc Invoice v2 Implementation"
description: "Transaction fees, milestone payments, dispute resolution, notifications, analytics"
status: planned
priority: P1
effort: 6-7 weeks
issue: null
branch: master
tags: [web3, blockchain, escrow, payments, v2]
created: 2026-01-05
updated: 2026-01-05
---

# Arc Invoice v2 Implementation Plan

## Overview

Build upon MVP foundation to add monetization, milestone payments, dispute resolution, notifications, and analytics.

**Timeline:** 6-7 weeks (quality over speed)
**Stack:** Next.js 16 + wagmi v2 + Supabase + Solidity/Hardhat + Resend

## Research Reference

See: `../reports/brainstorm-260105-1300-v2-roadmap.md`

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fee model | Split 50/50 (0.5% payer + 0.5% creator) | Fair, reduces friction |
| Milestone pattern | Manual approval | KISS, no oracle dependency |
| Contract upgrade | New factory (v2) | Keep old working, simpler than proxy |
| Dispute v1 | Mutual resolution | Most disputes resolve without arbitration |
| Dispute v2 | Kleros integration | Legal precedent, decentralized |
| Notifications | Email (Resend) | Universal, reliable |
| Analytics | Built-in + CSV export | No external dependency |

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| A | Transaction Fees | Planned | 1 week | [phase-A](./phase-A-transaction-fees.md) |
| B | Milestone Payments | Planned | 1.5 weeks | [phase-B](./phase-B-milestone-payments.md) |
| C | Dispute Resolution v1 | Planned | 1 week | [phase-C](./phase-C-dispute-resolution-v1.md) |
| D | Notifications | Planned | 0.5 weeks | [phase-D](./phase-D-notifications.md) |
| E | Analytics | Planned | 1 week | [phase-E](./phase-E-analytics.md) |
| F | Kleros Integration | Planned | 1.5 weeks | [phase-F](./phase-F-kleros-integration.md) |

## Contract Architecture (v2)

```
contracts/
├── ArcInvoiceEscrow.sol        # (v1 - keep as-is)
├── ArcInvoiceFactory.sol       # (v1 - keep as-is)
├── v2/
│   ├── ArcMilestoneEscrow.sol  # New: milestone support + fees
│   ├── ArcMilestoneFactory.sol # New: creates v2 escrows
│   └── FeeCollector.sol        # New: fee aggregation
```

## Database Schema Changes

```sql
-- Phase A: Fee tracking
ALTER TABLE invoices ADD COLUMN fee_amount BIGINT DEFAULT 0;
ALTER TABLE invoices ADD COLUMN fee_collected BOOLEAN DEFAULT false;

-- Phase B: Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, released
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase C: Disputes
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    opened_by TEXT NOT NULL, -- wallet address
    reason TEXT NOT NULL,
    proposed_resolution TEXT, -- refund, release, split
    proposed_amount BIGINT,
    status TEXT DEFAULT 'open', -- open, resolved, escalated
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by TEXT NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase D: Notifications
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT,
    email_verified BOOLEAN DEFAULT false,
    notify_payment_received BOOLEAN DEFAULT true,
    notify_escrow_funded BOOLEAN DEFAULT true,
    notify_milestone_approved BOOLEAN DEFAULT true,
    notify_dispute_opened BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    sent_email BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase E: Analytics (computed views, no new tables needed)
```

## API Routes (New)

```
app/api/
├── invoices/
│   └── [id]/
│       ├── milestones/
│       │   ├── route.ts           # GET, POST milestones
│       │   └── [milestoneId]/
│       │       └── route.ts       # PATCH (approve/release)
│       └── disputes/
│           ├── route.ts           # GET, POST dispute
│           └── [disputeId]/
│               ├── route.ts       # PATCH (resolve)
│               └── evidence/
│                   └── route.ts   # POST evidence
├── notifications/
│   ├── route.ts                   # GET notifications
│   └── preferences/
│       └── route.ts               # GET, PATCH preferences
├── analytics/
│   ├── route.ts                   # GET dashboard stats
│   └── export/
│       └── route.ts               # GET CSV export
└── webhooks/
    └── kleros/
        └── route.ts               # Kleros callback (Phase F)
```

## Dependencies to Add

```json
{
  "dependencies": {
    "resend": "^3.0.0",
    "@kleros/arbitrable-token-interface": "^1.0.0"
  }
}
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Contract upgrade breaks existing | Deploy separate v2 factory |
| Kleros complexity | Make optional, Phase F last |
| Email deliverability | Use Resend (good reputation) |
| Fee centralization | Transparent address, multi-sig later |

## Success Metrics

| Metric | Target |
|--------|--------|
| Milestone invoices | 50+ first month |
| Mutual dispute resolution | >80% |
| Email opt-in rate | >60% |
| Fee revenue | Break-even on infra |

## Unresolved Questions

1. Direct payment fees? (Currently escrow-only planned)
2. Kleros arbitration fee: loser pays or split?
3. Multi-sig for fee recipient?
4. Arc mainnet deployment timing?
