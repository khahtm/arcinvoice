---
title: "Arc Invoice MVP Implementation"
description: "Payment link generator with escrow protection on Arc blockchain"
status: in-progress
priority: P1
effort: 15d
issue: null
branch: master
tags: [web3, blockchain, escrow, payments, mvp]
created: 2026-01-04
updated: 2026-01-05
---

# Arc Invoice MVP Implementation Plan

## Overview

Build a payment link generator on Arc blockchain (Circle L1) supporting:
- Direct USDC payments (wallet-to-wallet)
- Escrow payments (funds held until approval)
- Simple refund mechanism (no arbitrator)

**Timeline:** 2-3 weeks
**Stack:** Next.js 16 + wagmi v2 + Supabase + Solidity/Hardhat

## Architecture Reference

See: `../reports/brainstorm-260104-2309-arc-invoice-mvp-architecture.md`

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Project Setup & Dependencies | Done | 1d | [phase-01](./phase-01-project-setup.md) |
| 2 | Database & Authentication | Pending | 1.5d | [phase-02](./phase-02-database-auth.md) |
| 3 | Invoice Creation & Management | Pending | 2d | [phase-03](./phase-03-invoice-management.md) |
| 4 | Public Payment Page | Pending | 1.5d | [phase-04](./phase-04-payment-page.md) |
| 5 | Smart Contracts | Pending | 2d | [phase-05](./phase-05-smart-contracts.md) |
| 6 | Escrow Integration | Pending | 3d | [phase-06](./phase-06-escrow-integration.md) |
| 7 | Dashboard & Polish | Pending | 2d | [phase-07](./phase-07-dashboard-polish.md) |
| 8 | Testing & Launch | Pending | 2d | [phase-08](./phase-08-testing-launch.md) |

## Key Decisions

| Decision | Choice |
|----------|--------|
| Payment types | Direct + Escrow (no milestones) |
| Disputes | Simple refund only |
| Contracts | Factory pattern |
| Auth | SIWE |
| Metadata | Hybrid (essentials on-chain) |
| Deploy timing | Immediate (creator pays) |

## Dependencies

- Arc testnet access (confirmed available)
- Supabase project
- Vercel account
- USDC contract address on Arc

## Unresolved Questions

1. Arc USDC contract address (testnet/mainnet)
2. Official Arc chain IDs
3. Rabbit Wallet injection method
4. Auto-release caller restrictions
