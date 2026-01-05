# Phase 7: Dashboard & Polish

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 6](./phase-06-escrow-integration.md)

## Overview

- **Priority:** P2
- **Status:** Done
- **Effort:** 2 days
- **Completed:** 2026-01-05

Build dashboard overview and polish user experience.

## Requirements

### Functional
- Dashboard with stats overview
- Recent invoices list
- Copy payment link functionality
- Invoice detail page improvements
- Auth layout with sidebar

### Non-Functional
- Mobile responsive
- Loading skeletons
- Consistent styling

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `app/(auth)/dashboard/page.tsx` | Dashboard page |
| `app/(auth)/layout.tsx` | Auth layout with sidebar |
| `app/(auth)/invoices/[id]/page.tsx` | Invoice detail page |
| `components/layout/Header.tsx` | Header component |
| `components/layout/Sidebar.tsx` | Sidebar navigation |
| `components/invoice/CopyLinkButton.tsx` | Copy link button |
| `components/common/StatCard.tsx` | Stats card |

## Implementation Steps

### Step 1: Create Header Component

Create `components/layout/Header.tsx`:

```typescript
'use client';

import { ConnectButton } from '@/components/wallet/ConnectButton';

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-xl font-bold">Arc Invoice</h1>
        <ConnectButton />
      </div>
    </header>
  );
}
```

### Step 2: Create Sidebar Component

Create `components/layout/Sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background min-h-screen">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Step 3: Create Auth Layout

Create `app/(auth)/layout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

### Step 4: Create StatCard Component

Create `components/common/StatCard.tsx`:

```typescript
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, description, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </Card>
  );
}
```

### Step 5: Create Dashboard Page

Create `app/(auth)/dashboard/page.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { InvoiceCard } from '@/components/invoice/InvoiceCard';
import { useInvoices } from '@/hooks/useInvoices';
import { formatUSDC } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { invoices, isLoading } = useInvoices();

  // Calculate stats
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingCount = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'draft'
  ).length;
  const paidCount = invoices.filter((inv) => inv.status === 'released').length;

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={totalInvoices} />
        <StatCard title="Total Amount" value={formatUSDC(totalAmount)} />
        <StatCard title="Pending" value={pendingCount} />
        <StatCard title="Paid" value={paidCount} />
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Invoices</h2>
          <Link href="/invoices" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : recentInvoices.length === 0 ? (
          <p className="text-muted-foreground">No invoices yet</p>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 6: Create Copy Link Button

Create `components/invoice/CopyLinkButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { getPaymentUrl } from '@/lib/utils';

interface CopyLinkButtonProps {
  shortCode: string;
}

export function CopyLinkButton({ shortCode }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = getPaymentUrl(shortCode);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </>
      )}
    </Button>
  );
}
```

### Step 7: Create Invoice Detail Page

Create `app/(auth)/invoices/[id]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyLinkButton } from '@/components/invoice/CopyLinkButton';
import { EscrowStatus } from '@/components/escrow/EscrowStatus';
import { ReleaseButton } from '@/components/escrow/ReleaseButton';
import { RefundButton } from '@/components/escrow/RefundButton';
import { formatUSDC, getPaymentUrl } from '@/lib/utils';
import type { Invoice } from '@/types/database';
import { ExternalLink } from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`)
      .then((res) => res.json())
      .then((data) => setInvoice(data.invoice))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <p>Loading...</p>;
  if (!invoice) return <p>Invoice not found</p>;

  const paymentUrl = getPaymentUrl(invoice.short_code);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">Invoice</p>
          <p className="text-2xl font-mono">{invoice.short_code}</p>
        </div>
        <Badge>{invoice.status}</Badge>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">{formatUSDC(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Type</p>
            <p className="font-semibold capitalize">{invoice.payment_type}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p>{invoice.description}</p>
        </div>

        {invoice.client_name && (
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p>{invoice.client_name}</p>
            {invoice.client_email && (
              <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">Payment Link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">
              {paymentUrl}
            </code>
            <CopyLinkButton shortCode={invoice.short_code} />
          </div>
        </div>

        {invoice.tx_hash && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Transaction</p>
            <a
              href={`https://testnet-explorer.arc.circle.com/tx/${invoice.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </Card>

      {/* Escrow Status (if applicable) */}
      {invoice.payment_type === 'escrow' && invoice.escrow_address && (
        <div className="space-y-4">
          <EscrowStatus escrowAddress={invoice.escrow_address as `0x${string}`} />

          {invoice.status === 'funded' && (
            <div className="grid grid-cols-2 gap-4">
              <RefundButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
              />
              <ReleaseButton
                escrowAddress={invoice.escrow_address as `0x${string}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Step 8: Create Settings Page

Create `app/(auth)/settings/page.tsx`:

```typescript
'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';

export default function SettingsPage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Connected Wallet</p>
          <p className="font-mono">{address ? truncateAddress(address) : '-'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Full Address</p>
          <code className="text-xs bg-muted px-2 py-1 rounded break-all">
            {address}
          </code>
        </div>

        <Button variant="destructive" onClick={() => disconnect()}>
          Disconnect Wallet
        </Button>
      </Card>
    </div>
  );
}
```

### Step 9: Update Landing Page

Update `app/page.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useEffect } from 'react';

export default function HomePage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Arc Invoice</h1>
        <p className="text-muted-foreground mb-8">
          Generate payment links with escrow protection on Arc blockchain.
          Fast, secure, trustless.
        </p>

        <ConnectButton />

        <p className="text-sm text-muted-foreground mt-4">
          Connect your Rabbit Wallet to get started
        </p>
      </div>
    </div>
  );
}
```

## Todo List

- [x] Create Header component
- [x] Create Sidebar component
- [x] Create auth layout with sidebar
- [x] Create StatCard component
- [x] Create Dashboard page with stats
- [x] Create CopyLinkButton component (already existed in invoice detail)
- [x] Create Invoice detail page (already existed)
- [x] Create Settings page
- [x] Update landing page
- [x] Test responsive design
- [x] Add loading skeletons

## Success Criteria

- [x] Dashboard shows accurate stats
- [x] Recent invoices display
- [x] Copy link works
- [x] Invoice detail shows all info
- [x] Escrow actions work from detail
- [x] Settings page functional
- [x] Mobile responsive

## Next Steps

After completion, proceed to Phase 8: Testing & Launch
