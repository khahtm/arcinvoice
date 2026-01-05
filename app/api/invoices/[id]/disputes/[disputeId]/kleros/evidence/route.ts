import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createEvidenceJSON, uploadEvidenceToIPFS } from '@/lib/kleros/evidence';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; disputeId: string }> }
) {
  const { disputeId } = await params;
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, fileUri } = body;

  if (!name || !description) {
    return Response.json({ error: 'Name and description required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Get Kleros case
  const { data: klerosCase, error: caseError } = await supabase
    .from('kleros_cases')
    .select('*')
    .eq('dispute_id', disputeId)
    .single();

  if (caseError || !klerosCase) {
    return Response.json({ error: 'Kleros case not found' }, { status: 404 });
  }

  // Check evidence deadline
  if (klerosCase.evidence_deadline && new Date(klerosCase.evidence_deadline) < new Date()) {
    return Response.json({ error: 'Evidence period has ended' }, { status: 400 });
  }

  // Create evidence JSON and upload to IPFS
  const evidenceJSON = createEvidenceJSON(name, description, fileUri);
  const ipfsUri = await uploadEvidenceToIPFS(evidenceJSON);

  // Store evidence record (even without IPFS URI for tracking)
  const { data: evidence, error: insertError } = await supabase
    .from('kleros_evidence')
    .insert({
      case_id: klerosCase.id,
      submitted_by: walletAddress,
      evidence_uri: ipfsUri || `local://${Date.now()}`, // Fallback if IPFS unavailable
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Update case status if still pending
  if (klerosCase.status === 'pending') {
    await supabase.from('kleros_cases').update({ status: 'evidence' }).eq('id', klerosCase.id);
  }

  return Response.json(
    {
      evidence,
      ipfsUri,
      message: ipfsUri ? 'Evidence uploaded to IPFS' : 'Evidence recorded (IPFS unavailable)',
    },
    { status: 201 }
  );
}
