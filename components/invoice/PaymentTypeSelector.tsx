'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PaymentTypeSelectorProps {
  value: 'direct' | 'escrow';
  onChange: (value: 'direct' | 'escrow') => void;
}

export function PaymentTypeSelector({
  value,
  onChange,
}: PaymentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-2">
      <Card
        className={cn(
          'p-4 cursor-pointer border-2 transition-colors',
          value === 'direct'
            ? 'border-primary'
            : 'border-transparent hover:border-muted'
        )}
        onClick={() => onChange('direct')}
      >
        <h3 className="font-semibold">Direct Payment</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Instant wallet-to-wallet transfer
        </p>
      </Card>

      <Card
        className={cn(
          'p-4 cursor-pointer border-2 transition-colors',
          value === 'escrow'
            ? 'border-primary'
            : 'border-transparent hover:border-muted'
        )}
        onClick={() => onChange('escrow')}
      >
        <h3 className="font-semibold">Escrow Payment</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Funds held until you approve
        </p>
      </Card>
    </div>
  );
}
