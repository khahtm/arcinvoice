import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Whitelist of fields that can be updated by the invoice creator
const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  client_name: z.string().max(255).optional().nullable(),
  client_email: z.string().email().optional().nullable(),
}).strict();

// GET is intentionally public - payers need to view invoice details
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 });
  }

  return Response.json({ invoice: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    // Don't allow empty updates
    if (Object.keys(validatedData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify ownership and status
    const { data: existing } = await supabase
      .from('invoices')
      .select('creator_wallet, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existing.creator_wallet !== walletAddress) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow updates on pending/draft invoices
    if (!['pending', 'draft'].includes(existing.status)) {
      return Response.json(
        { error: 'Cannot update invoice after payment' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(validatedData)
      .eq('id', id)
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
