'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { dealSchema, type DealFormData } from '@/lib/validation';
import { formatUSDC } from '@/lib/utils';
import { DealBuilderPrompt } from './deal-builder-prompt';
import type { AIMilestone } from '@/lib/ai/types';

interface DealFormProps {
  onSubmit: (data: DealFormData) => Promise<void>;
  isLoading?: boolean;
  initialValues?: {
    description: string;
    milestones: { description: string; amount: number }[];
    client_name?: string;
    client_email?: string;
    client_wallet?: string;
    auto_release_days?: number;
  };
  submitLabel?: string;
  loadingLabel?: string;
}

export function DealForm({
  onSubmit,
  isLoading,
  initialValues,
  submitLabel = 'Create Deal',
  loadingLabel = 'Creating Deal...',
}: DealFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      auto_release_days: initialValues?.auto_release_days ?? 14,
      description: initialValues?.description || '',
      client_name: initialValues?.client_name || '',
      client_email: initialValues?.client_email || '',
      client_wallet: initialValues?.client_wallet || '',
      milestones: initialValues?.milestones?.length ? initialValues.milestones : [{ description: '', amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones',
  });

  const description = watch('description') as string | undefined;
  const milestones = watch('milestones') as { description: string; amount: number }[] | undefined;
  const total = milestones?.reduce((sum: number, m: { amount: number }) => sum + (Number(m.amount) || 0), 0) || 0;

  const [displayTotal, setDisplayTotal] = useState(total);
  const prevTotal = useRef(total);
  const rafRef = useRef<number>(0);

  const animateTotal = useCallback((from: number, to: number) => {
    cancelAnimationFrame(rafRef.current);
    const duration = 350;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayTotal(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (total !== prevTotal.current) {
      animateTotal(prevTotal.current, total);
      prevTotal.current = total;
    }
  }, [total, animateTotal]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <Label htmlFor="description">Deal Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the project scope and expectations..."
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="client_name">Client Name (optional)</Label>
          <Input id="client_name" placeholder="John Doe" {...register('client_name')} />
        </div>
        <div>
          <Label htmlFor="client_email">Client Email (optional)</Label>
          <Input id="client_email" type="email" placeholder="client@email.com" {...register('client_email')} />
        </div>
      </div>

      <div>
        <Label htmlFor="client_wallet">Client Wallet (optional)</Label>
        <Input id="client_wallet" placeholder="0x..." className="font-mono" {...register('client_wallet')} />
        {errors.client_wallet && (
          <p className="text-sm text-destructive mt-1">{errors.client_wallet.message as string}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          If set, only this wallet can accept and fund the deal. Leave blank to let any client sign.
        </p>
      </div>

      {/* AI Deal Builder */}
      <DealBuilderPrompt
        currentDescription={description}
        onApply={(aiMilestones: AIMilestone[], aiDescription: string) => {
          setValue('milestones', aiMilestones.map((m) => ({ description: m.description, amount: m.amount })));
          if (aiDescription && !description) {
            setValue('description', aiDescription);
          }
        }}
      />

      {/* Milestones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Milestones</Label>
          <span className="text-sm text-muted-foreground">{fields.length}/20</span>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground shrink-0">
                  {index + 1}.
                </span>
                <Input
                  placeholder="Milestone description..."
                  className="flex-1"
                  {...register(`milestones.${index}.description`)}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(errors.milestones as Record<number, Record<string, { message?: string }>> | undefined)?.[index]?.description && (
                <p className="text-xs text-destructive ml-7">{(errors.milestones as Record<number, Record<string, { message?: string }>>)[index].description?.message}</p>
              )}
              <div className="flex items-center gap-3 ml-7">
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    {...register(`milestones.${index}.amount`, { valueAsNumber: true })}
                  />
                </div>
                {(errors.milestones as Record<number, Record<string, { message?: string }>> | undefined)?.[index]?.amount && (
                  <p className="text-xs text-destructive">{(errors.milestones as Record<number, Record<string, { message?: string }>>)[index].amount?.message}</p>
                )}
              </div>
            </Card>
          ))}
        </div>

        {fields.length < 20 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', amount: 0 })}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Milestone
          </Button>
        )}

        {(errors.milestones as { root?: { message?: string } } | undefined)?.root && (
          <p className="text-sm text-destructive">{(errors.milestones as { root: { message?: string } }).root.message}</p>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="font-semibold">Total Deal Amount</span>
          <span className="text-xl font-medium font-mono text-[#005FFE] transition-transform duration-200">{formatUSDC(displayTotal)}</span>
        </div>
      </div>

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
          Funds auto-release to freelancer if client doesn&apos;t respond within this period
        </p>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
