import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('invoice_id', id)
    .order('order_index');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ milestones: data });
}
