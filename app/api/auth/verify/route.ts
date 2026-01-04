import { SiweMessage } from 'siwe';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { message, signature } = await req.json();
    const cookieStore = await cookies();

    const storedNonce = cookieStore.get('siwe-nonce')?.value;
    if (!storedNonce) {
      return Response.json({ error: 'Nonce expired' }, { status: 400 });
    }

    const siweMessage = new SiweMessage(message);
    const { success, data } = await siweMessage.verify({
      signature,
      nonce: storedNonce,
    });

    if (!success) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    cookieStore.delete('siwe-nonce');

    cookieStore.set('wallet-address', data.address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return Response.json({
      success: true,
      address: data.address,
    });
  } catch (error) {
    console.error('SIWE verify error:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
