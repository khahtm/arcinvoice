import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { verifyMessage } from 'viem';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { walletAddress, signature, message } = body;

  const cookieStore = await cookies();
  const authenticatedWallet = cookieStore.get('wallet-address')?.value;
  const resolvedWallet = authenticatedWallet || walletAddress;

  if (!resolvedWallet) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!authenticatedWallet) {
    if (!signature || !message) {
      return Response.json({ error: 'Wallet signature required' }, { status: 400 });
    }

    const valid = await verifyMessage({
      address: resolvedWallet as `0x${string}`,
      message,
      signature,
    });

    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const supabase = await createClient();

  const { data: deal } = await supabase
    .from('invoices')
    .select('creator_wallet, deal_status, short_code, expected_client_wallet')
    .eq('id', id)
    .eq('deal_mode', true)
    .single();

  if (!deal) {
    return Response.json({ error: 'Deal not found' }, { status: 404 });
  }

  if (resolvedWallet.toLowerCase() === deal.creator_wallet.toLowerCase()) {
    return Response.json({ error: 'Cannot sign your own deal' }, { status: 400 });
  }

  if (
    deal.expected_client_wallet &&
    resolvedWallet.toLowerCase() !== deal.expected_client_wallet.toLowerCase()
  ) {
    return Response.json(
      { error: 'This deal is reserved for a different wallet.' },
      { status: 403 }
    );
  }

  if (deal.deal_status !== 'draft') {
    return Response.json({ error: 'Deal already signed' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('invoices')
    .update({
      client_wallet: resolvedWallet,
      client_signed_at: new Date().toISOString(),
      deal_status: 'signed',
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    deal: { ...updated, amount: updated.amount / 1_000_000 },
  });
}
