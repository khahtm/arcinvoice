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

  let query = supabase
    .from('invoices')
    .select(
      'short_code, amount, description, payment_type, status, client_name, client_email, created_at, funded_at'
    )
    .eq('creator_wallet', walletAddress)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: invoices, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Convert micro USDC to USDC
  const toUSDC = (micro: number) => (micro / 1_000_000).toFixed(2);

  // Build CSV
  const headers = [
    'Invoice Code',
    'Amount (USDC)',
    'Description',
    'Payment Type',
    'Status',
    'Client Name',
    'Client Email',
    'Fee (USDC)',
    'Created',
    'Paid',
  ];

  const escapeCSV = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Calculate estimated fee: 1% for released escrow invoices
  const calcFee = (inv: { amount: number; payment_type: string; status: string }) =>
    inv.status === 'released' && inv.payment_type === 'escrow'
      ? Math.floor(inv.amount * 0.01)
      : 0;

  const rows =
    invoices?.map((inv) => [
      inv.short_code,
      toUSDC(inv.amount),
      escapeCSV(inv.description || ''),
      inv.payment_type,
      inv.status,
      escapeCSV(inv.client_name || ''),
      inv.client_email || '',
      toUSDC(calcFee(inv)),
      new Date(inv.created_at).toISOString().split('T')[0],
      inv.funded_at ? new Date(inv.funded_at).toISOString().split('T')[0] : '',
    ]) || [];

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="arc-invoice-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
