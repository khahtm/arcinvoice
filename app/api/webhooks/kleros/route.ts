import { createAdminClient } from '@/lib/supabase/admin';
import { rulingToString, calculateRulingAmounts } from '@/lib/kleros/client';

/**
 * Kleros webhook endpoint for receiving rulings
 * In production, this should verify the webhook signature
 */
export async function POST(req: Request) {
  // TODO: Verify Kleros webhook signature
  const signature = req.headers.get('x-kleros-signature');
  if (!signature) {
    console.warn('Kleros webhook received without signature');
  }

  const body = await req.json();
  const { disputeId, ruling, txHash } = body;

  if (!disputeId || ruling === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find our case by Kleros dispute ID
  const { data: klerosCase, error: findError } = await supabase
    .from('kleros_cases')
    .select('*, disputes(invoice_id, invoices(amount))')
    .eq('kleros_dispute_id', disputeId)
    .single();

  if (findError || !klerosCase) {
    // Try finding by our internal dispute ID (for testing)
    const { data: altCase } = await supabase
      .from('kleros_cases')
      .select('*, disputes(invoice_id, invoices(amount))')
      .eq('dispute_id', disputeId)
      .single();

    if (!altCase) {
      return Response.json({ error: 'Kleros case not found' }, { status: 404 });
    }

    // Use the alternative case
    Object.assign(klerosCase || {}, altCase);
  }

  if (!klerosCase) {
    return Response.json({ error: 'Case not found' }, { status: 404 });
  }

  // Calculate amounts based on ruling
  const totalAmount = klerosCase.disputes?.invoices?.amount || 0;
  const { payerAmount, creatorAmount } = calculateRulingAmounts(ruling, totalAmount);
  const rulingStr = rulingToString(ruling);

  // Update case with ruling
  const { error: updateError } = await supabase
    .from('kleros_cases')
    .update({
      status: 'resolved',
      ruling: rulingStr,
      payer_amount: payerAmount,
      creator_amount: creatorAmount,
      ruling_at: new Date().toISOString(),
    })
    .eq('id', klerosCase.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  // Update dispute status
  await supabase.from('disputes').update({ status: 'resolved' }).eq('id', klerosCase.dispute_id);

  console.log(
    `Kleros ruling received: case=${klerosCase.id}, ruling=${rulingStr}, payer=${payerAmount}, creator=${creatorAmount}`
  );

  return Response.json({
    success: true,
    caseId: klerosCase.id,
    ruling: rulingStr,
    payerAmount,
    creatorAmount,
    txHash,
  });
}
