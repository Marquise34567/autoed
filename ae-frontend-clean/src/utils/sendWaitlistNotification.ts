import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const TO_EMAIL = process.env.WAITLIST_NOTIFICATION_EMAIL || 'marquiseedwards00@gmail.com';

const resend = new Resend(RESEND_API_KEY);

export async function sendWaitlistNotification(data: { email: string; ip?: string; userAgent?: string }) {
  if (!RESEND_API_KEY) {
    console.warn('[sendWaitlistNotification] RESEND_API_KEY not set — skipping send');
    return;
  }

  const subject = '🎉 Congrats — Another User Joined Your Waitlist';
  const html = `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#0f172a">
      <h2>New Waitlist Signup</h2>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>IP:</strong> ${data.ip ?? 'Unknown'}</p>
      <p><strong>User Agent:</strong> ${data.userAgent ?? 'Unknown'}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Waitlist <onboarding@${(TO_EMAIL || 'example.com').split('@')[1]}>`,
      to: TO_EMAIL,
      subject,
      html,
    });
    console.log('[sendWaitlistNotification] sent to', TO_EMAIL);
  } catch (err) {
    console.warn('[sendWaitlistNotification] send failed', err);
    throw err;
  }
}
