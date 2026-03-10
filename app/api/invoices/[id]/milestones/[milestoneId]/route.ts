import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const { id, milestoneId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  const body = await req.json();
  const { status } = body;

  if (!['funded', 'approved', 'released'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = await createClient();

  // 'approved' and 'released' are creator-only actions; verify ownership
  if (status !== 'funded') {
    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invoice } = await supabase
      .from('invoices')
      .select('creator_wallet')
      .eq('id', id)
      .single();

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.creator_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = { status };
  if (status === 'released') {
    updateData.released_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('milestones')
    .update(updateData)
    .eq('id', milestoneId)
    .eq('invoice_id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Convert micro USDC back to USDC for frontend
  const milestone = data
    ? { ...data, amount: Number(data.amount) / 1_000_000 }
    : null;

  return Response.json({ milestone });
}
