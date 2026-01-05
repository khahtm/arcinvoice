import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  const supabase = await createClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notifications: data });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { ids, markAllRead } = body;

  const supabase = await createClient();

  if (markAllRead) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('wallet_address', walletAddress)
      .eq('read', false);
  } else if (ids?.length) {
    await supabase.from('notifications').update({ read: true }).in('id', ids);
  }

  return Response.json({ success: true });
}
