# Phase 3: Invoice Creation & Management

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase 2](./phase-02-database-auth.md)

## Overview

- **Priority:** P1 - Critical Path
- **Status:** Pending
- **Effort:** 2 days

Implement invoice creation form, API endpoints, and invoice listing.

## Requirements

### Functional
- Invoice creation form with validation
- Payment type selection (direct/escrow)
- Payment link generation
- Invoice list view
- Invoice detail view

### Non-Functional
- Form validation with Zod
- Optimistic updates
- Responsive design

## Files to Create

| File | Purpose |
|------|---------|
| `lib/utils.ts` | Utility functions |
| `lib/validation.ts` | Zod schemas |
| `components/invoice/InvoiceForm.tsx` | Creation form |
| `components/invoice/InvoiceCard.tsx` | Invoice card |
| `components/invoice/InvoiceList.tsx` | Invoice list |
| `components/invoice/PaymentTypeSelector.tsx` | Payment type selector |
| `app/api/invoices/route.ts` | List/Create API |
| `app/api/invoices/[id]/route.ts` | Get/Update API |
| `app/(auth)/invoices/page.tsx` | Invoice list page |
| `app/(auth)/invoices/new/page.tsx` | Create invoice page |
| `app/(auth)/invoices/[id]/page.tsx` | Invoice detail page |
| `hooks/useInvoices.ts` | Invoice data hook |

## Implementation Steps

### Step 1: Create Utility Functions

Create `lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateShortCode(): string {
  return nanoid(8).toUpperCase();
}

export function formatUSDC(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getPaymentUrl(shortCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/${shortCode}`;
}
```

### Step 2: Create Validation Schemas

Create `lib/validation.ts`:

```typescript
import { z } from 'zod';

export const invoiceSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(500),
  payment_type: z.enum(['direct', 'escrow']),
  client_name: z.string().max(255).optional().nullable(),
  client_email: z.string().email().optional().nullable().or(z.literal('')),
  auto_release_days: z.number().min(1).max(90).default(14),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
```

### Step 3: Create Invoice API Routes

Create `app/api/invoices/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateShortCode } from '@/lib/utils';
import { invoiceSchema } from '@/lib/validation';

export async function GET() {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('creator_wallet', walletAddress)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ invoices: data });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = invoiceSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        ...validatedData,
        short_code: generateShortCode(),
        creator_wallet: walletAddress,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ invoice: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
```

Create `app/api/invoices/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  return Response.json({ invoice: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = await createClient();

  // Verify ownership
  const { data: existing } = await supabase
    .from('invoices')
    .select('creator_wallet')
    .eq('id', params.id)
    .single();

  if (existing?.creator_wallet !== walletAddress) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ invoice: data });
}
```

### Step 4: Create Invoices Hook

Create `hooks/useInvoices.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Invoice, InvoiceInsert } from '@/types/database';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (data: InvoiceInsert) => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (res.ok) {
      setInvoices((prev) => [result.invoice, ...prev]);
      return result.invoice;
    }
    throw new Error(result.error);
  };

  return { invoices, isLoading, error, createInvoice, refetch: fetchInvoices };
}
```

### Step 5: Create Payment Type Selector

Create `components/invoice/PaymentTypeSelector.tsx`:

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PaymentTypeSelectorProps {
  value: 'direct' | 'escrow';
  onChange: (value: 'direct' | 'escrow') => void;
}

export function PaymentTypeSelector({ value, onChange }: PaymentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card
        className={cn(
          'p-4 cursor-pointer border-2 transition-colors',
          value === 'direct' ? 'border-primary' : 'border-transparent hover:border-muted'
        )}
        onClick={() => onChange('direct')}
      >
        <h3 className="font-semibold">Direct Payment</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Instant wallet-to-wallet transfer
        </p>
      </Card>

      <Card
        className={cn(
          'p-4 cursor-pointer border-2 transition-colors',
          value === 'escrow' ? 'border-primary' : 'border-transparent hover:border-muted'
        )}
        onClick={() => onChange('escrow')}
      >
        <h3 className="font-semibold">Escrow Payment</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Funds held until you approve
        </p>
      </Card>
    </div>
  );
}
```

### Step 6: Create Invoice Form

Create `components/invoice/InvoiceForm.tsx`:

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PaymentTypeSelector } from './PaymentTypeSelector';
import { invoiceSchema, type InvoiceFormData } from '@/lib/validation';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  isLoading?: boolean;
}

export function InvoiceForm({ onSubmit, isLoading }: InvoiceFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      payment_type: 'direct',
      auto_release_days: 14,
    },
  });

  const paymentType = watch('payment_type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label>Payment Type</Label>
        <PaymentTypeSelector
          value={paymentType}
          onChange={(val) => setValue('payment_type', val)}
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (USDC)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What is this payment for?"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_name">Client Name (optional)</Label>
          <Input id="client_name" {...register('client_name')} />
        </div>
        <div>
          <Label htmlFor="client_email">Client Email (optional)</Label>
          <Input id="client_email" type="email" {...register('client_email')} />
        </div>
      </div>

      {paymentType === 'escrow' && (
        <div>
          <Label htmlFor="auto_release_days">Auto-release after (days)</Label>
          <Input
            id="auto_release_days"
            type="number"
            min="1"
            max="90"
            {...register('auto_release_days', { valueAsNumber: true })}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Funds auto-release if no dispute is raised
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Invoice'}
      </Button>
    </form>
  );
}
```

### Step 7: Create Invoice Card

Create `components/invoice/InvoiceCard.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatUSDC, getPaymentUrl, truncateAddress } from '@/lib/utils';
import type { Invoice } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  funded: 'bg-blue-500',
  released: 'bg-green-500',
  refunded: 'bg-red-500',
};

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  return (
    <Link href={`/invoices/${invoice.id}`}>
      <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {invoice.short_code}
            </p>
            <p className="font-semibold mt-1">{formatUSDC(invoice.amount)}</p>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {invoice.description}
            </p>
          </div>
          <div className="text-right">
            <Badge className={statusColors[invoice.status]}>
              {invoice.status}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {invoice.payment_type}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

### Step 8: Create Invoice List Page

Create `app/(auth)/invoices/page.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InvoiceCard } from '@/components/invoice/InvoiceCard';
import { useInvoices } from '@/hooks/useInvoices';
import { Plus } from 'lucide-react';

export default function InvoicesPage() {
  const { invoices, isLoading } = useInvoices();

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link href="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices yet</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 9: Create New Invoice Page

Create `app/(auth)/invoices/new/page.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { useInvoices } from '@/hooks/useInvoices';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import type { InvoiceFormData } from '@/lib/validation';

export default function NewInvoicePage() {
  const router = useRouter();
  const { createInvoice } = useInvoices();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: InvoiceFormData) => {
    setIsLoading(true);
    try {
      const invoice = await createInvoice(data);
      toast({
        title: 'Invoice created',
        description: `Payment link: ${invoice.short_code}`,
      });
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-xl py-8">
      <h1 className="text-2xl font-bold mb-6">Create Invoice</h1>
      <InvoiceForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
```

## Todo List

- [ ] Create utility functions
- [ ] Create validation schemas
- [ ] Implement invoice list API
- [ ] Implement invoice create API
- [ ] Implement invoice get/update API
- [ ] Create useInvoices hook
- [ ] Create PaymentTypeSelector
- [ ] Create InvoiceForm
- [ ] Create InvoiceCard
- [ ] Create invoice list page
- [ ] Create new invoice page
- [ ] Create invoice detail page
- [ ] Test full creation flow

## Success Criteria

- [ ] Invoice form validates correctly
- [ ] Payment type selection works
- [ ] Invoice saves to database
- [ ] Short code generated
- [ ] Invoice list displays
- [ ] Invoice detail view works

## Next Steps

After completion, proceed to Phase 4: Public Payment Page
