'use client';

import { useState, useEffect } from 'react';
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
  // Track input values as strings to allow typing "0.49" properly
  const [inputValues, setInputValues] = useState<string[]>([]);

  // Sync input values when milestones change externally
  useEffect(() => {
    setInputValues(milestones.map((m) => (m.amount === 0 ? '' : String(m.amount))));
  }, [milestones.length]);

  const addMilestone = () => {
    if (milestones.length >= 10) return;
    onChange([...milestones, { amount: 0, description: '' }]);
    setInputValues([...inputValues, '']);
  };

  const removeMilestone = (index: number) => {
    onChange(milestones.filter((_, i) => i !== index));
    setInputValues(inputValues.filter((_, i) => i !== index));
  };

  const updateAmount = (index: number, value: string) => {
    // Update display value immediately
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);

    // Update numeric value in milestones
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    const updated = [...milestones];
    updated[index] = { ...updated[index], amount: numValue };
    onChange(updated);
  };

  const updateDescription = (index: number, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], description: value };
    onChange(updated);
  };

  // Compare amounts with tolerance for floating point
  const currentSum = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const isValid = Math.abs(currentSum - totalAmount) < 0.001;
  const remaining = totalAmount - currentSum;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>Milestones</Label>
        <span
          className={`text-sm ${isValid ? 'text-green-600' : 'text-orange-600'}`}
        >
          {formatUSDC(currentSum)} / {formatUSDC(totalAmount)}
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
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                placeholder="0.00"
                value={inputValues[index] ?? ''}
                onChange={(e) => updateAmount(index, e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Input
                placeholder="Description"
                value={milestone.description}
                onChange={(e) => updateDescription(index, e.target.value)}
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
            ? `${formatUSDC(remaining)} remaining to allocate`
            : `${formatUSDC(Math.abs(remaining))} over budget`}
        </p>
      )}
    </div>
  );
}
