'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { MilestoneInput } from '@/types/database';
import { formatUSDC } from '@/lib/utils';

interface MilestoneInputListProps {
  milestones: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
  totalAmount: number;
}

export function MilestoneInputList({
  milestones,
  onChange,
  totalAmount,
}: MilestoneInputListProps) {
  const addMilestone = () => {
    if (milestones.length >= 10) return;
    onChange([...milestones, { amount: 0, description: '' }]);
  };

  const removeMilestone = (index: number) => {
    onChange(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (
    index: number,
    field: keyof MilestoneInput,
    value: string | number
  ) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  // Convert totalAmount to smallest units for comparison
  const totalInUnits = Math.round(totalAmount * 1e6);
  const currentSum = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const currentSumInUnits = Math.round(currentSum * 1e6);
  const isValid = currentSumInUnits === totalInUnits;
  const remaining = totalAmount - currentSum;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>Milestones</Label>
        <span
          className={`text-sm ${isValid ? 'text-green-600' : 'text-orange-600'}`}
        >
          {formatUSDC(currentSum * 1e6)} / {formatUSDC(totalAmount * 1e6)}
        </span>
      </div>

      {milestones.map((milestone, index) => (
        <Card key={index} className="p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Milestone {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMilestone(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={milestone.amount || ''}
                onChange={(e) =>
                  updateMilestone(index, 'amount', Number(e.target.value))
                }
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={milestone.description}
                onChange={(e) =>
                  updateMilestone(index, 'description', e.target.value)
                }
              />
            </div>
          </div>
        </Card>
      ))}

      {milestones.length < 10 && (
        <Button
          type="button"
          variant="outline"
          onClick={addMilestone}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      )}

      {!isValid && milestones.length > 0 && (
        <p className="text-sm text-orange-600">
          {remaining > 0
            ? `${formatUSDC(remaining * 1e6)} remaining to allocate`
            : `${formatUSDC(Math.abs(remaining) * 1e6)} over budget`}
        </p>
      )}
    </div>
  );
}
