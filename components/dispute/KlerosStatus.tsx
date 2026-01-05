'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKleros } from '@/hooks/useKleros';
import { Scale, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatUSDC } from '@/lib/utils';

interface KlerosStatusProps {
  invoiceId: string;
  disputeId: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    label: 'Pending',
  },
  evidence: {
    icon: Scale,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    label: 'Evidence Period',
  },
  voting: {
    icon: Scale,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    label: 'Juror Voting',
  },
  appeal: {
    icon: AlertCircle,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    label: 'Appeal Period',
  },
  resolved: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    label: 'Resolved',
  },
};

export function KlerosStatus({ invoiceId, disputeId }: KlerosStatusProps) {
  const { klerosCase, isLoading } = useKleros(invoiceId, disputeId);

  if (isLoading) {
    return (
      <Card className="p-4 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Kleros status...
        </div>
      </Card>
    );
  }

  if (!klerosCase) {
    return null;
  }

  const config = STATUS_CONFIG[klerosCase.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card className="p-4 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-4">
        <Scale className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold">Kleros Arbitration</h3>
        <Badge className={config.color}>{config.label}</Badge>
      </div>

      {/* Evidence deadline */}
      {klerosCase.evidence_deadline && klerosCase.status === 'evidence' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>
            Evidence deadline: {new Date(klerosCase.evidence_deadline).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Ruling result */}
      {klerosCase.ruling && (
        <div className="bg-muted p-3 rounded-lg space-y-2">
          <p className="font-medium capitalize">Ruling: {klerosCase.ruling}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {klerosCase.payer_amount !== null && (
              <div>
                <span className="text-muted-foreground">Payer receives:</span>
                <p className="font-mono">{formatUSDC(klerosCase.payer_amount / 1_000_000)}</p>
              </div>
            )}
            {klerosCase.creator_amount !== null && (
              <div>
                <span className="text-muted-foreground">Creator receives:</span>
                <p className="font-mono">{formatUSDC(klerosCase.creator_amount / 1_000_000)}</p>
              </div>
            )}
          </div>

          {klerosCase.executed && (
            <div className="flex items-center gap-2 text-green-600 mt-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Ruling executed on-chain</span>
            </div>
          )}

          {klerosCase.executed_tx_hash && (
            <a
              href={`https://explorer.arc.money/tx/${klerosCase.executed_tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View transaction →
            </a>
          )}
        </div>
      )}

      {/* Link to Kleros court */}
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
