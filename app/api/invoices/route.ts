import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateShortCode } from '@/lib/utils';
import { invoiceSchema } from '@/lib/validation';
import { z } from 'zod';

export async function GET() {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('creator_wallet', walletAddress)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ invoices: data });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = invoiceSchema.parse(body);

    const supabase = await createClient();

    // Determine contract version: v3 if milestones (pay-per-milestone), v1 otherwise
    const hasMilestones = validatedData.milestones && validatedData.milestones.length > 0;
    const contractVersion = hasMilestones ? 3 : 1;

    // Create invoice (exclude milestones from insert)
    const { milestones, ...invoiceData } = validatedData;
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        auto_release_days: invoiceData.auto_release_days ?? 14,
        short_code: generateShortCode(),
        creator_wallet: walletAddress,
        status: 'pending',
        contract_version: contractVersion,
      })
      .select()
      .single();

    if (invoiceError) {
      return Response.json({ error: invoiceError.message }, { status: 500 });
    }

    // Create milestones if provided
    if (milestones && milestones.length > 0) {
      const milestonesWithInvoiceId = milestones.map((m, i) => ({
        invoice_id: invoice.id,
        order_index: i,
        amount: Math.round(m.amount * 1_000_000), // Convert USDC to micro USDC for bigint
        description: m.description,
        status: 'pending',
      }));

      const { error: milestonesError } = await supabase
        .from('milestones')
        .insert(milestonesWithInvoiceId);

      if (milestonesError) {
        // Rollback: delete the invoice if milestones failed
        await supabase.from('invoices').delete().eq('id', invoice.id);
        return Response.json({ error: milestonesError.message }, { status: 500 });
      }
    }

    return Response.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
