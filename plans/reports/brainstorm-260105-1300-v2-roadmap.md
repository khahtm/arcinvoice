# Arc Invoice v2 Roadmap Analysis

**Date:** 2026-01-05
**Type:** Brainstorm Report
**Focus:** Next steps for Arc Invoice product

---

## Context Summary

**Current State:** MVP complete (Phase 8 in progress)
- Direct USDC payments ✓
- Basic escrow (deposit → release/refund) ✓
- SIWE authentication ✓
- Dashboard with stats ✓

**Target Audience:**
- General B2B payments
- Crypto-native businesses (DAOs, protocols)
- Small agencies/teams

**Revenue Model:** Transaction fees (split between payer + creator)

**Timeline:** Quality over speed

---

## v2 Feature Priorities (User-Selected)

### Tier 1 (Must Have)
1. **Milestone payments** - Split invoices into phases
2. **Better dispute resolution** - Beyond simple refund

### Tier 2 (Should Have)
3. **Notifications** - Email/push for payment events
4. **Reporting/analytics** - Revenue dashboards, exports

### Tier 3 (Explore Later)
5. **Fiat on/off ramps** - Research first approach

---

## Deep Dive: Milestone Payments

### Pattern Analysis

Based on [industry research](https://www.linkedin.com/advice/1/what-some-smart-contract-design-patterns-escrow-services-otj2c):

| Pattern | Description | Complexity | Best For |
|---------|-------------|------------|----------|
| **Split Payment Escrow** | Fixed % per milestone | Medium | Fixed-scope projects |
| **Conditional Release** | Oracle-verified milestones | High | Automated verification |
| **Manual Approval** | Client approves each phase | Low | Flexible scope |

### Recommended Approach: Manual Approval Pattern

```
Invoice $10,000
├── Milestone 1: Design ($3,000) → Approve → Release
├── Milestone 2: Development ($5,000) → Approve → Release
└── Milestone 3: Launch ($2,000) → Approve → Release
```

**Why:**
- Matches freelance/agency workflow
- No oracle dependency (KISS)
- Client has approval control
- Creator gets partial payments

### Contract Changes Required

```solidity
// Current: Single amount, single release
struct Escrow {
    uint256 amount;
    bool funded;
    bool released;
}

// v2: Multiple milestones
struct Escrow {
    Milestone[] milestones;
    uint256 totalAmount;
    uint256 releasedAmount;
}

struct Milestone {
    uint256 amount;
    string description;
    bool approved;
    bool released;
}
```

### Database Changes

```sql
-- New table
CREATE TABLE milestones (
    id UUID PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    order_index INT,
    amount BIGINT,
    description TEXT,
    status TEXT, -- pending, approved, released
    released_at TIMESTAMPTZ
);
```

### Effort Estimate: 5-7 days
- Smart contract: 2d
- API routes: 1d
- UI (create/manage milestones): 2-3d
- Testing: 1d

---

## Deep Dive: Dispute Resolution

### Options Analyzed

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **Current (refund only)** | Simple, no third party | No protection for creator | Done |
| **Kleros integration** | Decentralized, legal precedent | Complex, PNK tokens required | High |
| **UMA Optimistic Oracle** | Fast for uncontested | Token-based voting | High |
| **Manual arbitration** | Human judgment | Centralized, slow | Medium |
| **Evidence + voting** | Hybrid approach | Requires juror incentives | Medium |

### Recommended: Tiered Dispute System

**Tier 1: Mutual Resolution (Default)**
- Either party proposes resolution
- Other party accepts/rejects
- If accepted → execute (refund/release/split)

**Tier 2: Evidence Submission**
- Disputed party uploads evidence
- Other party responds
- 7-day window for resolution

**Tier 3: External Arbitration (Optional)**
- Integrate [Kleros](https://kleros.io/) for high-value disputes
- ~$50 minimum dispute fee
- Average resolution: 13 days

### Why This Approach

Per [Stanford research](https://law.stanford.edu/publications/kleros-a-socio-legal-case-study-of-decentralized-justice-blockchain-arbitration/), most escrow disputes resolve without arbitration when structured negotiation exists. Kleros has [legal precedent in Mexico](https://blog.kleros.io/how-to-enforce-blockchain-dispute-resolution-in-court-the-kleros-case-in-mexico/), making it viable for enforceability.

### Implementation Strategy

**Phase 1:** Mutual resolution (built-in)
**Phase 2:** Evidence submission UI
**Phase 3:** Kleros integration (optional premium)

### Effort Estimate: 8-12 days total
- Phase 1: 2-3d
- Phase 2: 3-4d
- Phase 3: 3-5d

---

## Tier 2: Notifications

### Options

| Method | Pros | Cons | Cost |
|--------|------|------|------|
| **Email (Resend/SendGrid)** | Universal, reliable | Requires email collection | ~$0.001/email |
| **Push (OneSignal)** | Real-time, no email needed | Requires PWA setup | Free tier available |
| **Telegram bot** | Crypto-native users love it | Additional integration | Free |
| **Webhook** | Developer-friendly | Technical users only | Free |

### Recommended: Email First + Webhook

**Events to notify:**
- Invoice created (to creator, confirmation)
- Invoice viewed (to creator, optional)
- Payment received (to creator)
- Escrow funded (to both)
- Milestone approved (to creator)
- Funds released (to both)
- Dispute opened (to both)

### Effort Estimate: 3-4 days

---

## Tier 2: Reporting/Analytics

### MVP Analytics (Built-in)
- Total volume (sum of paid invoices)
- Monthly revenue chart
- Client breakdown
- Escrow vs direct ratio

### Premium Analytics
- CSV/PDF export
- Tax-ready reports
- Invoice aging
- Payment velocity

### Effort Estimate: 4-5 days

---

## Tier 3: Fiat On/Off Ramps

### Research Summary

| Provider | Approach | Fees | Compliance |
|----------|----------|------|------------|
| **Moonpay** | Widget embed | 3.5-4.5% | They handle KYC |
| **Transak** | Widget embed | 1-5% | They handle KYC |
| **Bridge (Stripe)** | API integration | 0.5% | Shared KYC |
| **Circle Mint** | Direct USDC | 0% | Enterprise only |

### Recommendation: Defer to v3

**Reasons:**
- Adds KYC complexity (anti-KISS)
- Target audience is crypto-native (already has USDC)
- Compliance burden not worth it for MVP+
- Bridge/Stripe partnership more viable at scale

**Alternative:** Link to external on-ramp (Moonpay widget) without integration

---

## Transaction Fee Implementation

### Split Fee Model (User-Selected)

```
Invoice: $1,000
Fee: 1% = $10 total
├── Payer pays: $1,005 (0.5% markup)
└── Creator receives: $995 (0.5% deduction)
```

### Contract Changes

```solidity
uint256 public constant FEE_BPS = 100; // 1% total (50/50 split)
address public feeRecipient;

function release() external {
    uint256 fee = (amount * FEE_BPS) / 10000;
    uint256 creatorAmount = amount - (fee / 2);
    // Transfer fee to feeRecipient
    // Transfer rest to creator
}
```

### Considerations
- Fee on escrow only (direct payments free) vs both
- Minimum fee floor ($0.50?)
- Enterprise discounts

### Effort Estimate: 2-3 days

---

## Proposed v2 Roadmap

### Phase A: Monetization Foundation (1 week)
1. Transaction fee smart contract
2. Fee recipient setup
3. Admin dashboard for fee tracking

### Phase B: Milestone Payments (1.5 weeks)
1. Contract upgrade (MilestoneEscrow)
2. Database schema
3. Create invoice with milestones UI
4. Approve/release milestone flow
5. Testing

### Phase C: Dispute Resolution v1 (1 week)
1. Mutual resolution (propose → accept)
2. Evidence submission UI
3. Resolution history

### Phase D: Notifications (0.5 weeks)
1. Email integration (Resend)
2. Core event notifications
3. Notification preferences

### Phase E: Analytics (1 week)
1. Revenue dashboard
2. Monthly charts
3. CSV export

### Phase F: Dispute Resolution v2 (1.5 weeks)
1. Kleros integration (optional)
2. Arbitration flow
3. Fee handling

**Total Estimate: 6-7 weeks**

---

## Architecture Considerations

### Contract Upgrade Strategy

**Option 1: New Factory**
- Deploy MilestoneEscrowFactory
- Keep old factory for existing invoices
- New invoices use new factory

**Option 2: Proxy Pattern**
- Upgradeable contracts
- Single factory, upgradeable escrow logic
- More complex, but cleaner long-term

**Recommendation:** Option 1 for simplicity (YAGNI), proxy later if needed

### Multi-Tenant Readiness

For "Small agencies/teams" target:

```sql
-- Future: Organization support
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMPTZ
);

CREATE TABLE org_members (
    org_id UUID REFERENCES organizations(id),
    user_address TEXT,
    role TEXT, -- admin, member, viewer
    PRIMARY KEY (org_id, user_address)
);

-- Invoices belong to org
ALTER TABLE invoices ADD COLUMN org_id UUID REFERENCES organizations(id);
```

**Recommendation:** Defer to v3, but design schema now for easy migration

---

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| Contract upgrade breaks existing escrows | High | Deploy new factory, keep old working |
| Kleros integration complexity | Medium | Make it optional premium feature |
| Email deliverability | Low | Use reputable provider (Resend) |
| Fee collection centralization | Medium | Transparent fee address, future DAO governance |
| Regulatory concerns (money transmission) | High | Legal review before mainnet launch |

---

## Success Metrics (v2)

| Metric | Target |
|--------|--------|
| Milestone invoices created | 50+ in first month |
| Disputes resolved mutually | >80% without arbitration |
| Email notification opt-in | >60% of users |
| Transaction fee revenue | Break even on infra costs |
| User retention (30-day) | >40% |

---

## Unresolved Questions

1. **Fee structure:** Should direct payments also have fees, or escrow only?
2. **Kleros deposit:** Who pays arbitration fee - loser or split?
3. **Multi-sig for fee recipient:** Required for trust?
4. **Organization billing:** Consolidated invoicing for teams?
5. **Arc mainnet timeline:** When to deploy production contracts?

---

## Recommendation

**Start with Phase A (Monetization)** - establishes revenue foundation before adding features. Then proceed to **Phase B (Milestones)** as core differentiator.

**Key insight:** Milestone payments + split fees positions Arc Invoice as a professional freelance/agency tool, distinct from simple payment link generators.

---

## Sources

- [LinkedIn: Smart Contract Design Patterns for Escrow](https://www.linkedin.com/advice/1/what-some-smart-contract-design-patterns-escrow-services-otj2c)
- [Stanford: Kleros Socio-Legal Case Study](https://law.stanford.edu/publications/kleros-a-socio-legal-case-study-of-decentralized-justice-blockchain-arbitration/)
- [Kleros Mexico Court Recognition](https://blog.kleros.io/how-to-enforce-blockchain-dispute-resolution-in-court-the-kleros-case-in-mexico/)
- [Kleros Homepage](https://kleros.io/)
- [Request Finance: Crypto Escrow](https://www.request.finance/post/escrow-crypto)
- [Shopify: Commerce Payments Protocol 2025](https://shopify.engineering/commerce-payments-protocol)
