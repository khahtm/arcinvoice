import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { resend, FROM_EMAIL, isEmailEnabled } from '@/lib/email/resend';
import { emailVerificationEmail } from '@/lib/email/templates';
import { nanoid } from 'nanoid';

export async function GET() {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    preferences: data || { wallet_address: walletAddress },
  });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = await createClient();

  // Check if email changed
  if (body.email && isEmailEnabled()) {
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('email')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (!existing || existing.email !== body.email) {
      // New email - send verification
      const token = nanoid(32);

      body.email_verified = false;
      body.email_verification_token = token;
      body.email_verification_sent_at = new Date().toISOString();

      // Send verification email
      try {
        const template = emailVerificationEmail(token);
        await resend!.emails.send({
          from: FROM_EMAIL,
          to: body.email,
          subject: template.subject,
          html: template.html,
        });
      } catch (err) {
        console.error('Failed to send verification:', err);
      }
    }
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      wallet_address: walletAddress,
      ...body,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data });
}
