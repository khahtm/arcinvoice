# Phase E: Analytics

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase D](./phase-D-notifications.md)

## Overview

- **Priority:** P2
- **Status:** Planned
- **Effort:** 1 week

Build analytics dashboard with revenue insights and export functionality.

## Requirements

### Functional
- Revenue dashboard with charts
- Monthly/weekly breakdown
- Client breakdown
- Invoice status distribution
- CSV export for accounting
- Date range filtering

### Non-Functional
- Fast queries (< 1s)
- Real-time updates optional
- Mobile-friendly charts

## Analytics Metrics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Total Revenue | Sum of released invoices | SUM(amount) WHERE status = 'released' |
| Pending Revenue | Sum of funded but not released | SUM(amount) WHERE status = 'funded' |
| Monthly Revenue | Revenue per month | GROUP BY month |
| Average Invoice | Average invoice size | AVG(amount) |
| Escrow Ratio | % using escrow | COUNT(escrow) / COUNT(*) |
| Client Count | Unique clients | COUNT(DISTINCT client_email) |
| Fee Revenue | Collected fees | SUM(fee_amount) |

## Database Views

```sql
-- Monthly revenue view
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
  date_trunc('month', created_at) AS month,
  creator_wallet,
  COUNT(*) AS invoice_count,
  SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN status = 'funded' THEN amount ELSE 0 END) AS pending,
  SUM(CASE WHEN status IN ('pending', 'draft') THEN amount ELSE 0 END) AS unpaid,
  SUM(fee_amount) AS fees_paid
FROM invoices
GROUP BY date_trunc('month', created_at), creator_wallet;

-- Client breakdown view
CREATE OR REPLACE VIEW client_stats AS
SELECT
  creator_wallet,
  COALESCE(client_email, client_name, 'Anonymous') AS client,
  COUNT(*) AS invoice_count,
  SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) AS total_paid,
  MAX(created_at) AS last_invoice
FROM invoices
GROUP BY creator_wallet, COALESCE(client_email, client_name, 'Anonymous');

-- Invoice status distribution
CREATE OR REPLACE VIEW status_distribution AS
SELECT
  creator_wallet,
  status,
  payment_type,
  COUNT(*) AS count,
  SUM(amount) AS total_amount
FROM invoices
GROUP BY creator_wallet, status, payment_type;
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/api/analytics/route.ts` | Create | GET dashboard data |
| `app/api/analytics/export/route.ts` | Create | GET CSV export |
| `app/(auth)/analytics/page.tsx` | Create | Analytics page |
| `hooks/useAnalytics.ts` | Create | Fetch analytics |
| `components/analytics/RevenueChart.tsx` | Create | Monthly chart |
| `components/analytics/StatCards.tsx` | Create | Key metrics |
| `components/analytics/ClientBreakdown.tsx` | Create | Client table |
| `components/analytics/StatusDistribution.tsx` | Create | Status pie chart |
| `components/analytics/ExportButton.tsx` | Create | CSV download |
| `components/analytics/DateRangeFilter.tsx` | Create | Date picker |
| `components/layout/Sidebar.tsx` | Modify | Add Analytics link |

## Implementation Steps

### Step 1: Database Views (0.25 days)

Run migration to create analytics views.

### Step 2: Analytics API (0.5 days)

Create `app/api/analytics/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start');
  const endDate = url.searchParams.get('end');

  const supabase = await createClient();

  // Build date filter
  let dateFilter = '';
  const params: Record<string, string> = { wallet: walletAddress };

  if (startDate) {
    dateFilter += ' AND created_at >= :start';
    params.start = startDate;
  }
  if (endDate) {
    dateFilter += ' AND created_at <= :end';
    params.end = endDate;
  }

  // Summary stats
  const { data: summary } = await supabase
    .from('invoices')
    .select('id, amount, status, payment_type, fee_amount, client_email')
    .eq('creator_wallet', walletAddress);

  const stats = {
    totalInvoices: summary?.length || 0,
    totalRevenue: summary?.filter(i => i.status === 'released').reduce((s, i) => s + i.amount, 0) || 0,
    pendingRevenue: summary?.filter(i => i.status === 'funded').reduce((s, i) => s + i.amount, 0) || 0,
    unpaidAmount: summary?.filter(i => ['pending', 'draft'].includes(i.status)).reduce((s, i) => s + i.amount, 0) || 0,
    escrowCount: summary?.filter(i => i.payment_type === 'escrow').length || 0,
    directCount: summary?.filter(i => i.payment_type === 'direct').length || 0,
    feesPaid: summary?.reduce((s, i) => s + (i.fee_amount || 0), 0) || 0,
    uniqueClients: new Set(summary?.map(i => i.client_email).filter(Boolean)).size,
  };

  // Monthly breakdown
  const { data: monthly } = await supabase
    .from('invoices')
    .select('created_at, amount, status')
    .eq('creator_wallet', walletAddress)
    .eq('status', 'released')
    .order('created_at');

  const monthlyData = monthly?.reduce((acc, inv) => {
    const month = new Date(inv.created_at).toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + inv.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  // Client breakdown
  const { data: clients } = await supabase
    .from('invoices')
    .select('client_email, client_name, amount, status')
    .eq('creator_wallet', walletAddress)
    .eq('status', 'released');

  const clientData = clients?.reduce((acc, inv) => {
    const client = inv.client_email || inv.client_name || 'Anonymous';
    if (!acc[client]) {
      acc[client] = { invoiceCount: 0, totalPaid: 0 };
    }
    acc[client].invoiceCount++;
    acc[client].totalPaid += inv.amount;
    return acc;
  }, {} as Record<string, { invoiceCount: number; totalPaid: number }>) || {};

  // Status distribution
  const statusData = summary?.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return Response.json({
    stats,
    monthly: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
    clients: Object.entries(clientData)
      .map(([client, data]) => ({ client, ...data }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10),
    statusDistribution: Object.entries(statusData).map(([status, count]) => ({ status, count })),
  });
}
```

Create `app/api/analytics/export/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start');
  const endDate = url.searchParams.get('end');

  const supabase = await createClient();

  let query = supabase
    .from('invoices')
    .select('short_code, amount, description, payment_type, status, client_name, client_email, fee_amount, created_at, funded_at')
    .eq('creator_wallet', walletAddress)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const headers = [
    'Invoice Code',
    'Amount (USDC)',
    'Description',
    'Payment Type',
    'Status',
    'Client Name',
    'Client Email',
    'Fee (USDC)',
    'Created',
    'Paid',
  ];

  const rows = invoices?.map((inv) => [
    inv.short_code,
    (inv.amount / 1_000_000).toFixed(2),
    `"${(inv.description || '').replace(/"/g, '""')}"`,
    inv.payment_type,
    inv.status,
    inv.client_name || '',
    inv.client_email || '',
    ((inv.fee_amount || 0) / 1_000_000).toFixed(2),
    new Date(inv.created_at).toISOString().split('T')[0],
    inv.funded_at ? new Date(inv.funded_at).toISOString().split('T')[0] : '',
  ]) || [];

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="arc-invoice-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
```

### Step 3: Analytics Hook (0.25 days)

Create `hooks/useAnalytics.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
  unpaidAmount: number;
  escrowCount: number;
  directCount: number;
  feesPaid: number;
  uniqueClients: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface ClientData {
  client: string;
  invoiceCount: number;
  totalPaid: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface AnalyticsData {
  stats: AnalyticsStats;
  monthly: MonthlyData[];
  clients: ClientData[];
  statusDistribution: StatusData[];
}

export function useAnalytics(startDate?: string, endDate?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);

      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportCSV = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);

    const res = await fetch(`/api/analytics/export?${params}`);
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc-invoice-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
    exportCSV,
  };
}
```

### Step 4: UI Components (2.5 days)

Create `app/(auth)/analytics/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatCards } from '@/components/analytics/StatCards';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { ClientBreakdown } from '@/components/analytics/ClientBreakdown';
import { StatusDistribution } from '@/components/analytics/StatusDistribution';
import { ExportButton } from '@/components/analytics/ExportButton';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();

  const { data, isLoading, exportCSV } = useAnalytics(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          <ExportButton onClick={exportCSV} />
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : data ? (
        <>
          <StatCards stats={data.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={data.monthly} />
            <StatusDistribution data={data.statusDistribution} />
          </div>

          <ClientBreakdown clients={data.clients} />
        </>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
```

Create `components/analytics/StatCards.tsx`:

```typescript
import { StatCard } from '@/components/common/StatCard';
import { formatUSDC } from '@/lib/utils';
import { DollarSign, Clock, Users, Percent } from 'lucide-react';

interface StatCardsProps {
  stats: {
    totalRevenue: number;
    pendingRevenue: number;
    unpaidAmount: number;
    uniqueClients: number;
    escrowCount: number;
    directCount: number;
    totalInvoices: number;
  };
}

export function StatCards({ stats }: StatCardsProps) {
  const escrowRatio = stats.totalInvoices > 0
    ? Math.round((stats.escrowCount / stats.totalInvoices) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Revenue"
        value={formatUSDC(stats.totalRevenue)}
        icon={DollarSign}
      />
      <StatCard
        title="Pending"
        value={formatUSDC(stats.pendingRevenue)}
        description="In escrow"
        icon={Clock}
      />
      <StatCard
        title="Clients"
        value={stats.uniqueClients}
        icon={Users}
      />
      <StatCard
        title="Escrow Usage"
        value={`${escrowRatio}%`}
        description={`${stats.escrowCount}/${stats.totalInvoices} invoices`}
        icon={Percent}
      />
    </div>
  );
}
```

Create `components/analytics/RevenueChart.tsx`:

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { formatUSDC } from '@/lib/utils';

interface RevenueChartProps {
  data: Array<{ month: string; amount: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Monthly Revenue</h3>
        <p className="text-muted-foreground">No revenue data yet</p>
      </Card>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Monthly Revenue</h3>

      <div className="space-y-3">
        {data.slice(-6).map((item) => (
          <div key={item.month} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">
              {item.month}
            </span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(item.amount / maxAmount) * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono w-24 text-right">
              {formatUSDC(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

Create `components/analytics/ClientBreakdown.tsx`:

```typescript
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatUSDC } from '@/lib/utils';

interface ClientBreakdownProps {
  clients: Array<{
    client: string;
    invoiceCount: number;
    totalPaid: number;
  }>;
}

export function ClientBreakdown({ clients }: ClientBreakdownProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Clients</h3>

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No client data yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.client}>
                <TableCell>{client.client}</TableCell>
                <TableCell className="text-right">{client.invoiceCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatUSDC(client.totalPaid)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
```

Create `components/analytics/ExportButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
}

export function ExportButton({ onClick }: ExportButtonProps) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
```

### Step 5: Update Sidebar (0.25 days)

Add Analytics link to Sidebar navigation:

```typescript
// In components/layout/Sidebar.tsx
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },  // Add this
  { href: '/settings', label: 'Settings', icon: Settings },
];
```

## Todo List

- [ ] Run database migration for views
- [ ] Create analytics GET API
- [ ] Create export GET API
- [ ] Create useAnalytics hook
- [ ] Create analytics page
- [ ] Create StatCards component
- [ ] Create RevenueChart component
- [ ] Create ClientBreakdown component
- [ ] Create StatusDistribution component
- [ ] Create ExportButton component
- [ ] Create DateRangeFilter component
- [ ] Add Analytics to Sidebar
- [ ] Test CSV export
- [ ] Test date filtering

## Success Criteria

- [ ] Dashboard loads < 1s
- [ ] All metrics calculate correctly
- [ ] Monthly chart displays properly
- [ ] CSV export works
- [ ] Date filtering works
- [ ] Mobile responsive

## Next Steps

After completion, proceed to Phase F: Kleros Integration
