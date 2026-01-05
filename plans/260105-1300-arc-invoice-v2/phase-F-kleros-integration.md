# Phase F: Kleros Integration

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase E](./phase-E-analytics.md)

## Overview

- **Priority:** P3
- **Status:** Planned
- **Effort:** 1.5 weeks

Integrate Kleros decentralized arbitration for escalated dispute resolution.

## Requirements

### Functional
- Escalate unresolved disputes to Kleros
- Submit evidence to Kleros court
- Receive and execute ruling
- Track arbitration status
- Handle arbitration fees

### Non-Functional
- Fail gracefully if Kleros unavailable
- Clear user guidance on process
- Gas-efficient evidence submission

## Kleros Overview

[Kleros](https://kleros.io/) is a decentralized arbitration protocol:

1. **Dispute Creation** - Either party pays arbitration fee + creates dispute
2. **Evidence Period** - Both parties submit evidence (7 days default)
3. **Voting Period** - Random jurors vote on outcome
4. **Ruling** - Winning ruling executed

**Key Addresses (Ethereum Mainnet):**
- KlerosLiquid: `0x988b3A538b618C7A603e1c11Ab82Coverage6fE4F`
- Arbitrable Proxy: Varies by use case

**Note:** Kleros is primarily on Ethereum mainnet. For Arc chain, we'd use:
1. Cross-chain messaging (complex)
2. Or hybrid approach (dispute on Ethereum, execute on Arc)

## Architecture Decision

**Recommended: Hybrid Off-Chain Arbitration**

Given Arc is a separate L1, full on-chain Kleros integration is complex. Instead:

1. Dispute escalated → Create Kleros case on Ethereum
2. Evidence submitted to Kleros
3. Ruling received via API/oracle
4. Admin executes ruling on Arc (trusted for MVP)

**Future:** Cross-chain bridge for trustless execution.

## Flow Diagram

```
Arc Invoice (Arc Chain)              Kleros (Ethereum)
        │                                    │
        │ 1. Escalate dispute               │
        ├───────────────────────────────────►│
        │    (User pays ETH fee)            │
        │                                    │
        │ 2. Evidence period                │
        │◄───────────────────────────────────┤
        │    (Both parties submit)          │
        │                                    │
        │ 3. Voting period                  │
        │    (Jurors vote)                  │
        │                                    │
        │ 4. Ruling returned                │
        │◄───────────────────────────────────┤
        │                                    │
        │ 5. Execute on Arc                 │
        │    (Admin/oracle triggers)        │
        ▼                                    ▼
```

## Database Schema

```sql
-- Kleros arbitration tracking
CREATE TABLE kleros_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id),
    kleros_dispute_id TEXT, -- Kleros on-chain dispute ID
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'evidence', 'voting', 'appeal', 'resolved'
    )),
    ruling TEXT, -- 'payer', 'creator', 'split'
    payer_amount BIGINT,
    creator_amount BIGINT,
    arbitration_fee_eth TEXT, -- Fee paid in ETH
    arbitration_fee_paid_by TEXT, -- wallet address
    evidence_deadline TIMESTAMPTZ,
    ruling_at TIMESTAMPTZ,
    executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    executed_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kleros evidence submissions
CREATE TABLE kleros_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES kleros_cases(id),
    submitted_by TEXT NOT NULL,
    evidence_uri TEXT NOT NULL, -- IPFS URI
    kleros_evidence_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kleros_cases_dispute ON kleros_cases(dispute_id);
```

## Smart Contract Changes

Add Kleros support to escrow:

```solidity
// In ArcMilestoneEscrow.sol

address public klerosExecutor; // Trusted address that can execute Kleros rulings

modifier onlyKlerosExecutor() {
    require(msg.sender == klerosExecutor, "Only Kleros executor");
    _;
}

/// @notice Execute Kleros ruling
/// @dev Called by trusted executor after Kleros ruling
function executeKlerosRuling(
    uint256 payerAmount,
    uint256 creatorAmount
) external onlyKlerosExecutor inState(EscrowState.FUNDED) nonReentrant {
    require(payerAmount + creatorAmount <= _getBalance(), "Invalid amounts");

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

    emit KlerosRulingExecuted(payerAmount, creatorAmount);
}

event KlerosRulingExecuted(uint256 payerAmount, uint256 creatorAmount);
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `contracts/v2/ArcMilestoneEscrow.sol` | Modify | Add Kleros execution |
| `lib/kleros/client.ts` | Create | Kleros API client |
| `lib/kleros/evidence.ts` | Create | Evidence upload to IPFS |
| `app/api/disputes/[disputeId]/escalate/route.ts` | Create | Escalate to Kleros |
| `app/api/disputes/[disputeId]/kleros/route.ts` | Create | Get Kleros status |
| `app/api/webhooks/kleros/route.ts` | Create | Kleros ruling webhook |
| `hooks/useKleros.ts` | Create | Kleros interaction |
| `components/dispute/EscalateToKlerosButton.tsx` | Create | Escalate button |
| `components/dispute/KlerosStatus.tsx` | Create | Arbitration status |
| `components/dispute/KlerosEvidenceForm.tsx` | Create | Evidence submission |

## Implementation Steps

### Step 1: Contract Update (0.5 days)

Add `executeKlerosRuling` function and `klerosExecutor` address to escrow.

### Step 2: Kleros Client (1 day)

Create `lib/kleros/client.ts`:

```typescript
const KLEROS_API = 'https://api.kleros.io';

export interface KlerosDispute {
  id: string;
  status: string;
  ruling: number | null;
  evidenceDeadline: string;
  appealDeadline: string;
}

export async function getDisputeStatus(disputeId: string): Promise<KlerosDispute> {
  const res = await fetch(`${KLEROS_API}/disputes/${disputeId}`);
  if (!res.ok) throw new Error('Failed to fetch Kleros dispute');
  return res.json();
}

export async function createDispute(
  evidenceUri: string,
  metaEvidence: {
    title: string;
    description: string;
    question: string;
    rulingOptions: string[];
  }
): Promise<{ disputeId: string; txHash: string }> {
  // This would typically be done via a frontend wallet transaction
  // to the Kleros Arbitrable contract
  throw new Error('Create dispute via frontend wallet');
}

// Ruling codes
export const KLEROS_RULING = {
  REFUSE: 0,
  PAYER_WINS: 1,
  CREATOR_WINS: 2,
  SPLIT: 3,
} as const;
```

Create `lib/kleros/evidence.ts`:

```typescript
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'https://ipfs.kleros.io' });

export interface Evidence {
  name: string;
  description: string;
  fileURI?: string;
  fileHash?: string;
  fileTypeExtension?: string;
}

export async function uploadEvidence(evidence: Evidence): Promise<string> {
  const { cid } = await ipfs.add(JSON.stringify(evidence));
  return `ipfs://${cid}`;
}

export async function uploadFile(file: Buffer, filename: string): Promise<string> {
  const { cid } = await ipfs.add({
    path: filename,
    content: file,
  });
  return `ipfs://${cid}`;
}
```

### Step 3: Database Migration (0.25 days)

Run migration for Kleros tables.

### Step 4: API Routes (1 day)

Create `app/api/disputes/[disputeId]/escalate/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const { disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Verify dispute exists and is eligible
  const { data: dispute } = await supabase
    .from('disputes')
    .select('*, invoices(*)')
    .eq('id', disputeId)
    .single();

  if (!dispute) {
    return Response.json({ error: 'Dispute not found' }, { status: 404 });
  }

  if (dispute.status !== 'open' && dispute.status !== 'proposed') {
    return Response.json({ error: 'Cannot escalate this dispute' }, { status: 400 });
  }

  // Check if already escalated
  const { data: existing } = await supabase
    .from('kleros_cases')
    .select('id')
    .eq('dispute_id', disputeId)
    .limit(1);

  if (existing?.length) {
    return Response.json({ error: 'Already escalated to Kleros' }, { status: 400 });
  }

  // Create Kleros case record (actual dispute creation via frontend tx)
  const evidenceDeadline = new Date();
  evidenceDeadline.setDate(evidenceDeadline.getDate() + 7);

  const { data: klerosCase, error } = await supabase
    .from('kleros_cases')
    .insert({
      dispute_id: disputeId,
      status: 'pending',
      evidence_deadline: evidenceDeadline.toISOString(),
      arbitration_fee_paid_by: walletAddress,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Update dispute status
  await supabase
    .from('disputes')
    .update({ status: 'escalated' })
    .eq('id', disputeId);

  return Response.json({
    klerosCase,
    message: 'Complete Kleros transaction in your wallet',
    // Return data needed for frontend to create actual Kleros dispute
    arbitrationData: {
      contractAddress: process.env.KLEROS_ARBITRABLE_ADDRESS,
      metaEvidence: {
        title: `Arc Invoice Dispute - ${dispute.invoices.short_code}`,
        description: dispute.reason,
        question: 'How should the escrowed funds be distributed?',
        rulingOptions: ['Refund to Payer', 'Release to Creator', 'Split 50/50'],
      },
    },
  }, { status: 201 });
}
```

Create `app/api/webhooks/kleros/route.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { KLEROS_RULING } from '@/lib/kleros/client';

export async function POST(req: Request) {
  // Verify webhook signature (Kleros uses signatures)
  const signature = req.headers.get('x-kleros-signature');
  // TODO: Verify signature

  const body = await req.json();
  const { disputeId, ruling, payerAmount, creatorAmount } = body;

  const supabase = createAdminClient();

  // Find our case
  const { data: klerosCase } = await supabase
    .from('kleros_cases')
    .select('*, disputes(invoice_id)')
    .eq('kleros_dispute_id', disputeId)
    .single();

  if (!klerosCase) {
    return Response.json({ error: 'Case not found' }, { status: 404 });
  }

  // Determine ruling type
  let rulingType: string;
  let pAmount = 0;
  let cAmount = 0;

  switch (ruling) {
    case KLEROS_RULING.PAYER_WINS:
      rulingType = 'payer';
      pAmount = payerAmount || klerosCase.total_amount;
      break;
    case KLEROS_RULING.CREATOR_WINS:
      rulingType = 'creator';
      cAmount = creatorAmount || klerosCase.total_amount;
      break;
    case KLEROS_RULING.SPLIT:
      rulingType = 'split';
      pAmount = payerAmount || Math.floor(klerosCase.total_amount / 2);
      cAmount = creatorAmount || Math.floor(klerosCase.total_amount / 2);
      break;
    default:
      rulingType = 'refused';
  }

  // Update case
  await supabase
    .from('kleros_cases')
    .update({
      status: 'resolved',
      ruling: rulingType,
      payer_amount: pAmount,
      creator_amount: cAmount,
      ruling_at: new Date().toISOString(),
    })
    .eq('id', klerosCase.id);

  // Note: Actual execution happens via admin action or automated script
  // that calls executeKlerosRuling on the escrow contract

  return Response.json({ success: true });
}
```

### Step 5: Kleros Hook (0.5 days)

Create `hooks/useKleros.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

interface KlerosCase {
  id: string;
  dispute_id: string;
  kleros_dispute_id: string | null;
  status: string;
  ruling: string | null;
  payer_amount: number | null;
  creator_amount: number | null;
  evidence_deadline: string | null;
  executed: boolean;
}

export function useKleros(disputeId: string) {
  const [klerosCase, setKlerosCase] = useState<KlerosCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${disputeId}/kleros`);
      if (res.ok) {
        const data = await res.json();
        setKlerosCase(data.klerosCase);
      }
    } finally {
      setIsLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const escalate = async () => {
    const res = await fetch(`/api/disputes/${disputeId}/escalate`, {
      method: 'POST',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    const data = await res.json();
    await fetchCase();
    return data;
  };

  const submitEvidence = async (content: string, fileUri?: string) => {
    const res = await fetch(`/api/disputes/${disputeId}/kleros/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, fileUri }),
    });

    if (!res.ok) throw new Error('Failed to submit evidence');
    await fetchCase();
  };

  return {
    klerosCase,
    isLoading,
    refetch: fetchCase,
    escalate,
    submitEvidence,
  };
}
```

### Step 6: UI Components (2 days)

Create `components/dispute/EscalateToKlerosButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useKleros } from '@/hooks/useKleros';
import { Scale, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface EscalateToKlerosButtonProps {
  disputeId: string;
}

export function EscalateToKlerosButton({ disputeId }: EscalateToKlerosButtonProps) {
  const [open, setOpen] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const { escalate } = useKleros(disputeId);

  const handleEscalate = async () => {
    setIsEscalating(true);
    try {
      const result = await escalate();
      toast.success('Dispute escalated to Kleros');

      // Open Kleros in new tab for user to complete transaction
      if (result.arbitrationData) {
        window.open('https://court.kleros.io', '_blank');
      }

      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to escalate');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Scale className="h-4 w-4 mr-2" />
        Escalate to Kleros
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate to Kleros Arbitration</DialogTitle>
            <DialogDescription>
              This will submit the dispute to Kleros decentralized court for resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">What happens next:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>You'll pay an arbitration fee (~$50-100 in ETH)</li>
                <li>Both parties can submit evidence (7 days)</li>
                <li>Random jurors vote on the outcome</li>
                <li>Ruling is executed automatically</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Kleros operates on Ethereum mainnet.
                You'll need ETH for the arbitration fee.
              </p>
            </div>

            <a
              href="https://kleros.io/how-it-works"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Learn more about Kleros
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEscalate}
              disabled={isEscalating}
            >
              {isEscalating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Scale className="h-4 w-4 mr-2" />
              )}
              Proceed to Kleros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

Create `components/dispute/KlerosStatus.tsx`:

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKleros } from '@/hooks/useKleros';
import { Scale, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatUSDC } from '@/lib/utils';

interface KlerosStatusProps {
  disputeId: string;
}

export function KlerosStatus({ disputeId }: KlerosStatusProps) {
  const { klerosCase, isLoading } = useKleros(disputeId);

  if (isLoading) return <p>Loading Kleros status...</p>;
  if (!klerosCase) return null;

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    evidence: { icon: Scale, color: 'bg-blue-100 text-blue-800', label: 'Evidence Period' },
    voting: { icon: Scale, color: 'bg-purple-100 text-purple-800', label: 'Voting' },
    appeal: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800', label: 'Appeal Period' },
    resolved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Resolved' },
  };

  const config = statusConfig[klerosCase.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Card className="p-4 border-2 border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <Scale className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold">Kleros Arbitration</h3>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      {klerosCase.evidence_deadline && klerosCase.status === 'evidence' && (
        <p className="text-sm text-muted-foreground mb-4">
          Evidence deadline: {new Date(klerosCase.evidence_deadline).toLocaleDateString()}
        </p>
      )}

      {klerosCase.ruling && (
        <div className="bg-muted p-3 rounded">
          <p className="font-medium">Ruling: {klerosCase.ruling}</p>
          {klerosCase.payer_amount !== null && (
            <p className="text-sm">Payer receives: {formatUSDC(klerosCase.payer_amount)}</p>
          )}
          {klerosCase.creator_amount !== null && (
            <p className="text-sm">Creator receives: {formatUSDC(klerosCase.creator_amount)}</p>
          )}
          {klerosCase.executed && (
            <p className="text-sm text-green-600 mt-2">✓ Ruling executed</p>
          )}
        </div>
      )}

      {klerosCase.kleros_dispute_id && (
        <a
          href={`https://court.kleros.io/cases/${klerosCase.kleros_dispute_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline mt-4 inline-block"
        >
          View on Kleros Court →
        </a>
      )}
    </Card>
  );
}
```

### Step 7: Admin Execution Script (0.5 days)

Create `scripts/execute-kleros-ruling.ts`:

```typescript
import { ethers } from 'hardhat';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get unexecuted rulings
  const { data: cases } = await supabase
    .from('kleros_cases')
    .select('*, disputes(invoices(escrow_address))')
    .eq('status', 'resolved')
    .eq('executed', false);

  if (!cases?.length) {
    console.log('No pending rulings to execute');
    return;
  }

  const [signer] = await ethers.getSigners();

  for (const klerosCase of cases) {
    const escrowAddress = klerosCase.disputes?.invoices?.escrow_address;
    if (!escrowAddress) continue;

    console.log(`Executing ruling for case ${klerosCase.id}`);

    const escrow = await ethers.getContractAt('ArcMilestoneEscrow', escrowAddress);

    try {
      const tx = await escrow.executeKlerosRuling(
        BigInt(klerosCase.payer_amount || 0),
        BigInt(klerosCase.creator_amount || 0)
      );
      await tx.wait();

      // Mark as executed
      await supabase
        .from('kleros_cases')
        .update({
          executed: true,
          executed_at: new Date().toISOString(),
          executed_tx_hash: tx.hash,
        })
        .eq('id', klerosCase.id);

      console.log(`Executed: ${tx.hash}`);
    } catch (err) {
      console.error(`Failed to execute ${klerosCase.id}:`, err);
    }
  }
}

main().catch(console.error);
```

## Security Considerations

1. **Kleros Executor** - Must be secured (multi-sig or trusted backend)
2. **Webhook Verification** - Verify Kleros signature on webhooks
3. **Cross-Chain** - Monitor for bridge exploits if using cross-chain messaging

## Todo List

- [ ] Add executeKlerosRuling to contract
- [ ] Add klerosExecutor address to contract
- [ ] Redeploy v2 contracts
- [ ] Run database migration
- [ ] Create lib/kleros/client.ts
- [ ] Create lib/kleros/evidence.ts
- [ ] Create escalate API route
- [ ] Create kleros status API route
- [ ] Create webhook API route
- [ ] Create useKleros hook
- [ ] Create EscalateToKlerosButton
- [ ] Create KlerosStatus component
- [ ] Create KlerosEvidenceForm
- [ ] Integrate in DisputePanel
- [ ] Create admin execution script
- [ ] Test full escalation flow
- [ ] Set up webhook endpoint

## Success Criteria

- [ ] Disputes can escalate to Kleros
- [ ] Evidence submission works
- [ ] Status tracking accurate
- [ ] Rulings execute correctly
- [ ] Fee handling works

## Future Improvements

1. **Trustless Execution** - Cross-chain bridge for ruling execution
2. **Appeal Support** - Handle Kleros appeals
3. **Custom Arbitrators** - Allow invoice-specific arbitrator selection
4. **Insurance** - Integrate with DeFi insurance for payer protection

## Conclusion

This completes the v2 implementation plan. Total estimated effort: **6-7 weeks**.

Phases can be implemented incrementally, with each phase adding value independently.
