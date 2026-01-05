import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('start');
  const endDate = url.searchParams.get('end');

  const supabase = await createClient();

  // Build query with optional date filter
  let query = supabase
    .from('invoices')
    .select('id, amount, status, payment_type, client_email, client_name, created_at')
    .eq('creator_wallet', walletAddress);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: summary, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Calculate stats (amounts in micro USDC, convert to USDC for display)
  const toUSDC = (micro: number) => micro / 1_000_000;

  const stats = {
    totalInvoices: summary?.length || 0,
    totalRevenue: toUSDC(
      summary?.filter((i) => i.status === 'released').reduce((s, i) => s + i.amount, 0) || 0
    ),
    pendingRevenue: toUSDC(
      summary?.filter((i) => i.status === 'funded').reduce((s, i) => s + i.amount, 0) || 0
    ),
    unpaidAmount: toUSDC(
      summary
        ?.filter((i) => ['pending', 'draft'].includes(i.status))
        .reduce((s, i) => s + i.amount, 0) || 0
    ),
    escrowCount: summary?.filter((i) => i.payment_type === 'escrow').length || 0,
    directCount: summary?.filter((i) => i.payment_type === 'direct').length || 0,
    // Estimate fees: 1% on released escrow invoices
    feesPaid: toUSDC(
      summary
        ?.filter((i) => i.status === 'released' && i.payment_type === 'escrow')
        .reduce((s, i) => s + Math.floor(i.amount * 0.01), 0) || 0
    ),
    uniqueClients: new Set(
      summary?.map((i) => i.client_email || i.client_name).filter(Boolean)
    ).size,
  };

  // Monthly breakdown (last 12 months)
  const monthlyData =
    summary
      ?.filter((i) => i.status === 'released')
      .reduce(
        (acc, inv) => {
          const month = new Date(inv.created_at).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + inv.amount;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

  // Client breakdown (top 10 by revenue)
  const clientData =
    summary
      ?.filter((i) => i.status === 'released')
      .reduce(
        (acc, inv) => {
          const client = inv.client_email || inv.client_name || 'Anonymous';
          if (!acc[client]) {
            acc[client] = { invoiceCount: 0, totalPaid: 0 };
          }
          acc[client].invoiceCount++;
          acc[client].totalPaid += inv.amount;
          return acc;
        },
        {} as Record<string, { invoiceCount: number; totalPaid: number }>
      ) || {};

  // Status distribution
  const statusData =
    summary?.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

  return Response.json({
    stats,
    monthly: Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount: toUSDC(amount) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    clients: Object.entries(clientData)
      .map(([client, data]) => ({
        client,
        invoiceCount: data.invoiceCount,
        totalPaid: toUSDC(data.totalPaid),
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10),
    statusDistribution: Object.entries(statusData).map(([status, count]) => ({
      status,
      count,
    })),
  });
}
