import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disputes')
    .select('*, evidence:dispute_evidence(*)')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ dispute: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { reason } = body;

  if (!reason || reason.length < 10) {
    return Response.json(
      { error: 'Reason must be at least 10 characters' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check invoice is funded
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', id)
    .single();

  if (invoice?.status !== 'funded') {
    return Response.json(
      { error: 'Can only dispute funded invoices' },
      { status: 400 }
    );
  }

  // Check no existing open dispute
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('invoice_id', id)
    .in('status', ['open', 'proposed'])
    .limit(1);

  if (existing && existing.length > 0) {
    return Response.json({ error: 'Dispute already exists' }, { status: 400 });
  }

  // Create dispute with 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      invoice_id: id,
      opened_by: walletAddress,
      reason,
      status: 'open',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ dispute: data }, { status: 201 });
}
