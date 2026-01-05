# Brainstorm: Phase 7 - Dashboard & Polish

**Date:** 2026-01-05
**Status:** Agreed
**Next Phase:** Implementation

---

## Problem Statement

Arc Invoice MVP needs dashboard overview, sidebar navigation, and polished UX before testing/launch. Phase 6 (escrow integration) is complete.

## Requirements Confirmed

- 4 dashboard stats: total invoices, total amount, pending, paid
- Full settings page with wallet info + disconnect
- Basic mobile responsiveness with collapsible sidebar

## Current State Analysis

### Exists (No Changes Needed)
| File | Status |
|------|--------|
| `app/(auth)/invoices/[id]/page.tsx` | Complete with escrow, copy link |
| `app/(auth)/invoices/page.tsx` | Invoice list exists |
| `app/(auth)/invoices/new/page.tsx` | Invoice creation exists |
| `hooks/useInvoices.ts` | Data fetching exists |

### Needs Modification
| File | Changes |
|------|---------|
| `app/(auth)/layout.tsx` | Refactor to sidebar layout + mobile nav |
| `app/page.tsx` | Add redirect to dashboard when authenticated |

### Needs Creation
| File | Purpose |
|------|---------|
| `components/layout/Header.tsx` | Header with hamburger menu |
| `components/layout/Sidebar.tsx` | Navigation sidebar |
| `components/layout/MobileNav.tsx` | Sheet-based mobile nav |
| `app/(auth)/dashboard/page.tsx` | Dashboard with stats |
| `app/(auth)/settings/page.tsx` | Settings page |
| `components/common/StatCard.tsx` | Reusable stat card |

## Approaches Evaluated

### Approach 1: Sidebar with Sheet (Recommended)
- Desktop: Fixed sidebar 64px wide
- Mobile: Sheet overlay from left
- Uses existing shadcn Sheet component

**Pros:**
- Standard pattern, familiar UX
- Sheet is already available in shadcn
- Clean separation of concerns

**Cons:**
- Slightly more complex than top nav

### Approach 2: Top Navigation Only
- All nav in header, dropdown on mobile
- Simpler implementation

**Pros:**
- Simpler
- Less layout refactoring

**Cons:**
- Less scalable for future features
- Not as modern looking

### Decision: Approach 1 (Sidebar with Sheet)

## Final Solution

### Architecture
```
app/(auth)/layout.tsx
├── Header (mobile: hamburger, desktop: hidden)
├── Sidebar (desktop: visible, mobile: hidden)
├── Sheet (mobile nav overlay)
└── main content
```

### Component Hierarchy
```
AuthLayout
├── MobileNav (Sheet trigger + content)
├── Sidebar (hidden on mobile)
└── Main
    └── children
```

### Stats Implementation
```typescript
// Use existing useInvoices hook
const stats = {
  totalInvoices: invoices.length,
  totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
  pending: invoices.filter(inv => ['draft', 'pending'].includes(inv.status)).length,
  paid: invoices.filter(inv => inv.status === 'released').length,
};
```

## Implementation Considerations

### Dependencies
- Need to verify Sheet component exists in shadcn setup
- May need `lucide-react` icons (likely already installed)

### Risks
1. Layout refactor affects all auth pages - test navigation after
2. Stats calculation client-side - may be slow with many invoices (acceptable for MVP)
3. Sheet may need z-index adjustments

### Testing Checklist
- [ ] Sidebar navigation works on desktop
- [ ] Mobile hamburger opens sheet
- [ ] Dashboard stats calculate correctly
- [ ] Settings disconnect works
- [ ] Responsive breakpoints correct (md: 768px)

## Success Metrics

- Dashboard loads with correct stats
- All navigation links work
- Mobile nav functions properly
- Settings page displays wallet and disconnects

## Next Steps

1. Create implementation plan with Phase 7 tasks
2. Update plan.md to mark Phases 3-6 as Done
3. Implement Phase 7 components

---

## Unresolved Questions

None - all requirements clarified.
