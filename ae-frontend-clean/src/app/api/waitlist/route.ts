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

    if (RESEND_API_KEY) {
      try {
        const subject = `New waitlist signup: ${email}`;
        const text = `A new user joined the waitlist: ${email}\n\nVisit your dashboard to follow up.`;
        // Always notify the owner Gmail in addition to any configured ADMIN_EMAIL
        const OWNER_GMAIL = 'marquiseedwards00@gmail.com';
        const recipients = [] as string[];
        if (ADMIN_EMAIL) recipients.push(ADMIN_EMAIL);
        recipients.push(OWNER_GMAIL);
        const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM_EMAIL, to: uniqueRecipients, subject, text }),
        });
        console.log('[waitlist] admin(s) notified:', uniqueRecipients);
      } catch (e) {
        console.warn('[waitlist] admin notify failed', e);
      }
    } else {
      console.warn('[waitlist] RESEND_API_KEY not configured — admin not notified');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
