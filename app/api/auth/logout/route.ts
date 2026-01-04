import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('wallet-address');
  return Response.json({ success: true });
}
