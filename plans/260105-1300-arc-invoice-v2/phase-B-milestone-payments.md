# Phase B: Milestone Payments

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase A](./phase-A-transaction-fees.md)

## Overview

- **Priority:** P1
- **Status:** Planned
- **Effort:** 1.5 weeks

Enable splitting invoices into multiple milestones with individual approval and release.

## Requirements

### Functional
- Create invoices with 1-10 milestones
- Each milestone has amount + description
- Payer approves milestones individually
- Creator releases approved milestones
- Auto-release all milestones after deadline
- Fee calculated per milestone

### Non-Functional
- Gas-efficient milestone storage
- Clear UI for milestone management
- Status tracking per milestone

## User Flow

### Creator Creates Invoice

```
1. Select "Escrow" payment type
2. Toggle "Enable milestones"
3. Add milestones:
   - Milestone 1: Design ($3,000)
   - Milestone 2: Development ($5,000)
   - Milestone 3: Launch ($2,000)
4. Set auto-release days (14)
5. Create invoice → Deploy escrow contract
```

### Payer Funds and Approves

```
1. Open payment link
2. See milestone breakdown
3. Deposit total amount + fee
4. Work progresses...
5. Approve Milestone 1 when satisfied
6. Creator releases Milestone 1
7. Repeat for remaining milestones
```

## Database Schema

```sql
-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released')),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invoice_id, order_index)
);

-- RLS policies
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their invoices"
    ON milestones FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE creator_wallet = current_setting('request.jwt.claims')::json->>'wallet_address'
        )
    );

CREATE POLICY "Public can view milestones for payment"
    ON milestones FOR SELECT
    USING (true);

CREATE POLICY "Creators can insert milestones"
    ON milestones FOR INSERT
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE creator_wallet = current_setting('request.jwt.claims')::json->>'wallet_address'
        )
    );

-- Index for fast lookup
CREATE INDEX idx_milestones_invoice_id ON milestones(invoice_id);
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `types/database.ts` | Modify | Add Milestone types |
| `lib/validation.ts` | Modify | Add milestone validation |
| `app/api/invoices/route.ts` | Modify | Create invoice with milestones |
| `app/api/invoices/[id]/milestones/route.ts` | Create | GET milestones |
| `app/api/invoices/[id]/milestones/[milestoneId]/route.ts` | Create | PATCH milestone status |
| `hooks/useMilestones.ts` | Create | Fetch/manage milestones |
| `hooks/useMilestoneEscrow.ts` | Create | Interact with v2 contract |
| `components/invoice/MilestoneInput.tsx` | Create | Add milestones in form |
| `components/invoice/MilestoneList.tsx` | Create | Display milestones |
| `components/escrow/MilestoneStatus.tsx` | Create | Show milestone states |
| `components/escrow/ApproveMilestoneButton.tsx` | Create | Payer approves |
| `components/escrow/ReleaseMilestoneButton.tsx` | Create | Creator releases |

## Implementation Steps

### Step 1: Database Migration (0.5 days)

Run Supabase migration:

```sql
-- Create milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released')),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invoice_id, order_index)
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones_select_all" ON milestones FOR SELECT USING (true);

CREATE POLICY "milestones_insert_creator" ON milestones FOR INSERT
WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE creator_wallet = (
        SELECT current_setting('request.jwt.claims', true)::json->>'wallet_address'
    ))
);

CREATE POLICY "milestones_update_status" ON milestones FOR UPDATE
USING (true);

CREATE INDEX idx_milestones_invoice_id ON milestones(invoice_id);
```

### Step 2: Types & Validation (0.5 days)

Update `types/database.ts`:

```typescript
export type MilestoneStatus = 'pending' | 'approved' | 'released';

export interface Milestone {
  id: string;
  invoice_id: string;
  order_index: number;
  amount: number;
  description: string;
  status: MilestoneStatus;
  released_at: string | null;
  created_at: string;
}

export interface MilestoneInput {
  amount: number;
  description: string;
}

export interface CreateInvoiceInput {
  amount: number;
  description: string;
  client_name?: string;
  client_email?: string;
  payment_type: PaymentType;
  auto_release_days?: number;
  milestones?: MilestoneInput[]; // New
}
```

Update `lib/validation.ts`:

```typescript
export const milestoneSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description required').max(200),
});

export const invoiceSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description required').max(1000),
  client_name: z.string().max(100).optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  payment_type: z.enum(['direct', 'escrow']),
  auto_release_days: z.number().min(1).max(90).optional(),
  milestones: z.array(milestoneSchema).max(10).optional(),
}).refine((data) => {
  // If milestones provided, sum must equal amount
  if (data.milestones && data.milestones.length > 0) {
    const sum = data.milestones.reduce((acc, m) => acc + m.amount, 0);
    return sum === data.amount;
  }
  return true;
}, { message: 'Milestone amounts must equal invoice total' });
```

### Step 3: API Routes (1 day)

Update `app/api/invoices/route.ts` POST handler:

```typescript
export async function POST(req: Request) {
  // ... existing auth code ...

  try {
    const body = await req.json();
    const validatedData = invoiceSchema.parse(body);

    const supabase = await createClient();

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...validatedData,
        milestones: undefined, // Don't store in invoice
        short_code: generateShortCode(),
        creator_wallet: walletAddress,
        status: 'pending',
        contract_version: validatedData.milestones?.length ? 2 : 1,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create milestones if provided
    if (validatedData.milestones?.length) {
      const milestonesWithInvoiceId = validatedData.milestones.map((m, i) => ({
        invoice_id: invoice.id,
        order_index: i,
        amount: m.amount,
        description: m.description,
        status: 'pending',
      }));

      const { error: milestonesError } = await supabase
        .from('milestones')
        .insert(milestonesWithInvoiceId);

      if (milestonesError) throw milestonesError;
    }

    return Response.json({ invoice }, { status: 201 });
  } catch (error) {
    // ... error handling ...
  }
}
```

Create `app/api/invoices/[id]/milestones/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('invoice_id', id)
    .order('order_index');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ milestones: data });
}
```

Create `app/api/invoices/[id]/milestones/[milestoneId]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const { id, milestoneId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body;

  if (!['approved', 'released'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = await createClient();

  // Update milestone
  const updateData: Record<string, unknown> = { status };
  if (status === 'released') {
    updateData.released_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('milestones')
    .update(updateData)
    .eq('id', milestoneId)
    .eq('invoice_id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ milestone: data });
}
```

### Step 4: React Hooks (1 day)

Create `hooks/useMilestones.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Milestone } from '@/types/database';

export function useMilestones(invoiceId: string) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/invoices/${invoiceId}/milestones`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      setMilestones(data.milestones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const updateMilestoneStatus = async (
    milestoneId: string,
    status: 'approved' | 'released'
  ) => {
    const res = await fetch(
      `/api/invoices/${invoiceId}/milestones/${milestoneId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    await fetchMilestones();
  };

  return {
    milestones,
    isLoading,
    error,
    refetch: fetchMilestones,
    updateMilestoneStatus,
  };
}
```

Create `hooks/useMilestoneEscrow.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

export function useMilestoneEscrow(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approveMilestone = (index: number) => {
    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'approveMilestone',
      args: [BigInt(index)],
    });
  };

  const releaseMilestone = (index: number) => {
    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'releaseMilestone',
      args: [BigInt(index)],
    });
  };

  return {
    approveMilestone,
    releaseMilestone,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
```

### Step 5: UI Components (2 days)

Create `components/invoice/MilestoneInput.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { MilestoneInput } from '@/types/database';

interface MilestoneInputProps {
  milestones: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
  totalAmount: number;
}

export function MilestoneInputList({
  milestones,
  onChange,
  totalAmount,
}: MilestoneInputProps) {
  const addMilestone = () => {
    if (milestones.length >= 10) return;
    onChange([...milestones, { amount: 0, description: '' }]);
  };

  const removeMilestone = (index: number) => {
    onChange(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string | number) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const currentSum = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const isValid = currentSum === totalAmount;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>Milestones</Label>
        <span className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          {currentSum.toLocaleString()} / {totalAmount.toLocaleString()} USDC
        </span>
      </div>

      {milestones.map((milestone, index) => (
        <Card key={index} className="p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Milestone {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMilestone(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Input
                type="number"
                placeholder="Amount"
                value={milestone.amount || ''}
                onChange={(e) => updateMilestone(index, 'amount', Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={milestone.description}
                onChange={(e) => updateMilestone(index, 'description', e.target.value)}
              />
            </div>
          </div>
        </Card>
      ))}

      {milestones.length < 10 && (
        <Button type="button" variant="outline" onClick={addMilestone} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      )}

      {!isValid && milestones.length > 0 && (
        <p className="text-sm text-red-600">
          Milestone amounts must equal invoice total
        </p>
      )}
    </div>
  );
}
```

Create `components/escrow/MilestoneStatus.tsx`:

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { formatUSDC } from '@/lib/utils';
import type { Milestone } from '@/types/database';
import { CheckCircle, Clock, Coins } from 'lucide-react';

interface MilestoneStatusProps {
  milestones: Milestone[];
}

export function MilestoneStatus({ milestones }: MilestoneStatusProps) {
  return (
    <div className="space-y-2">
      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            {milestone.status === 'released' && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {milestone.status === 'approved' && (
              <Coins className="h-5 w-5 text-blue-600" />
            )}
            {milestone.status === 'pending' && (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}

            <div>
              <p className="font-medium">Milestone {index + 1}</p>
              <p className="text-sm text-muted-foreground">
                {milestone.description}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-mono">{formatUSDC(milestone.amount)}</p>
            <Badge
              variant={
                milestone.status === 'released'
                  ? 'default'
                  : milestone.status === 'approved'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {milestone.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
```

Create `components/escrow/ApproveMilestoneButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useMilestoneEscrow } from '@/hooks/useMilestoneEscrow';
import { useMilestones } from '@/hooks/useMilestones';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface ApproveMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  invoiceId: string;
  milestoneId: string;
  milestoneIndex: number;
}

export function ApproveMilestoneButton({
  escrowAddress,
  invoiceId,
  milestoneId,
  milestoneIndex,
}: ApproveMilestoneButtonProps) {
  const { approveMilestone, isPending, isConfirming, isSuccess, hash } =
    useMilestoneEscrow(escrowAddress);
  const { updateMilestoneStatus } = useMilestones(invoiceId);

  useEffect(() => {
    if (isSuccess && hash) {
      updateMilestoneStatus(milestoneId, 'approved')
        .then(() => toast.success('Milestone approved!'))
        .catch((err) => toast.error(err.message));
    }
  }, [isSuccess, hash, milestoneId, updateMilestoneStatus]);

  const isLoading = isPending || isConfirming;

  return (
    <Button
      onClick={() => approveMilestone(milestoneIndex)}
      disabled={isLoading}
      size="sm"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </>
      )}
    </Button>
  );
}
```

Create `components/escrow/ReleaseMilestoneButton.tsx`:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useMilestoneEscrow } from '@/hooks/useMilestoneEscrow';
import { useMilestones } from '@/hooks/useMilestones';
import { Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface ReleaseMilestoneButtonProps {
  escrowAddress: `0x${string}`;
  invoiceId: string;
  milestoneId: string;
  milestoneIndex: number;
}

export function ReleaseMilestoneButton({
  escrowAddress,
  invoiceId,
  milestoneId,
  milestoneIndex,
}: ReleaseMilestoneButtonProps) {
  const { releaseMilestone, isPending, isConfirming, isSuccess, hash } =
    useMilestoneEscrow(escrowAddress);
  const { updateMilestoneStatus } = useMilestones(invoiceId);

  useEffect(() => {
    if (isSuccess && hash) {
      updateMilestoneStatus(milestoneId, 'released')
        .then(() => toast.success('Funds released!'))
        .catch((err) => toast.error(err.message));
    }
  }, [isSuccess, hash, milestoneId, updateMilestoneStatus]);

  const isLoading = isPending || isConfirming;

  return (
    <Button
      onClick={() => releaseMilestone(milestoneIndex)}
      disabled={isLoading}
      size="sm"
      variant="secondary"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Coins className="h-4 w-4 mr-2" />
          Release
        </>
      )}
    </Button>
  );
}
```

### Step 6: Integration & Testing (1.5 days)

1. Update InvoiceForm to support milestones toggle
2. Update payment page to show milestone breakdown
3. Update invoice detail page for milestone management
4. Test create invoice with milestones
5. Test deposit with milestones
6. Test approve/release flow
7. Test auto-release after deadline

## Todo List

- [ ] Run database migration
- [ ] Update types/database.ts
- [ ] Update lib/validation.ts
- [ ] Update invoice POST API
- [ ] Create milestones GET API
- [ ] Create milestone PATCH API
- [ ] Create useMilestones hook
- [ ] Create useMilestoneEscrow hook
- [ ] Create MilestoneInputList component
- [ ] Create MilestoneStatus component
- [ ] Create ApproveMilestoneButton
- [ ] Create ReleaseMilestoneButton
- [ ] Update InvoiceForm with milestone toggle
- [ ] Update payment page for milestones
- [ ] Update invoice detail for milestone management
- [ ] Test full milestone flow on testnet

## Success Criteria

- [ ] Can create invoice with up to 10 milestones
- [ ] Milestone amounts validated to equal total
- [ ] Payer can approve individual milestones
- [ ] Creator can release approved milestones
- [ ] Fees collected per milestone release
- [ ] Auto-release works for all milestones

## Next Steps

After completion, proceed to Phase C: Dispute Resolution v1
