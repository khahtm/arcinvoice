'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PaymentTypeSelector } from './PaymentTypeSelector';
import { MilestoneInputList } from './MilestoneInputList';
import { invoiceSchema, type InvoiceFormData } from '@/lib/validation';
import type { MilestoneInput } from '@/types/database';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  isLoading?: boolean;
}

export function InvoiceForm({ onSubmit, isLoading }: InvoiceFormProps) {
  const [enableMilestones, setEnableMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      payment_type: 'direct',
      auto_release_days: 14,
    },
  });

  const paymentType = watch('payment_type');
  const amount = watch('amount') || 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label>Payment Type</Label>
        <PaymentTypeSelector
          value={paymentType}
          onChange={(val) => setValue('payment_type', val)}
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (USDC)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-destructive mt-1">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What is this payment for?"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_name">Client Name (optional)</Label>
          <Input id="client_name" {...register('client_name')} />
        </div>
        <div>
          <Label htmlFor="client_email">Client Email (optional)</Label>
          <Input id="client_email" type="email" {...register('client_email')} />
        </div>
      </div>

      {paymentType === 'escrow' && (
        <>
          <div>
            <Label htmlFor="auto_release_days">Auto-release after (days)</Label>
            <Input
              id="auto_release_days"
              type="number"
              min="1"
              max="90"
              {...register('auto_release_days', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Funds auto-release if no dispute is raised
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-milestones">Enable Milestones</Label>
              <p className="text-sm text-muted-foreground">
                Split payment into multiple milestones
              </p>
            </div>
            <Switch
              id="enable-milestones"
              checked={enableMilestones}
              onCheckedChange={(checked) => {
                setEnableMilestones(checked);
                if (!checked) {
                  setMilestones([]);
                  setValue('milestones', undefined);
                }
              }}
            />
          </div>

          {enableMilestones && amount > 0 && (
            <MilestoneInputList
              milestones={milestones}
              onChange={(newMilestones) => {
                setMilestones(newMilestones);
                setValue('milestones', newMilestones);
              }}
              totalAmount={amount}
            />
          )}

          {enableMilestones && amount <= 0 && (
            <p className="text-sm text-muted-foreground">
              Enter an amount above to add milestones
            </p>
          )}
        </>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Invoice'}
      </Button>
    </form>
  );
}
