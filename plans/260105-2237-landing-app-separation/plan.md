# Landing Page & App Separation Plan

**Date:** 2026-01-05
**Status:** Ready for Implementation
**Brainstorm:** [brainstorm-260105-2237-landing-app-separation.md](../reports/brainstorm-260105-2237-landing-app-separation.md)

---

## Overview

Restructure Arc Invoice to separate marketing landing page from the authenticated app using Next.js route groups and subdomain routing.

### Goals
- Clean separation: marketing (no wallet) vs app (wallet required)
- User flow: Landing → "Launch App" → Dashboard with wallet connect
- Production: `arcinvoice.xyz` (marketing) + `app.arcinvoice.xyz` (app)
- Development: Same domain, different routes

---

## Current State

```
app/
├── layout.tsx          # Root - has Providers (WagmiProvider)
├── providers.tsx       # Wallet + React Query providers
├── page.tsx            # Landing page (uses useAccount, auto-redirects)
├── (auth)/             # Protected routes with auth layout
│   ├── layout.tsx      # Wallet auth check, SIWE auto-sign
│   ├── dashboard/
│   ├── invoices/
│   ├── settings/
│   └── analytics/
└── pay/[code]/         # Public payment pages
```

**Problem:** Landing page imports `useAccount` from wagmi, causing wallet prompt on marketing page.

---

## Target State

```
app/
├── layout.tsx              # Minimal root (fonts, globals, Toaster only)
├── globals.css
├── (marketing)/            # No wallet provider
│   ├── layout.tsx          # Marketing layout (no providers)
│   └── page.tsx            # Landing page (no wallet hooks)
├── (app)/                  # Wallet provider wrapped
│   ├── layout.tsx          # App layout with Providers + auth
│   ├── providers.tsx       # Moved here (WagmiProvider, QueryClient)
│   ├── dashboard/
│   ├── invoices/
│   ├── settings/
│   └── analytics/
└── pay/[code]/             # Public (needs its own provider wrapper)
    ├── layout.tsx          # Minimal Providers for wallet connect
    └── ...
```

---

## Phases

| # | Phase | Description | Link |
|---|-------|-------------|------|
| 1 | Route Group Structure | Create route groups, move files | [phase-01](./phase-01-route-groups.md) |
| 2 | Provider Separation | Split providers, update layouts | [phase-02](./phase-02-providers.md) |
| 3 | Landing Page Cleanup | Remove wallet deps from landing | [phase-03](./phase-03-landing.md) |
| 4 | Subdomain Config | Vercel/middleware setup | [phase-04](./phase-04-subdomain.md) |

---

## Key Decisions

### 1. Provider Strategy

**Root layout (app/layout.tsx):**
- Only: fonts, globals.css, Toaster, html/body structure
- NO providers

**Marketing layout ((marketing)/layout.tsx):**
- Passthrough, no providers
- Clean, static marketing pages

**App layout ((app)/layout.tsx):**
- WagmiProvider, QueryClientProvider
- Auth checks, SIWE auto-sign (from current (auth)/layout.tsx)

**Pay layout (pay/[code]/layout.tsx):**
- Minimal providers (wallet connect only, no auth)
- Payer doesn't need full auth

### 2. "Launch App" Button

```tsx
// In (marketing)/page.tsx
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '/dashboard';

<Button asChild>
  <Link href={appUrl}>Launch App</Link>
</Button>
```

**Environment:**
```env
# .env.local (dev)
NEXT_PUBLIC_APP_URL=/dashboard

# .env.production
NEXT_PUBLIC_APP_URL=https://app.arcinvoice.xyz/dashboard
```

### 3. Subdomain Routing (Vercel)

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "app.arcinvoice.xyz" }],
      "destination": "/dashboard/:path*"
    }
  ]
}
```

---

## Files to Change

### Create
- `app/(marketing)/layout.tsx`
- `app/(marketing)/page.tsx` (move from app/page.tsx)
- `app/(app)/layout.tsx` (merge providers + auth)
- `app/(app)/providers.tsx` (move from app/providers.tsx)
- `app/pay/[code]/layout.tsx` (minimal providers)
- `vercel.json` (subdomain rewrites)

### Modify
- `app/layout.tsx` - Strip providers, keep minimal
- `.env.example` - Add NEXT_PUBLIC_APP_URL

### Move
- `app/(auth)/*` → `app/(app)/*`

### Delete
- `app/page.tsx` (moved to marketing)
- `app/providers.tsx` (moved to app group)
- `app/(auth)/` (renamed to (app))

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken imports after move | High | Use global search/replace for paths |
| Pay page loses wallet | Medium | Add minimal provider wrapper |
| SEO impact on subdomain | Low | Keep marketing on root domain |

---

## Success Criteria

- [ ] Landing page loads with no wallet prompt
- [ ] "Launch App" navigates to dashboard
- [ ] Dashboard requires wallet connection
- [ ] Pay page still works (wallet connect for payment)
- [ ] Build passes, no type errors
- [ ] Works in dev (localhost) and prod (subdomains)
