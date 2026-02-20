import { NextResponse } from 'next/server'
import { sendWaitlistNotification } from '@/utils/sendWaitlistNotification'
import { existsEmail, addEntry } from '@/utils/waitlistStore'
// Simple in-memory rate limiter per IP (resets on server restart)
const ipBuckets: Map<string, number[]> = new Map();
const RATE_LIMIT_MAX = 5; // per window
const RATE_LIMIT_WINDOW = 1000 * 60 * 60; // 1 hour

function isRateLimited(ip?: string) {
  if (!ip) return false;
  const now = Date.now();
  const arr = ipBuckets.get(ip) || [];
  filtered.push(now);
  ipBuckets.set(ip, filtered);
  return filtered.length > RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim();
  if (!email) return NextResponse.json({ ok: false, error: 'missing email' }, { status: 400 });

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });

  // Obtain IP and User-Agent (best-effort)
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('x-client-ip') || '').split(',')[0].trim() || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;

  if (isRateLimited(ip)) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  // Prevent duplicate signups
  const already = await existsEmail(email);
  if (already) {
      console.log('[waitlist] duplicate signup ignored:', email);
      return NextResponse.json({ ok: true, duplicate: true });
    }
  // Persist entry (file-backed fallback)
  await addEntry(email, ip, userAgent);
  console.log('[waitlist] saved:', email);
    // Send notification immediately (do not batch)
    try {
      await sendWaitlistNotification({ email, ip, userAgent });
    } catch (err) {
      console.warn('[waitlist] notification failed', err);
      // still return success since signup persisted; but surface warning
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[waitlist] error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
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

        const notifyRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: FROM_EMAIL, to: uniqueRecipients, subject, text }),
        });
        if (!notifyRes.ok) {
          const bodyText = await notifyRes.text().catch(() => 'unable to read body');
          console.warn('[waitlist] notify API returned non-OK', notifyRes.status, bodyText);
        } else {
          console.log('[waitlist] admin(s) notified:', uniqueRecipients);
        }
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
