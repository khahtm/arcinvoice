import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Get Kleros case for this dispute
  const { data: klerosCase, error } = await supabase
    .from('kleros_cases')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Get evidence if case exists
  let evidence: unknown[] = [];
  if (klerosCase) {
    const { data: evidenceData } = await supabase
      .from('kleros_evidence')
      .select('*')
      .eq('case_id', klerosCase.id)
      .order('created_at', { ascending: true });

    evidence = evidenceData || [];
  }

  return Response.json({
    klerosCase: klerosCase || null,
    evidence,
  });
}
