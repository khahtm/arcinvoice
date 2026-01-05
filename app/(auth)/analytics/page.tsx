'use client';

import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StatCards } from '@/components/analytics/StatCards';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { ClientBreakdown } from '@/components/analytics/ClientBreakdown';
import { StatusDistribution } from '@/components/analytics/StatusDistribution';
import { ExportButton } from '@/components/analytics/ExportButton';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();

  const { data, isLoading, error, exportCSV } = useAnalytics(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          <ExportButton onClick={exportCSV} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-12">{error}</p>
      ) : data ? (
        <>
          <StatCards stats={data.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={data.monthly} />
            <StatusDistribution data={data.statusDistribution} />
          </div>

          <ClientBreakdown clients={data.clients} />
        </>
      ) : (
        <p className="text-muted-foreground text-center py-12">No data available</p>
      )}
    </div>
  );
}
