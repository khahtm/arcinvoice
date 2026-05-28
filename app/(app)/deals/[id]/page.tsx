'use client';

import { use } from 'react';
import { useDealDetail } from '@/hooks/useDealDetail';
import { MilestoneProgressBar } from '@/components/deal/milestone-progress-bar';
import { FreelancerMilestoneActions } from '@/components/deal/FreelancerMilestoneActions';
import { DeployEscrowAction } from '@/components/deal/DeployEscrowAction';
import { ShareLink } from '@/components/deal/ShareLink';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Milestone } from '@/types/database';

function MilestoneBadge({ milestone: m }: { milestone: Milestone }) {
  if (m.released) return <Badge className="bg-green-500 shrink-0">Released</Badge>;
  if (m.approved) return <Badge className="bg-blue-500 shrink-0">Approved</Badge>;
  if (m.delivered) return <Badge className="bg-yellow-500 shrink-0">Delivered</Badge>;
  if (m.status === 'funded') return <Badge className="bg-[#005FFE] shrink-0">Funded</Badge>;
  return <Badge variant="secondary" className="shrink-0">Pending</Badge>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  signed: { label: 'Signed', color: 'bg-blue-500' },
  funded: { label: 'Funded', color: 'bg-indigo-500' },
  active: { label: 'Active', color: 'bg-[#005FFE]' },
  disputed: { label: 'Disputed', color: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  refunded: { label: 'Refunded', color: 'bg-red-500' },
};

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { deal, isLoading, error, refetch } = useDealDetail(id);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-destructive">Deal Not Found</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Link href="/deals">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Deals
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const status = statusConfig[deal.deal_status] || statusConfig.draft;
  const completedMilestones = deal.milestones.filter((m) => m.released).length;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/deals">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Deal Details</h1>
            <p className="font-mono text-muted-foreground">{deal.short_code}</p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Deploy escrow (draft deal without on-chain escrow, e.g. deploy failed) */}
      {deal.deal_status === 'draft' && !deal.escrow_address && (
        <DeployEscrowAction deal={deal} onDeployed={refetch} />
      )}

      {/* Share Link */}
      <ShareLink shortCode={deal.short_code} />

      {/* Deal Info */}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-medium font-mono text-[#005FFE]">{formatUSDC(deal.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{completedMilestones}/{deal.milestones.length}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="mt-1">{deal.description}</p>
        </div>

        {(deal.client_name || deal.client_email || deal.expected_client_wallet) && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-1">Client</p>
            {deal.client_name && <p className="font-medium">{deal.client_name}</p>}
            {deal.client_email && <p className="text-muted-foreground text-sm">{deal.client_email}</p>}
            {deal.client_wallet && (
              <p className="font-mono text-sm text-muted-foreground mt-1">
                Wallet: {truncateAddress(deal.client_wallet)}
              </p>
            )}
            {deal.expected_client_wallet && !deal.client_wallet && (
              <p className="font-mono text-sm text-muted-foreground mt-1">
                Reserved for: {truncateAddress(deal.expected_client_wallet)}
              </p>
            )}
          </div>
        )}

        <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <p>Auto-release: {deal.auto_release_days} days</p>
          <p>Created: {new Date(deal.created_at).toLocaleDateString()}</p>
          {deal.escrow_address && (
            <p className="col-span-2">
              Escrow: <span className="font-mono">{truncateAddress(deal.escrow_address)}</span>
            </p>
          )}
        </div>
      </Card>

      {/* Milestone Progress */}
      <MilestoneProgressBar milestones={deal.milestones} />

      {/* Milestones */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Milestones</h2>
        <div className="space-y-3">
          {deal.milestones.map((m, i) => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-mono font-medium shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.description}</p>
                {m.proof_url && (
                  <a href={m.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    View proof →
                  </a>
                )}
              </div>
              <span className="font-mono text-sm font-medium text-[#005FFE] shrink-0">
                {formatUSDC(m.amount)}
              </span>
              {deal.escrow_address && ['active', 'funded'].includes(deal.deal_status) ? (
                <FreelancerMilestoneActions
                  milestone={m}
                  milestoneIndex={i}
                  escrowAddress={deal.escrow_address}
                  dealId={deal.id}
                  onUpdate={refetch}
                />
              ) : (
                <MilestoneBadge milestone={m} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
