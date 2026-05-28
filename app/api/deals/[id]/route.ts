import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { dealSchema } from '@/lib/validation';
import { z } from 'zod';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet-address')?.value;

    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: deal, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('deal_mode', true)
      .single();

    if (error || !deal) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }

    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('invoice_id', id)
      .order('order_index', { ascending: true });

    const fromMicro = (n: number) => n / 1_000_000;
    return Response.json({
      deal: {
        ...deal,
        amount: fromMicro(deal.amount),
        milestones: (milestones || []).map((m: { amount: number }) => ({
          ...m,
          amount: fromMicro(m.amount),
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Deal fetch failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

// Edit a draft deal's content in place. Only allowed before the on-chain
// escrow is deployed (deal_status 'draft' and no escrow_address), since the
// terms are locked once the contract exists.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet-address')?.value;

    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = dealSchema.parse(await req.json());
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('invoices')
      .select('creator_wallet, deal_status, escrow_address')
      .eq('id', id)
      .eq('deal_mode', true)
      .single();

    if (fetchError || !existing) {
      return Response.json({ error: 'Deal not found' }, { status: 404 });
    }
    if (existing.creator_wallet !== walletAddress) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (existing.deal_status !== 'draft' || existing.escrow_address) {
      return Response.json(
        { error: 'Deal can no longer be edited (escrow already deployed)' },
        { status: 409 }
      );
    }

    const toMicro = (n: number) => Math.round(n * 1_000_000);
    const totalAmount = toMicro(data.milestones.reduce((sum, m) => sum + m.amount, 0));

    const { data: deal, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount: totalAmount,
        description: data.description,
        client_name: data.client_name || null,
        client_email: data.client_email || null,
        expected_client_wallet: data.client_wallet || null,
        auto_release_days: data.auto_release_days,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    // Replace milestones (safe: no escrow exists yet)
    await supabase.from('milestones').delete().eq('invoice_id', id);
    const milestoneRows = data.milestones.map((m, i) => ({
      invoice_id: id,
      order_index: i,
      amount: toMicro(m.amount),
      description: m.description,
      status: 'pending',
    }));
    const { data: milestones, error: msError } = await supabase
      .from('milestones')
      .insert(milestoneRows)
      .select();

    if (msError) {
      return Response.json({ error: msError.message }, { status: 500 });
    }

    return Response.json({
      deal: {
        ...deal,
        amount: deal.amount / 1_000_000,
        milestones: (milestones || []).map((m: { amount: number }) => ({
          ...m,
          amount: m.amount / 1_000_000,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Deal edit failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet-address')?.value;

    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const allowedFields = [
      'deal_status', 'escrow_address', 'tx_hash', 'status',
      'client_wallet', 'expected_client_wallet', 'client_signed_at', 'creator_signed_at',
      'last_activity_at', 'dispute_reason', 'disputed_milestone_index',
      'terms_hash', 'funded_at',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: deal, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('deal_mode', true)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      deal: { ...deal, amount: deal.amount / 1_000_000 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Deal update failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
