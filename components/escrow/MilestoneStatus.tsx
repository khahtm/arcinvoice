'use client';

import { Badge } from '@/components/ui/badge';
import { formatUSDC } from '@/lib/utils';
import type { Milestone } from '@/types/database';
import { CheckCircle, Clock, Coins } from 'lucide-react';

interface MilestoneStatusProps {
  milestones: Milestone[];
}

export function MilestoneStatus({ milestones }: MilestoneStatusProps) {
  if (!milestones.length) return null;

  const releasedCount = milestones.filter((m) => m.status === 'released').length;
  const approvedCount = milestones.filter((m) => m.status === 'approved').length;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Milestones</span>
        <span>
          {releasedCount}/{milestones.length} released
          {approvedCount > 0 && `, ${approvedCount} approved`}
        </span>
      </div>

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
              <p className="text-sm text-muted-foreground line-clamp-1">
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
