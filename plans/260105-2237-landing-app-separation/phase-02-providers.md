# Phase 2: Provider Separation

**Status:** Complete
**Estimated Changes:** 4 files

---

## Objective

Separate wallet providers so marketing pages don't load wallet code.

---

## Tasks

### 2.1 Strip Root Layout

Update `app/layout.tsx` - remove Providers wrapper:

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Arc Invoice',
  description: 'Payment link generator with escrow protection on Arc blockchain',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### 2.2 Move Providers to App Group

Move `app/providers.tsx` → `app/(app)/providers.tsx`

### 2.3 Update App Layout

Update `app/(app)/layout.tsx` to import providers and wrap content:

```tsx
'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Providers } from './providers';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useSession } from '@/hooks/useSession';
import { useSIWE } from '@/hooks/useSIWE';
import { MobileNav } from '@/components/layout/MobileNav';
import { toast } from 'sonner';

function AuthContent({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading: sessionLoading, refresh } = useSession();
  const { signIn, signOut, isLoading: siweLoading } = useSIWE();

  // Auto sign-in when wallet is connected but not authenticated
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !sessionLoading && !siweLoading) {
      signIn()
        .then(() => {
          refresh();
          toast.success('Signed in successfully');
        })
        .catch((err) => {
          toast.error(err.message || 'Sign in failed');
        });
    }
  }, [isConnected, address, isAuthenticated, sessionLoading, siweLoading, signIn, refresh]);

  // Sign out when wallet disconnects
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      signOut().then(() => refresh());
    }
  }, [isConnected, isAuthenticated, signOut, refresh]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Arc Invoice</h1>
        <p className="text-muted-foreground">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  if (siweLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-pulse text-muted-foreground">Signing in...</div>
        <p className="text-sm text-muted-foreground">
          Please sign the message in your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileNav>{children}</MobileNav>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AuthContent>{children}</AuthContent>
    </Providers>
  );
}
```

### 2.4 Create Pay Page Providers Wrapper

Create `app/pay/[code]/layout.tsx`:

```tsx
import { Providers } from '@/app/(app)/providers';

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
```

**Note:** Pay pages need wallet for payment but NOT full auth.

---

## File Changes Summary

| Action | File |
|--------|------|
| Modify | `app/layout.tsx` - Remove Providers import/wrapper |
| Move | `app/providers.tsx` → `app/(app)/providers.tsx` |
| Modify | `app/(app)/layout.tsx` - Add Providers wrapper + auth logic |
| Create | `app/pay/[code]/layout.tsx` - Minimal providers |

---

## Verification

```bash
# Type check
npm run build

# Test marketing page (should load without wallet prompt)
# Test dashboard (should require wallet)
# Test pay page (should allow wallet connect for payment)
```
