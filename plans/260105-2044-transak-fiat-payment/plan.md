# Implementation Plan: Transak Fiat Payment Integration

**Date:** 2026-01-05
**Status:** Ready for Implementation
**Estimate:** 2-3 phases, ~1-2 days total

---

## Overview

Add fiat payment option (Visa, bank, Apple Pay, etc.) to Arc Invoice pay page using Transak SDK. Users can pay invoices without needing a crypto wallet.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pay Page (/pay/[code])                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    OR    ┌─────────────────────────┐  │
│  │  Wallet Payment │          │    Fiat Payment         │  │
│  │  (existing)     │          │    (new - Transak)      │  │
│  └────────┬────────┘          └───────────┬─────────────┘  │
│           │                               │                 │
│           ▼                               ▼                 │
│    On-chain USDC tx              Transak Widget Modal      │
│           │                               │                 │
│           │                     ┌─────────┴─────────┐      │
│           │                     │ User pays fiat    │      │
│           │                     │ Transak KYC       │      │
│           │                     │ Card/Bank/Apple   │      │
│           │                     └─────────┬─────────┘      │
│           │                               │                 │
│           ▼                               ▼                 │
│    handlePaymentSuccess          TRANSAK_ORDER_SUCCESSFUL  │
│           │                               │                 │
│           └───────────────┬───────────────┘                │
│                           ▼                                 │
│               API: PATCH /api/pay/[code]                   │
│               Update invoice status                         │
│                           │                                 │
│                           ▼                                 │
│               Redirect to /pay/[code]/success              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Webhook (Optional/Later)                  │
├─────────────────────────────────────────────────────────────┤
│  Transak Server ──webhook──▶ POST /api/webhooks/transak    │
│                                     │                       │
│                                     ▼                       │
│                        Verify + Update DB                   │
│                        (backup confirmation)                │
└─────────────────────────────────────────────────────────────┘
```

## Phases

| Phase | Description | Files |
|-------|-------------|-------|
| 1 | Transak SDK component + Pay page integration | 3 files |
| 2 | Webhook handler (backup confirmation) | 2 files |

---

## Dependencies

```bash
npm install @transak/transak-sdk
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_TRANSAK_API_KEY=your-staging-key
NEXT_PUBLIC_TRANSAK_ENV=STAGING  # or PRODUCTION
TRANSAK_WEBHOOK_SECRET=your-webhook-secret  # for webhook verification
```

---

## Phase Details

### Phase 1: Transak SDK Integration
- Create `TransakPayButton` component
- Add "Pay with Card" option to pay page
- Handle SDK events for success/failure
- Update invoice status on completion

### Phase 2: Webhook Handler (Optional)
- Create webhook endpoint for order confirmation
- Decrypt Transak payload using ACCESS_TOKEN
- Update invoice status as backup

---

## Key Decisions

1. **Network**: Use `polygon` or `base` for USDC (Arc not yet on Transak)
2. **Wallet Address**: Send to `escrow_address` if escrow, else `creator_wallet`
3. **Amount**: Pass `fiatAmount` based on invoice amount (Transak handles conversion)
4. **Modal vs Redirect**: Use modal widget (better UX, stays on page)

---

## Success Criteria

- [ ] "Pay with Card" button visible on pay page
- [ ] Transak widget opens in modal
- [ ] Successful payment updates invoice status
- [ ] User redirected to success page
- [ ] Works for both direct and escrow payments

---

## References

- [Transak SDK Docs](https://docs.transak.com/docs/transak-sdk)
- [Transak Webhooks](https://docs.transak.com/docs/webhooks)
- [Brainstorm Report](../reports/brainstorm-260105-2044-fiat-payment-transak.md)
