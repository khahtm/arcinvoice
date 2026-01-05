# Phase 3: Landing Page Cleanup

**Status:** Complete
**Estimated Changes:** 2 files

---

## Objective

Remove wallet dependencies from landing page and add "Launch App" button.

---

## Tasks

### 3.1 Update Landing Page

Update `app/(marketing)/page.tsx`:

**Remove:**
- `useAccount` hook
- `useRouter` for auto-redirect
- `useEffect` for wallet-based redirect
- `ConnectButton` import and usage

**Add:**
- "Launch App" button linking to dashboard
- Environment-based URL for subdomain support

```tsx
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  BarChart3,
  Users,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '/dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FF] to-white">
      {/* Header */}
      <header className="bg-[#0066FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Arc Invoice
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-white/80 hover:text-white text-sm font-medium transition"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-white/80 hover:text-white text-sm font-medium transition"
              >
                How it works
              </Link>
              <Link
                href="#pricing"
                className="text-white/80 hover:text-white text-sm font-medium transition"
              >
                Pricing
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              {/* Replace ConnectButton with Launch App */}
              <Button
                asChild
                className="bg-white text-[#0066FF] hover:bg-white/90"
              >
                <Link href={appUrl}>
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Rest of landing page content... */}
      {/* (Keep all existing sections unchanged) */}
    </div>
  );
}
```

### 3.2 Update Environment Variables

Add to `.env.example`:

```env
# =============================================================================
# App URL (for subdomain routing)
# =============================================================================
# Development: /dashboard (same domain)
# Production: https://app.arcinvoice.xyz/dashboard
NEXT_PUBLIC_APP_URL=/dashboard
```

Add to `.env.local`:

```env
NEXT_PUBLIC_APP_URL=/dashboard
```

---

## Key Changes in Landing Page

### Header Changes

**Before:**
```tsx
<div className="flex items-center gap-4">
  <ConnectButton />
</div>
```

**After:**
```tsx
<div className="flex items-center gap-4">
  <Button asChild className="bg-white text-[#0066FF] hover:bg-white/90">
    <Link href={appUrl}>
      Launch App
      <ArrowRight className="ml-2 h-4 w-4" />
    </Link>
  </Button>
</div>
```

### Remove Client Directive

**Before:**
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useEffect } from 'react';
```

**After:**
```tsx
// No 'use client' needed - can be server component
import Link from 'next/link';
```

### Remove Auto-Redirect

**Before:**
```tsx
const { isConnected } = useAccount();
const router = useRouter();

useEffect(() => {
  if (isConnected) {
    router.push('/dashboard');
  }
}, [isConnected, router]);
```

**After:**
```tsx
// No redirect logic - user clicks "Launch App" explicitly
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '/dashboard';
```

---

## File Changes Summary

| Action | File |
|--------|------|
| Modify | `app/(marketing)/page.tsx` - Remove wallet, add Launch App |
| Modify | `.env.example` - Add NEXT_PUBLIC_APP_URL |

---

## Verification

```bash
# Build (should pass with no wagmi imports in marketing)
npm run build

# Dev test
npm run dev
# Open localhost:3000 - should NOT show wallet prompt
# Click "Launch App" - should go to /dashboard
```
