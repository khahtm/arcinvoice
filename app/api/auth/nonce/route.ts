import { generateNonce } from 'siwe';
import { cookies } from 'next/headers';

export async function GET() {
  const nonce = generateNonce();

  const cookieStore = await cookies();
  cookieStore.set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 5, // 5 minutes
  });

  return Response.json({ nonce });
}
