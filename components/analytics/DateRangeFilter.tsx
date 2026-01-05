'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onStartChange: (date: string | undefined) => void;
  onEndChange: (date: string | undefined) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Label htmlFor="start-date" className="sr-only">
          Start Date
        </Label>
        <Input
          id="start-date"
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartChange(e.target.value || undefined)}
          className="w-36"
        />
      </div>
      <span className="text-muted-foreground">to</span>
      <div className="flex items-center gap-1">
        <Label htmlFor="end-date" className="sr-only">
          End Date
        </Label>
        <Input
          id="end-date"
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndChange(e.target.value || undefined)}
          className="w-36"
        />
      </div>
    </div>
  );
}
