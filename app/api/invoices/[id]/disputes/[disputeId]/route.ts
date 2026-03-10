import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { id, disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action, resolution_type, payer_amount, creator_amount } = body;

  const supabase = await createClient();

  // Verify the caller is a party to this dispute (opener or invoice creator)
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('opened_by, resolution_type, invoices(creator_wallet)')
    .eq('id', disputeId)
    .eq('invoice_id', id)
    .single();

  if (disputeError || !dispute) {
    return Response.json({ error: 'Dispute not found' }, { status: 404 });
  }

  const invoiceCreator = (dispute.invoices as { creator_wallet: string } | null)?.creator_wallet;
  const isParty =
    dispute.opened_by.toLowerCase() === walletAddress.toLowerCase() ||
    invoiceCreator?.toLowerCase() === walletAddress.toLowerCase();

  if (!isParty) {
    return Response.json({ error: 'Only dispute parties can perform this action' }, { status: 403 });
  }

  if (action === 'propose') {
    // Propose resolution
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'proposed',
        resolution_type,
        resolution_payer_amount: payer_amount ?? 0,
        resolution_creator_amount: creator_amount ?? 0,
        proposed_by: walletAddress,
        proposed_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ dispute: data });
  }

  if (action === 'accept') {
    // Mark as resolved
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Update invoice status based on resolution
    const newStatus = dispute.resolution_type === 'refund' ? 'refunded' : 'released';
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id);

    return Response.json({ dispute: data });
  }

  if (action === 'reject') {
    // Reset to open for counter-proposal
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: 'open',
        resolution_type: null,
        resolution_payer_amount: null,
        resolution_creator_amount: null,
        proposed_by: null,
        proposed_at: null,
      })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ dispute: data });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
