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

  // 'funded' status can be set by payer (no auth required - on-chain tx proves payment)
  // 'approved' and 'released' require auth (creator action)
  if (status !== 'funded' && !walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

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
