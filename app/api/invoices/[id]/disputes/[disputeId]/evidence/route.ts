import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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
  const { content, file_url } = body;

  if (!content || content.length < 10) {
    return Response.json(
      { error: 'Content must be at least 10 characters' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dispute_evidence')
    .insert({
      dispute_id: disputeId,
      submitted_by: walletAddress,
      content,
      file_url,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ evidence: data }, { status: 201 });
}
