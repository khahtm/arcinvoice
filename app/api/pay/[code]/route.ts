import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// GET: Fetch invoice by short code (public endpoint)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('short_code', code.toUpperCase())
    .single();

  if (error || !data) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Return only necessary public data
  return Response.json({
    invoice: {
      id: data.id,
      short_code: data.short_code,
      amount: data.amount,
      description: data.description,
      payment_type: data.payment_type,
      status: data.status,
      creator_wallet: data.creator_wallet,
      escrow_address: data.escrow_address,
      auto_release_days: data.auto_release_days,
      contract_version: data.contract_version,
    },
  });
}

// PATCH: Update invoice status after payment
const updateSchema = z.object({
  status: z.enum(['funded', 'released']),
  // Accept both on-chain tx hashes (0x...) and Transak order IDs (transak:...)
  tx_hash: z.string().regex(/^(0x[a-fA-F0-9]{64}|transak:[a-zA-Z0-9-]+)$/, 'Invalid transaction hash'),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    // Use admin client to bypass RLS - payer is not the invoice creator
    const supabase = createAdminClient();

    // Get current invoice
    const { data: existing } = await supabase
      .from('invoices')
      .select('status')
      .eq('short_code', code.toUpperCase())
      .single();

    if (!existing) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate status transition
    if (existing.status !== 'pending') {
      return Response.json(
        { error: `Cannot update invoice with status: ${existing.status}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: validatedData.status,
        tx_hash: validatedData.tx_hash,
        funded_at: new Date().toISOString(),
      })
      .eq('short_code', code.toUpperCase())
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ invoice: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
