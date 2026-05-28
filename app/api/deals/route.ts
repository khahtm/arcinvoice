import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateShortCode } from '@/lib/utils';
import { dealSchema } from '@/lib/validation';
import { z } from 'zod';

// Simple in-memory rate limit: 10 deals per wallet per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(wallet: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(wallet);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(wallet, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet-address')?.value;

    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: deals, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('creator_wallet', walletAddress)
      .eq('deal_mode', true)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const dealIds = deals.map((d: { id: string }) => d.id);
    let milestones: Record<string, unknown[]> = {};

    if (dealIds.length > 0) {
      const { data: ms } = await supabase
        .from('milestones')
        .select('*')
        .in('invoice_id', dealIds)
        .order('order_index', { ascending: true });

      if (ms) {
        for (const m of ms) {
          if (!milestones[m.invoice_id]) milestones[m.invoice_id] = [];
          milestones[m.invoice_id].push(m);
        }
      }
    }

    const fromMicro = (n: number) => n / 1_000_000;
    const result = deals.map((deal: { id: string; amount: number }) => ({
      ...deal,
      amount: fromMicro(deal.amount),
      milestones: ((milestones[deal.id] || []) as Array<{ amount: number }>).map((m) => ({
        ...m,
        amount: fromMicro(m.amount),
      })),
    }));

    return Response.json({ deals: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Deals fetch failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const walletAddress = cookieStore.get('wallet-address')?.value;

    if (!walletAddress) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(walletAddress)) {
      return Response.json({ error: 'Rate limit exceeded. Max 10 deals per hour.' }, { status: 429 });
    }

    const body = await req.json();
    const data = dealSchema.parse(body);

    const toMicro = (n: number) => Math.round(n * 1_000_000);
    const totalAmount = toMicro(data.milestones.reduce((sum, m) => sum + m.amount, 0));
    const supabase = await createClient();

    const { data: deal, error: dealError } = await supabase
      .from('invoices')
      .insert({
        short_code: generateShortCode(),
        creator_wallet: walletAddress,
        amount: totalAmount,
        description: data.description,
        payment_type: 'escrow',
        client_name: data.client_name || null,
        client_email: data.client_email || null,
        expected_client_wallet: data.client_wallet || null,
        status: 'pending',
        auto_release_days: data.auto_release_days,
        contract_version: 6,
        deal_mode: true,
        deal_status: 'draft',
      })
      .select()
      .single();

    if (dealError) {
      return Response.json({ error: dealError.message }, { status: 500 });
    }

    const milestoneRows = data.milestones.map((m, i) => ({
      invoice_id: deal.id,
      order_index: i,
      amount: toMicro(m.amount),
      description: m.description,
      status: 'pending',
    }));

    const { data: milestones, error: msError } = await supabase
      .from('milestones')
      .insert(milestoneRows)
      .select();

    if (msError) {
      return Response.json({ error: msError.message }, { status: 500 });
    }

    return Response.json({ deal: { ...deal, milestones } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Deal creation failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
