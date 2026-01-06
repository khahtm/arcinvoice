'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useEscrowStatus } from '@/hooks/useEscrowStatus';
import { formatUSDC, truncateAddress } from '@/lib/utils';
import { USYCInfoModal } from './USYCInfoModal';

interface EscrowStatusProps {
  escrowAddress: `0x${string}`;
  contractVersion?: number;
}

// V1/V2: CREATED, FUNDED, RELEASED, REFUNDED
// V3: CREATED, ACTIVE, COMPLETED, REFUNDED
const stateColors: Record<string, string> = {
  CREATED: 'bg-gray-500',
  FUNDED: 'bg-blue-500',
  ACTIVE: 'bg-blue-500',
  RELEASED: 'bg-green-500',
  COMPLETED: 'bg-green-500',
  REFUNDED: 'bg-red-500',
};

export function EscrowStatus({
  escrowAddress,
  contractVersion = 1,
}: EscrowStatusProps) {
  const {
    state,
    amount,
    fundedAmount,
    payer,
    fundedAt,
    autoReleaseDays,
    canAutoRelease,
    isLoading,
  } = useEscrowStatus(escrowAddress, contractVersion);

  const isV3 = contractVersion === 3;

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
        <p className="text-sm text-muted-foreground">Total Amount</p>
        <p className="font-semibold">{formatUSDC(parseFloat(amount))}</p>
      </div>

      {/* V3: Show funded progress */}
      {isV3 && (
        <div>
          <p className="text-sm text-muted-foreground">Funded</p>
          <p className="font-semibold">
            {formatUSDC(parseFloat(fundedAmount))} / {formatUSDC(parseFloat(amount))}
          </p>
        </div>
      )}

      {payer && (
        <div>
          <p className="text-sm text-muted-foreground">Funded by</p>
          <p className="font-mono text-sm">{truncateAddress(payer)}</p>
        </div>
      )}

      {fundedAt && (
        <div>
          <p className="text-sm text-muted-foreground">First funded at</p>
          <p className="text-sm">{fundedAt.toLocaleDateString()}</p>
        </div>
      )}

      {(state === 'FUNDED' || state === 'ACTIVE') && (
        <div>
          <p className="text-sm text-muted-foreground">Auto-release</p>
          <p className="text-sm">
            {canAutoRelease
              ? 'Available now'
              : `In ${autoReleaseDays} days from first funding`}
          </p>
        </div>
      )}

      {/* USYC Yield Info - show when funds are held */}
      {(state === 'FUNDED' || state === 'ACTIVE') && (
        <div className="pt-2 border-t">
          <USYCInfoModal />
        </div>
      )}
    </Card>
  );
}
