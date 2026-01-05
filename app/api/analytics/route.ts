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
    .select('id, amount, status, payment_type, client_email, client_name, created_at, contract_version')
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

  // Get milestone data for V2/V3 invoices
  const invoiceIds = summary?.map((i) => i.id) || [];
  const { data: milestones } = invoiceIds.length > 0
    ? await supabase
        .from('milestones')
        .select('invoice_id, amount, status, released_at')
        .in('invoice_id', invoiceIds)
    : { data: [] };

  // Group milestones by invoice
  type MilestoneRow = { invoice_id: string; amount: number; status: string; released_at: string | null };
  const milestonesByInvoice = (milestones || []).reduce(
    (acc, m) => {
      if (!acc[m.invoice_id]) acc[m.invoice_id] = [];
      acc[m.invoice_id].push(m);
      return acc;
    },
    {} as Record<string, MilestoneRow[]>
  );

  // Calculate stats (amounts in micro USDC, convert to USDC for display)
  const toUSDC = (micro: number) => micro / 1_000_000;

  // Calculate revenue from both invoice-level and milestone-level
  let totalRevenue = 0;
  let pendingRevenue = 0;
  let unpaidAmount = 0;
  let feesPaid = 0;

  for (const inv of summary || []) {
    const invMilestones = milestonesByInvoice[inv.id];
    const hasMilestones = invMilestones && invMilestones.length > 0;

    if (hasMilestones) {
      // V2/V3: Calculate from milestones
      for (const m of invMilestones) {
        if (m.status === 'released') {
          totalRevenue += m.amount;
          if (inv.payment_type === 'escrow') {
            feesPaid += Math.floor(m.amount * 0.01);
          }
        } else if (m.status === 'funded') {
          pendingRevenue += m.amount;
        } else {
          unpaidAmount += m.amount;
        }
      }
    } else {
      // V1/Direct: Use invoice-level status
      if (inv.status === 'released') {
        totalRevenue += inv.amount;
        if (inv.payment_type === 'escrow') {
          feesPaid += Math.floor(inv.amount * 0.01);
        }
      } else if (inv.status === 'funded') {
        pendingRevenue += inv.amount;
      } else if (['pending', 'draft'].includes(inv.status)) {
        unpaidAmount += inv.amount;
      }
    }
  }

  const stats = {
    totalInvoices: summary?.length || 0,
    totalRevenue: toUSDC(totalRevenue),
    pendingRevenue: toUSDC(pendingRevenue),
    unpaidAmount: toUSDC(unpaidAmount),
    escrowCount: summary?.filter((i) => i.payment_type === 'escrow').length || 0,
    directCount: summary?.filter((i) => i.payment_type === 'direct').length || 0,
    feesPaid: toUSDC(feesPaid),
    uniqueClients: new Set(
      summary?.map((i) => i.client_email || i.client_name).filter(Boolean)
    ).size,
  };

  // Monthly breakdown - include milestone releases
  const monthlyData: Record<string, number> = {};
  for (const inv of summary || []) {
    const invMilestones = milestonesByInvoice[inv.id];
    const hasMilestones = invMilestones && invMilestones.length > 0;

    if (hasMilestones) {
      for (const m of invMilestones) {
        if (m.status === 'released' && m.released_at) {
          const month = new Date(m.released_at).toISOString().slice(0, 7);
          monthlyData[month] = (monthlyData[month] || 0) + m.amount;
        }
      }
    } else if (inv.status === 'released') {
      const month = new Date(inv.created_at).toISOString().slice(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + inv.amount;
    }
  }

  // Client breakdown - include milestone releases
  const clientData: Record<string, { invoiceCount: number; totalPaid: number }> = {};
  for (const inv of summary || []) {
    const client = inv.client_email || inv.client_name || 'Anonymous';
    const invMilestones = milestonesByInvoice[inv.id];
    const hasMilestones = invMilestones && invMilestones.length > 0;

    let paidAmount = 0;
    if (hasMilestones) {
      paidAmount = invMilestones
        .filter((m: { status: string }) => m.status === 'released')
        .reduce((sum: number, m: { amount: number }) => sum + m.amount, 0);
    } else if (inv.status === 'released') {
      paidAmount = inv.amount;
    }

    if (paidAmount > 0) {
      if (!clientData[client]) {
        clientData[client] = { invoiceCount: 0, totalPaid: 0 };
      }
      clientData[client].invoiceCount++;
      clientData[client].totalPaid += paidAmount;
    }
  }

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
