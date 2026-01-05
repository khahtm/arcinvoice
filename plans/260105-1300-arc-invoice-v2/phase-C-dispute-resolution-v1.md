# Phase C: Dispute Resolution v1

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase B](./phase-B-milestone-payments.md)

## Overview

- **Priority:** P1
- **Status:** Planned
- **Effort:** 1 week

Implement mutual dispute resolution where parties can propose and accept resolutions without external arbitration.

## Requirements

### Functional
- Either party can open dispute on funded escrow
- Proposer suggests resolution: refund, release, or split
- Counter-party accepts or rejects
- Accepted resolution executes on-chain
- Evidence submission (text + file URLs)
- 7-day window for resolution

### Non-Functional
- No on-chain dispute storage (gas savings)
- Resolution requires on-chain action
- Clear dispute status in UI

## Dispute Flow

```
1. Payer/Creator opens dispute
   └── Reason: "Work not delivered as described"

2. Proposer suggests resolution
   └── Type: split (50/50)
   └── Amounts: Payer $500, Creator $500

3. Counter-party responds
   ├── Accept → Execute split on-chain
   └── Reject → Can counter-propose

4. If no resolution in 7 days
   └── Escalate option (Phase F: Kleros)
```

## Resolution Types

| Type | Description | On-chain Action |
|------|-------------|-----------------|
| `refund` | Full refund to payer | `refund()` |
| `release` | Full release to creator | `release()` or `releaseMilestone()` |
| `split` | Custom split between parties | New: `splitFunds(uint256 payerAmount)` |

## Smart Contract Changes

Add to `ArcMilestoneEscrow.sol`:

```solidity
/// @notice Split funds between payer and creator (for dispute resolution)
/// @dev Only callable by payer (who holds funds power)
function splitFunds(uint256 payerAmount) external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
    uint256 remaining = _getBalance();
    require(payerAmount <= remaining, "Exceeds balance");

    uint256 creatorAmount = remaining - payerAmount;

    state = EscrowState.RELEASED; // Mark as resolved

    if (payerAmount > 0) {
        require(usdc.transfer(payer, payerAmount), "Payer transfer failed");
    }

    if (creatorAmount > 0) {
        // Apply fee to creator portion only
        uint256 fee = feeCollector.calculateFee(creatorAmount);
        uint256 creatorNet = creatorAmount - fee;

        require(usdc.transfer(creator, creatorNet), "Creator transfer failed");
        require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
        feeCollector.recordFee(fee);
    }

    emit FundsSplit(payerAmount, creatorAmount);
}

event FundsSplit(uint256 payerAmount, uint256 creatorAmount);
```

## Database Schema

```sql
-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    opened_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'resolved', 'escalated', 'expired')),
    resolution_type TEXT CHECK (resolution_type IN ('refund', 'release', 'split')),
    resolution_payer_amount BIGINT,
    resolution_creator_amount BIGINT,
    proposed_by TEXT,
    proposed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table
CREATE TABLE dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by TEXT NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_disputes_invoice_id ON disputes(invoice_id);
CREATE INDEX idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_select_all" ON disputes FOR SELECT USING (true);
CREATE POLICY "disputes_insert_parties" ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "disputes_update_parties" ON disputes FOR UPDATE USING (true);

CREATE POLICY "evidence_select_all" ON dispute_evidence FOR SELECT USING (true);
CREATE POLICY "evidence_insert_parties" ON dispute_evidence FOR INSERT WITH CHECK (true);
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `contracts/v2/ArcMilestoneEscrow.sol` | Modify | Add splitFunds() |
| `types/database.ts` | Modify | Add Dispute types |
| `app/api/invoices/[id]/disputes/route.ts` | Create | GET, POST disputes |
| `app/api/invoices/[id]/disputes/[disputeId]/route.ts` | Create | PATCH dispute |
| `app/api/invoices/[id]/disputes/[disputeId]/evidence/route.ts` | Create | POST evidence |
| `hooks/useDispute.ts` | Create | Dispute management |
| `hooks/useSplitFunds.ts` | Create | Split funds on-chain |
| `components/dispute/OpenDisputeButton.tsx` | Create | Open dispute |
| `components/dispute/DisputePanel.tsx` | Create | Dispute view |
| `components/dispute/ProposeResolutionForm.tsx` | Create | Propose resolution |
| `components/dispute/EvidenceSubmit.tsx` | Create | Add evidence |
| `components/dispute/AcceptRejectButtons.tsx` | Create | Accept/reject |

## Implementation Steps

### Step 1: Contract Update (0.5 days)

Add `splitFunds` function to escrow contract:

```solidity
// In ArcMilestoneEscrow.sol

event FundsSplit(uint256 payerAmount, uint256 creatorAmount);

/// @notice Split funds for dispute resolution
function splitFunds(uint256 payerAmount) external onlyPayer inState(EscrowState.FUNDED) nonReentrant {
    uint256 remaining = _getBalance();
    require(payerAmount <= remaining, "Exceeds balance");

    uint256 creatorAmount = remaining - payerAmount;
    state = EscrowState.RELEASED;

    if (payerAmount > 0) {
        require(usdc.transfer(payer, payerAmount), "Payer transfer failed");
    }

    if (creatorAmount > 0) {
        uint256 fee = feeCollector.calculateFee(creatorAmount);
        uint256 creatorNet = creatorAmount - fee;

        require(usdc.transfer(creator, creatorNet), "Creator transfer failed");
        if (fee > 0) {
            require(usdc.transfer(address(feeCollector), fee), "Fee transfer failed");
            feeCollector.recordFee(fee);
        }
    }

    emit FundsSplit(payerAmount, creatorAmount);
}
```

### Step 2: Database Migration (0.5 days)

Run migration for disputes tables.

### Step 3: Types (0.25 days)

Update `types/database.ts`:

```typescript
export type DisputeStatus = 'open' | 'proposed' | 'resolved' | 'escalated' | 'expired';
export type ResolutionType = 'refund' | 'release' | 'split';

export interface Dispute {
  id: string;
  invoice_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_type: ResolutionType | null;
  resolution_payer_amount: number | null;
  resolution_creator_amount: number | null;
  proposed_by: string | null;
  proposed_at: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  content: string;
  file_url: string | null;
  created_at: string;
}

export interface ProposeResolutionInput {
  resolution_type: ResolutionType;
  payer_amount?: number;
  creator_amount?: number;
}
```

### Step 4: API Routes (1 day)

Create `app/api/invoices/[id]/disputes/route.ts`:

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
    .from('disputes')
    .select('*, evidence:dispute_evidence(*)')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ dispute: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { reason } = body;

  if (!reason || reason.length < 10) {
    return Response.json({ error: 'Reason must be at least 10 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  // Check invoice is funded
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single();

  if (invoice?.status !== 'funded') {
    return Response.json({ error: 'Can only dispute funded invoices' }, { status: 400 });
  }

  // Check no existing open dispute
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('invoice_id', id)
    .in('status', ['open', 'proposed'])
    .limit(1);

  if (existing && existing.length > 0) {
    return Response.json({ error: 'Dispute already exists' }, { status: 400 });
  }

  // Create dispute with 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      invoice_id: id,
      opened_by: walletAddress,
      reason,
      status: 'open',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ dispute: data }, { status: 201 });
}
```

Create `app/api/invoices/[id]/disputes/[disputeId]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { id, disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, resolution_type, payer_amount, creator_amount } = body;

  const supabase = await createClient();

  if (action === 'propose') {
    // Propose resolution
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'proposed',
        resolution_type,
        resolution_payer_amount: payer_amount ?? 0,
        resolution_creator_amount: creator_amount ?? 0,
        proposed_by: walletAddress,
        proposed_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ dispute: data });
  }

  if (action === 'accept') {
    // Mark as resolved (on-chain action handled by frontend)
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'released' }) // Or refunded based on resolution
      .eq('id', id);

    return Response.json({ dispute: data });
  }

  if (action === 'reject') {
    // Reset to open for counter-proposal
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'open',
        resolution_type: null,
        resolution_payer_amount: null,
        resolution_creator_amount: null,
        proposed_by: null,
        proposed_at: null,
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ dispute: data });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
```

Create `app/api/invoices/[id]/disputes/[disputeId]/evidence/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { content, file_url } = body;

  if (!content || content.length < 10) {
    return Response.json({ error: 'Content must be at least 10 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dispute_evidence')
    .insert({
      dispute_id: disputeId,
      submitted_by: walletAddress,
      content,
      file_url,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ evidence: data }, { status: 201 });
}
```

### Step 5: React Hooks (0.5 days)

Create `hooks/useDispute.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Dispute, DisputeEvidence } from '@/types/database';

interface DisputeWithEvidence extends Dispute {
  evidence: DisputeEvidence[];
}

export function useDispute(invoiceId: string) {
  const [dispute, setDispute] = useState<DisputeWithEvidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDispute = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/disputes`);
      const data = await res.json();
      setDispute(data.dispute);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  const openDispute = async (reason: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) throw new Error((await res.json()).error);
    await fetchDispute();
  };

  const proposeResolution = async (
    disputeId: string,
    resolution_type: string,
    payer_amount?: number,
    creator_amount?: number
  ) => {
    const res = await fetch(`/api/invoices/${invoiceId}/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'propose',
        resolution_type,
        payer_amount,
        creator_amount,
      }),
    });

    if (!res.ok) throw new Error((await res.json()).error);
    await fetchDispute();
  };

  const acceptResolution = async (disputeId: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });

    if (!res.ok) throw new Error((await res.json()).error);
    await fetchDispute();
  };

  const rejectResolution = async (disputeId: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });

    if (!res.ok) throw new Error((await res.json()).error);
    await fetchDispute();
  };

  const submitEvidence = async (disputeId: string, content: string, file_url?: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/disputes/${disputeId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, file_url }),
    });

    if (!res.ok) throw new Error((await res.json()).error);
    await fetchDispute();
  };

  return {
    dispute,
    isLoading,
    refetch: fetchDispute,
    openDispute,
    proposeResolution,
    acceptResolution,
    rejectResolution,
    submitEvidence,
  };
}
```

Create `hooks/useSplitFunds.ts`:

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abi';

export function useSplitFunds(escrowAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const splitFunds = (payerAmount: bigint) => {
    writeContract({
      address: escrowAddress,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'splitFunds',
      args: [payerAmount],
    });
  };

  return {
    splitFunds,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}
```

### Step 6: UI Components (2 days)

Create `components/dispute/DisputePanel.tsx`:

```typescript
'use client';

import { useDispute } from '@/hooks/useDispute';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OpenDisputeButton } from './OpenDisputeButton';
import { ProposeResolutionForm } from './ProposeResolutionForm';
import { AcceptRejectButtons } from './AcceptRejectButtons';
import { EvidenceList } from './EvidenceList';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { useAccount } from 'wagmi';

interface DisputePanelProps {
  invoiceId: string;
  invoiceAmount: number;
  escrowAddress: `0x${string}`;
  creatorWallet: string;
}

export function DisputePanel({
  invoiceId,
  invoiceAmount,
  escrowAddress,
  creatorWallet,
}: DisputePanelProps) {
  const { address } = useAccount();
  const { dispute, isLoading, openDispute, proposeResolution, acceptResolution, rejectResolution, submitEvidence } = useDispute(invoiceId);

  const isPayer = address && address.toLowerCase() !== creatorWallet.toLowerCase();
  const isCreator = address?.toLowerCase() === creatorWallet.toLowerCase();
  const isProposer = dispute?.proposed_by?.toLowerCase() === address?.toLowerCase();

  if (isLoading) return <p>Loading...</p>;

  // No dispute yet
  if (!dispute) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Having an issue? Open a dispute to propose a resolution.
        </p>
        <OpenDisputeButton onSubmit={openDispute} />
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">Dispute</h3>
          <p className="text-sm text-muted-foreground">
            Opened by {truncateAddress(dispute.opened_by)}
          </p>
        </div>
        <Badge>{dispute.status}</Badge>
      </div>

      <div className="bg-muted p-3 rounded text-sm">
        <p className="font-medium">Reason:</p>
        <p>{dispute.reason}</p>
      </div>

      {/* Proposed resolution */}
      {dispute.status === 'proposed' && dispute.resolution_type && (
        <div className="border p-3 rounded space-y-2">
          <p className="font-medium">Proposed Resolution</p>
          <p className="text-sm">
            Type: <span className="capitalize">{dispute.resolution_type}</span>
          </p>
          {dispute.resolution_type === 'split' && (
            <div className="text-sm">
              <p>Payer receives: {formatUSDC(dispute.resolution_payer_amount || 0)}</p>
              <p>Creator receives: {formatUSDC(dispute.resolution_creator_amount || 0)}</p>
            </div>
          )}

          {/* Accept/Reject if not proposer */}
          {!isProposer && (
            <AcceptRejectButtons
              dispute={dispute}
              escrowAddress={escrowAddress}
              onAccept={() => acceptResolution(dispute.id)}
              onReject={() => rejectResolution(dispute.id)}
            />
          )}
        </div>
      )}

      {/* Propose form if open */}
      {dispute.status === 'open' && (
        <ProposeResolutionForm
          invoiceAmount={invoiceAmount}
          onSubmit={(type, payerAmt, creatorAmt) =>
            proposeResolution(dispute.id, type, payerAmt, creatorAmt)
          }
        />
      )}

      {/* Evidence */}
      <EvidenceList
        evidence={dispute.evidence || []}
        onSubmit={(content, fileUrl) => submitEvidence(dispute.id, content, fileUrl)}
      />

      {/* Expiry warning */}
      {dispute.expires_at && new Date(dispute.expires_at) > new Date() && (
        <p className="text-xs text-muted-foreground">
          Expires: {new Date(dispute.expires_at).toLocaleDateString()}
        </p>
      )}
    </Card>
  );
}
```

Create remaining components: `OpenDisputeButton.tsx`, `ProposeResolutionForm.tsx`, `AcceptRejectButtons.tsx`, `EvidenceList.tsx` following similar patterns.

## Todo List

- [ ] Add splitFunds to ArcMilestoneEscrow.sol
- [ ] Redeploy contracts
- [ ] Run database migration for disputes
- [ ] Update types/database.ts
- [ ] Create disputes GET/POST API
- [ ] Create dispute PATCH API
- [ ] Create evidence POST API
- [ ] Create useDispute hook
- [ ] Create useSplitFunds hook
- [ ] Create DisputePanel component
- [ ] Create OpenDisputeButton component
- [ ] Create ProposeResolutionForm component
- [ ] Create AcceptRejectButtons component
- [ ] Create EvidenceList component
- [ ] Integrate DisputePanel in invoice detail
- [ ] Test full dispute flow

## Success Criteria

- [ ] Either party can open dispute
- [ ] Can propose refund/release/split resolution
- [ ] Counter-party can accept or reject
- [ ] Accepted split executes on-chain
- [ ] Evidence can be submitted
- [ ] Dispute status tracked accurately

## Next Steps

After completion, proceed to Phase D: Notifications
