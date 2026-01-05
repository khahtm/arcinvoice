'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ResolutionType } from '@/types/database';
import { formatUSDC } from '@/lib/utils';

interface ProposeResolutionFormProps {
  invoiceAmount: number;
  onSubmit: (
    type: ResolutionType,
    payerAmount?: number,
    creatorAmount?: number
  ) => Promise<void>;
}

export function ProposeResolutionForm({
  invoiceAmount,
  onSubmit,
}: ProposeResolutionFormProps) {
  const [type, setType] = useState<ResolutionType>('release');
  const [payerAmount, setPayerAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const creatorAmount = invoiceAmount - payerAmount;

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (type === 'split') {
        await onSubmit(type, payerAmount, creatorAmount);
      } else if (type === 'refund') {
        await onSubmit(type, invoiceAmount, 0);
      } else {
        await onSubmit(type, 0, invoiceAmount);
      }
      toast.success('Resolution proposed');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to propose resolution'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h4 className="font-medium">Propose Resolution</h4>

      <div className="space-y-2">
        <Label>Resolution Type</Label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as ResolutionType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="release">Full Release to Creator</SelectItem>
            <SelectItem value="refund">Full Refund to Payer</SelectItem>
            <SelectItem value="split">Custom Split</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {type === 'split' && (
        <div className="space-y-3">
          <div>
            <Label>Amount to Payer</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={invoiceAmount}
              value={payerAmount}
              onChange={(e) =>
                setPayerAmount(
                  Math.min(Number(e.target.value), invoiceAmount)
                )
              }
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Payer receives: {formatUSDC(payerAmount * 1e6)}</p>
            <p>Creator receives: {formatUSDC(creatorAmount * 1e6)}</p>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Propose Resolution'
        )}
      </Button>
    </div>
  );
}
