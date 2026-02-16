import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email) return NextResponse.json({ ok: false, error: 'missing email' }, { status: 400 });
    console.log('[waitlist] signup:', email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
