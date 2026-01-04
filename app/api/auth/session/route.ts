import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const address = cookieStore.get('wallet-address')?.value;

  return Response.json({ address: address || null });
}
