'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useSwitchChain, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contracts/abi';
import { tryGetContractAddress } from '@/lib/contracts/addresses';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MilestoneList } from './MilestoneList';
import { MilestoneProgressBar } from './milestone-progress-bar';
import { FundMilestoneButton } from './FundMilestoneButton';
import { CrossChainFundButton } from './CrossChainFundButton';
import { ChainSelector } from '@/components/payment/chain-selector';
import { BridgeFeeEstimate } from '@/components/payment/bridge-fee-estimate';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { DEAL_ESCROW_ABI } from '@/lib/contracts/deal-abi';
import { isArcChain, isSourceChain } from '@/lib/chains';
import { Shield, Clock, ExternalLink, CheckCircle2, Loader2, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { DisputeMediatorCard } from './dispute-mediator-card';
import { PaymentAdvisorBanner } from '@/components/payment/payment-advisor-banner';
import type { DealWithMilestones } from '@/hooks/useDeals';
import type { Milestone } from '@/types/database';

interface ClientDealViewProps {
  deal: DealWithMilestones;
  onSign?: () => void;
  isSigning?: boolean;
  signingStep?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Awaiting Signature', color: 'bg-yellow-500' },
  signed: { label: 'Ready to Fund', color: 'bg-blue-500' },
  funded: { label: 'Funded', color: 'bg-indigo-500' },
  active: { label: 'In Progress', color: 'bg-[#005FFE]' },
  disputed: { label: 'Disputed', color: 'bg-yellow-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  refunded: { label: 'Refunded', color: 'bg-red-500' },
};

function MilestoneApproveAction({ milestone: m, index, escrowBalance, approvingIndex, onArc, onApprove }: {
  milestone: Milestone; index: number; escrowBalance: bigint | undefined;
  approvingIndex: number | null; onArc: boolean; onApprove: (i: number) => void;
}) {
  const milestoneWei = parseUnits(m.amount.toString(), 6);
  const insufficient = escrowBalance !== undefined && escrowBalance < milestoneWei;

  return (
    <div className="flex items-center gap-2">
      {m.proof_url && (
        <a href={m.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
          View work <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {insufficient ? (
        <span className="text-xs text-destructive">
          Escrow: ${formatUnits(escrowBalance!, 6)} (insufficient)
        </span>
      ) : (
        <Button
          size="sm"
          className="text-xs bg-green-600 hover:bg-green-700"
          onClick={() => onApprove(index)}
          disabled={approvingIndex === index || !onArc}
        >
          {approvingIndex === index ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
          {approvingIndex === index ? 'Approving...' : 'Approve'}
        </Button>
      )}
    </div>
  );
}

export function ClientDealView({ deal, onSign, isSigning, signingStep }: ClientDealViewProps) {
  const { address, chainId, isConnected } = useAccount();
  const onArc = isArcChain(chainId);
  const onSource = isSourceChain(chainId);
  const status = statusConfig[deal.deal_status] || statusConfig.draft;
  const completedCount = deal.milestones.filter((m) => m.released).length;
  const isClient = address && deal.client_wallet?.toLowerCase() === address.toLowerCase();
  const expectedClient = deal.expected_client_wallet;
  const wrongExpectedWallet =
    !!expectedClient && !!address && address.toLowerCase() !== expectedClient.toLowerCase();
  const { writeContractAsync } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const usdcAddr = tryGetContractAddress(chainId ?? 0, 'USDC');
  const { data: escrowBalance } = useReadContract({
    address: usdcAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: deal.escrow_address ? [deal.escrow_address as `0x${string}`] : undefined,
    query: { enabled: !!usdcAddr && !!deal.escrow_address },
  });
  const [fundedMilestones, setFundedMilestones] = useState<Set<string>>(new Set());
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);

  const handleMilestoneFunded = (milestone: Milestone) => {
    setFundedMilestones((prev) => new Set(prev).add(milestone.id));
  };

  const nextUnfundedIndex = deal.milestones.findIndex(
    (m) => m.status !== 'funded' && !m.released && !fundedMilestones.has(m.id)
  );

  const handleApprove = useCallback(async (milestoneIndex: number) => {
    if (!deal.escrow_address) return;
    setApprovingIndex(milestoneIndex);
    try {
      await writeContractAsync({
        address: deal.escrow_address as `0x${string}`,
        abi: DEAL_ESCROW_ABI,
        functionName: 'approveMilestone',
        args: [BigInt(milestoneIndex)],
      });

      await fetch(`/api/deals/${deal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneIndex, walletAddress: address }),
      });

      toast.success(`Milestone #${milestoneIndex + 1} approved!`);
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (!msg.includes('rejected')) toast.error('Approval failed');
    } finally {
      setApprovingIndex(null);
    }
  }, [deal, address, writeContractAsync]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-[#005FFE]" />
          <span className="text-sm text-muted-foreground">Escrow-Protected Deal</span>
        </div>
      </div>

      {/* Deal Summary */}
      <Card className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="font-mono text-sm">{truncateAddress(deal.creator_wallet)}</p>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        {deal.client_wallet && (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Signed by</span>
            <span className="font-mono">{truncateAddress(deal.client_wallet)}</span>
          </div>
        )}

        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-4xl font-medium font-mono text-[#005FFE]">{formatUSDC(deal.amount)}</p>
          <p className="text-sm text-muted-foreground mt-1">USDC</p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{deal.description}</p>
        </div>

        <div className="flex items-center gap-4 mt-6 pt-6 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Auto-release: {deal.auto_release_days} days</span>
          </div>
          <span>•</span>
          <span>{deal.milestones.length} milestones</span>
          {completedCount > 0 && (
            <>
              <span>•</span>
              <span>{completedCount} completed</span>
            </>
          )}
        </div>

        {deal.escrow_address && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Escrow: {truncateAddress(deal.escrow_address)}</span>
            <a
              href={`https://testnet.arcscan.app/address/${deal.escrow_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              View <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}
      </Card>

      {/* Milestone Progress */}
      <MilestoneProgressBar milestones={deal.milestones} />

      {/* Milestones */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Milestones</h2>
        <MilestoneList milestones={deal.milestones} />
      </div>

      {/* Funding Section — visible after signing, through active */}
      {['signed', 'funded', 'active'].includes(deal.deal_status) && isClient && (
        <Card className="p-6 border-[#005FFE]/20 bg-[#005FFE]/[0.02]">
          <h3 className="font-semibold mb-1">Fund Milestones</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Fund milestones one at a time. USDC is held in escrow until the freelancer delivers and you approve.
          </p>

          {/* Chain selector + fee estimate */}
          {isConnected && (
            <div className="space-y-3 mb-4">
              <ChainSelector amount={nextUnfundedIndex >= 0 ? deal.milestones[nextUnfundedIndex].amount : deal.amount} />
              <PaymentAdvisorBanner
                amount={nextUnfundedIndex >= 0 ? deal.milestones[nextUnfundedIndex].amount : deal.amount}
                onSwitchChain={(id) => switchChain?.({ chainId: id })}
              />
              <BridgeFeeEstimate sourceChainId={chainId} />
            </div>
          )}

          <div className="space-y-3">
            {deal.milestones.map((m, i) => {
              const isFunded = m.status === 'funded' || m.released || fundedMilestones.has(m.id);
              const isNext = i === nextUnfundedIndex;
              return (
                <div key={m.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-mono text-muted-foreground shrink-0">#{i + 1}</span>
                    <span className="text-sm truncate">{m.description}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm font-medium text-[#005FFE]">{formatUSDC(m.amount)}</span>
                    {m.released ? (
                      <Badge variant="secondary" className="text-green-600">Released</Badge>
                    ) : m.approved ? (
                      <Badge variant="secondary" className="text-blue-600">Approved</Badge>
                    ) : m.delivered ? (
                      <MilestoneApproveAction
                        milestone={m}
                        index={i}
                        escrowBalance={escrowBalance}
                        approvingIndex={approvingIndex}
                        onArc={onArc}
                        onApprove={handleApprove}
                      />
                    ) : isFunded ? (
                      <Badge variant="secondary" className="text-muted-foreground">Awaiting delivery</Badge>
                    ) : onSource ? (
                      <CrossChainFundButton
                        milestone={m}
                        milestoneIndex={i}
                        deal={deal}
                        disabled={!isNext}
                        onFunded={() => handleMilestoneFunded(m)}
                      />
                    ) : onArc ? (
                      <FundMilestoneButton
                        milestone={m}
                        milestoneIndex={i}
                        deal={deal}
                        disabled={!isNext}
                        onFunded={() => handleMilestoneFunded(m)}
                      />
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Switch chain</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AI Dispute Mediator */}
      {deal.deal_status === 'disputed' && (
        <DisputeMediatorCard
          dealId={deal.id}
          disputedAmount={deal.amount}
          onAccept={() => {
            toast.info('Recommendation noted. You can propose this resolution to the other party.');
          }}
        />
      )}

      {/* Trust Signals */}
      <Card className="p-5 bg-[#005FFE]/[0.03] border-[#005FFE]/15">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[#005FFE] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Protected by Smart Contract</p>
            <p className="text-muted-foreground mt-0.5">
              Funds are held in an on-chain escrow contract — not by the freelancer.
              You approve each milestone before funds are released.
            </p>
          </div>
        </div>
      </Card>

      {/* Sign Action — only for draft deals */}
      {deal.deal_status === 'draft' && (
        <div className="space-y-4">
          {expectedClient && (
            <Card className="p-4 text-center bg-yellow-500/[0.06] border-yellow-500/20">
              <p className="text-sm text-muted-foreground">
                This deal is reserved for{' '}
                <span className="font-mono">{truncateAddress(expectedClient)}</span>.
                Connect that wallet to sign.
              </p>
            </Card>
          )}
          {!isConnected ? (
            <Card className="p-6 text-center space-y-3">
              <p className="text-muted-foreground">Connect your wallet using the button above to sign and fund this deal.</p>
            </Card>
          ) : (
            <>
              <Button
                onClick={onSign}
                disabled={isSigning || wrongExpectedWallet}
                className="w-full"
                size="lg"
              >
                {isSigning ? (signingStep || 'Signing...') : 'Sign & Agree to Terms'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {wrongExpectedWallet
                  ? 'Connected wallet is not the designated client for this deal.'
                  : 'By signing, you agree to the milestones and payment terms above.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Signed but not the client — show connect prompt */}
      {deal.deal_status === 'signed' && !isClient && isConnected && (
        <Card className="p-5 text-center">
          <p className="text-sm text-muted-foreground">
            This deal was signed by a different wallet. Connect with{' '}
            <span className="font-mono">{truncateAddress(deal.client_wallet || '')}</span> to fund.
          </p>
        </Card>
      )}
    </div>
  );
}
