import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    redirect('/settings?error=invalid_token');
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({
      email_verified: true,
      email_verification_token: null,
    })
    .eq('email_verification_token', token)
    .select()
    .single();

  if (error || !data) {
    redirect('/settings?error=invalid_token');
  }

  redirect('/settings?email_verified=true');
}
