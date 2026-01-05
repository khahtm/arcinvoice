# Brainstorm: Landing Page & App Separation

**Date:** 2026-01-05
**Status:** Agreed

---

## Problem Statement

User flow: Landing page (marketing) → Launch App → Dashboard (wallet connect)

Current state: Single app with wallet connection on landing page
Desired state: Clean separation between marketing site and product app

---

## Agreed Solution

### Architecture: Same Codebase with Route Groups

```
app/
├── (marketing)/          # No wallet provider
│   ├── layout.tsx
│   ├── page.tsx          # Landing page
│   └── ...
├── (app)/                # Wallet provider, auth
│   ├── layout.tsx
│   ├── dashboard/
│   ├── invoices/
│   ├── settings/
│   └── ...
└── pay/[code]/           # Public payment pages
```

### Subdomain Strategy

| Environment | Marketing | App |
|-------------|-----------|-----|
| Production | arcinvoice.xyz | app.arcinvoice.xyz |
| Development | localhost:3000 | localhost:3000/dashboard |

### Key Decisions

1. **No wallet on landing** - Pure marketing, cleaner UX
2. **Same codebase** - Easier maintenance, shared components
3. **Route groups** - Next.js native, no config overhead
4. **Subdomain routing** - Clean URL separation in production

---

## Implementation Considerations

### Changes Required

1. Create `(marketing)` route group with stripped layout
2. Create `(app)` route group with wallet/auth providers
3. Move dashboard/invoices/settings under `(app)`
4. Update "Launch App" button to link to subdomain/dashboard
5. Configure Vercel subdomain routing
6. Update middleware for route protection

### Risks

- **Low**: Route restructuring is non-breaking
- **Medium**: Subdomain config varies by hosting provider
- **Low**: Shared components work across route groups

---

## Next Steps

Create detailed implementation plan with phased approach.
