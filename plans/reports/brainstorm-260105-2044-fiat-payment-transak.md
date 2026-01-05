# Brainstorm: Fiat Payment Integration via Transak

**Date:** 2026-01-05
**Status:** Agreed
**Decision:** Integrate Transak for fiat-to-USDC payments on pay page

---

## Problem Statement

Arc Invoice currently only accepts USDC payments via connected wallets. To expand user base, need fiat payment option (Visa, bank transfer, Apple Pay, etc.) on the `/pay/[code]` page.

---

## Requirements

| Requirement | Priority |
|-------------|----------|
| Global coverage (64+ countries) | Must have |
| Easy integration (widget/SDK) | Must have |
| All payment methods (cards, bank, Apple/Google Pay) | Must have |
| Arc network USDC support | Must have |
| Handles KYC/compliance | Must have |

---

## Options Evaluated

### 1. Transak ⭐ SELECTED
- **Pros:** Official Arc partner, 64+ countries, all payment methods, React SDK, handles KYC
- **Cons:** ~1-4.5% fees (standard)
- **Integration:** `@transak/transak-sdk` widget embed

### 2. MoonPay
- **Pros:** Good UX, global, all methods
- **Cons:** Not Arc partner, may need bridging

### 3. Onramper (Aggregator)
- **Pros:** Best rates via 30+ providers
- **Cons:** Added complexity, less UX control

### 4. Stripe Crypto Onramp
- **Pros:** Trusted, zero fraud liability
- **Cons:** Limited global (US/EU only), not Arc-native

---

## Selected Solution: Transak

### Why Transak?
1. **Official Arc network infrastructure partner** - Listed by Circle
2. **Native USDC support** - Direct to Arc chain (when mainnet)
3. **Easy React/Next.js SDK** - `@transak/transak-sdk` npm package
4. **All payment methods** - Cards, bank, Apple Pay, Google Pay, PayPal
5. **Handles compliance** - KYC, fraud, regulatory requirements

### Integration Approach

```
Pay Page (/pay/[code])
    │
    ├── Wallet Connected → Existing USDC payment flow
    │
    └── No Wallet / Fiat Option → Transak Widget
            │
            ├── User selects payment method (card/bank/etc)
            ├── Transak handles KYC (if needed)
            ├── User pays in fiat (USD/EUR/etc)
            └── Transak sends USDC to escrow/creator wallet
```

### Key Configuration

```typescript
// Transak SDK config
{
  apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY,
  environment: 'PRODUCTION', // or 'STAGING'
  cryptoCurrencyCode: 'USDC',
  network: 'arc', // when supported, or bridge chain
  walletAddress: invoice.escrow_address || invoice.creator_wallet,
  fiatAmount: invoice.amount,
  disableWalletAddressForm: true,
  hideExchangeScreen: true,
}
```

### Fee Structure (Transak)
- Bank transfer: ~1%
- Credit/debit cards: ~3.5-4.5%
- Apple Pay/Google Pay: ~3.5-4.5%
- Network fees: Additional (minimal for USDC)

---

## Implementation Considerations

### Must Do
1. Sign up for Transak partner account
2. Get API key (staging + production)
3. Add Transak SDK to pay page
4. Handle webhook for payment completion
5. Update invoice status on successful payment

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Arc not yet on Transak | Use bridge chain (Base/Polygon) + CCTP bridge |
| KYC friction | Offer both wallet + fiat options |
| Payment failure | Show clear error, allow retry |
| Exchange rate fluctuation | Lock rate at widget open or accept variance |

### Arc Network Consideration
Arc testnet launched Oct 2025, mainnet expected 2026. Until Arc is fully supported:
- Use USDC on supported chain (Base recommended - Circle ecosystem)
- Bridge via CCTP to Arc, OR
- Wait for native Transak Arc support (they're partners)

---

## Success Metrics

- Fiat payment completion rate > 80%
- Avg time to complete < 5 minutes
- Support ticket rate < 2%

---

## Next Steps

1. [ ] Create Transak partner account
2. [ ] Get staging API key
3. [ ] Implement Transak widget on pay page
4. [ ] Add "Pay with Card" button alongside wallet connect
5. [ ] Handle Transak webhooks for payment status
6. [ ] Test full flow on staging
7. [ ] Deploy to production

---

## Sources

- [Transak Official](https://transak.com/)
- [Transak SDK (npm)](https://www.npmjs.com/package/@transak/transak-sdk)
- [Transak React Sample](https://github.com/Transak/Transak-widget-react-sample)
- [Transak Docs](https://docs.transak.com/docs/sdk-on-ramp-and-off-ramp)
- [Circle Arc Testnet Launch](https://www.circle.com/pressroom/circle-launches-arc-public-testnet)
- [MoonPay Ramps](https://www.moonpay.com/business/ramps)
- [Stripe Crypto Onramp](https://docs.stripe.com/crypto/onramp)
