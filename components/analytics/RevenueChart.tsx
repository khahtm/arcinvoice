'use client';

import { Card } from '@/components/ui/card';
import { formatUSDC } from '@/lib/utils';

interface RevenueChartProps {
  data: Array<{ month: string; amount: number }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data.length) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Monthly Revenue</h3>
        <p className="text-muted-foreground">No revenue data yet</p>
      </Card>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));

  // Format month as "Jan 24"
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Monthly Revenue</h3>

      <div className="space-y-3">
        {data.slice(-6).map((item) => (
          <div key={item.month} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">{formatMonth(item.month)}</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-mono w-24 text-right">{formatUSDC(item.amount)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
