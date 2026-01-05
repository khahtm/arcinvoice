'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { formatUSDC, truncateAddress } from '@/lib/utils';

interface EscrowStatusProps {
  escrowAddress: `0x${string}`;
}

const stateColors: Record<string, string> = {
  CREATED: 'bg-gray-500',
  FUNDED: 'bg-blue-500',
  RELEASED: 'bg-green-500',
  REFUNDED: 'bg-red-500',
};

export function EscrowStatus({ escrowAddress }: EscrowStatusProps) {
  const {
    state,
    amount,
    payer,
    fundedAt,
    autoReleaseDays,
    canAutoRelease,
    isLoading,
  } = useEscrowStatus(escrowAddress);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading escrow status...</p>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Escrow Status</span>
        <Badge className={stateColors[state ?? ''] ?? 'bg-gray-500'}>
          {state ?? 'Unknown'}
        </Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Amount</p>
        <p className="font-semibold">{formatUSDC(parseFloat(amount))}</p>
      </div>

      {payer && (
        <div>
          <p className="text-sm text-muted-foreground">Funded by</p>
          <p className="font-mono text-sm">{truncateAddress(payer)}</p>
        </div>
      )}

      {fundedAt && (
        <div>
          <p className="text-sm text-muted-foreground">Funded at</p>
          <p className="text-sm">{fundedAt.toLocaleDateString()}</p>
        </div>
      )}

      {state === 'FUNDED' && (
        <div>
          <p className="text-sm text-muted-foreground">Auto-release</p>
          <p className="text-sm">
            {canAutoRelease
              ? 'Available now'
              : `In ${autoReleaseDays} days from funding`}
          </p>
        </div>
      )}
    </Card>
  );
}
