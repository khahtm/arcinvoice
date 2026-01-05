'use client';

import { Card } from '@/components/ui/card';

interface StatusDistributionProps {
  data: Array<{ status: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  pending: 'bg-yellow-500',
  funded: 'bg-blue-500',
  released: 'bg-green-500',
  refunded: 'bg-red-500',
  disputed: 'bg-orange-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  funded: 'Funded',
  released: 'Released',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

export function StatusDistribution({ data }: StatusDistributionProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Invoice Status</h3>
        <p className="text-muted-foreground">No invoices yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Invoice Status</h3>

      {/* Progress bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-4">
        {data.map((item) => (
          <div
            key={item.status}
            className={`${STATUS_COLORS[item.status] || 'bg-gray-400'}`}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${STATUS_LABELS[item.status] || item.status}: ${item.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-400'}`}
            />
            <span className="text-muted-foreground">
              {STATUS_LABELS[item.status] || item.status}
            </span>
            <span className="font-medium ml-auto">{item.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
