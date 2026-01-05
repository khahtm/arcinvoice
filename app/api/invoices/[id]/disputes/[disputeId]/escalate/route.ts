import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createMetaEvidence } from '@/lib/kleros/client';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { id: invoiceId, disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Get dispute with invoice
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('*, invoices(*)')
    .eq('id', disputeId)
    .eq('invoice_id', invoiceId)
    .single();

  if (disputeError || !dispute) {
    return Response.json({ error: 'Dispute not found' }, { status: 404 });
  }

  // Check if user is creator or payer (both can escalate)
  const invoice = dispute.invoices;
  const isCreator = invoice.creator_wallet.toLowerCase() === walletAddress.toLowerCase();
  // Note: payer check would require knowing payer wallet from escrow

  if (!isCreator) {
    return Response.json({ error: 'Only dispute parties can escalate' }, { status: 403 });
  }

  // Check if dispute can be escalated
  if (!['open', 'proposed'].includes(dispute.status)) {
    return Response.json(
      { error: `Cannot escalate dispute with status: ${dispute.status}` },
      { status: 400 }
    );
  }

  // Check if already escalated
  const { data: existingCase } = await supabase
    .from('kleros_cases')
    .select('id')
    .eq('dispute_id', disputeId)
    .limit(1);

  if (existingCase?.length) {
    return Response.json({ error: 'Already escalated to Kleros' }, { status: 400 });
  }

  // Create Kleros case record
  const evidenceDeadline = new Date();
  evidenceDeadline.setDate(evidenceDeadline.getDate() + 7); // 7 days for evidence

  const { data: klerosCase, error: insertError } = await supabase
    .from('kleros_cases')
    .insert({
      dispute_id: disputeId,
      status: 'pending',
      evidence_deadline: evidenceDeadline.toISOString(),
      arbitration_fee_paid_by: walletAddress,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Update dispute status to escalated
  await supabase.from('disputes').update({ status: 'escalated' }).eq('id', disputeId);

  // Generate meta-evidence for Kleros
  const metaEvidence = createMetaEvidence(
    invoice.short_code,
    invoice.amount,
    dispute.reason
  );

  return Response.json(
    {
      klerosCase,
      message: 'Dispute escalated. Complete Kleros transaction in your wallet.',
      arbitrationData: {
        metaEvidence,
        escrowAddress: invoice.escrow_address,
        invoiceAmount: invoice.amount,
      },
    },
    { status: 201 }
  );
}
