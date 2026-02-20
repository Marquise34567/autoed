import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    if (!email) return NextResponse.json({ ok: false, error: 'missing email' }, { status: 400 });
    console.log('[waitlist] signup:', email);

    // If an admin email + RESEND_API_KEY are configured, notify the admin
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com';

    if (ADMIN_EMAIL && RESEND_API_KEY) {
      try {
        const subject = `New waitlist signup: ${email}`;
        const text = `A new user joined the waitlist: ${email}\n\nVisit your dashboard to follow up.`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM_EMAIL, to: [ADMIN_EMAIL], subject, text }),
        });
        console.log('[waitlist] admin notified:', ADMIN_EMAIL);
      } catch (e) {
        console.warn('[waitlist] admin notify failed', e);
      }
    } else {
      console.warn('[waitlist] ADMIN_EMAIL or RESEND_API_KEY not configured — admin not notified');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
