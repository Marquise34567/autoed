import { NextResponse } from "next/server";

function backend() {
  // Prefer explicit server env, then public env (for Next dev), then fallback to production host
  let raw = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "").trim();
  if (!raw) {
    // Fallback to known production backend so local dev still works without env vars
    raw = "https://autoed-backend-production-70dd.up.railway.app";
  }

  raw = raw.replace(/\/+$/, "");
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`;
  }
  return raw;
}

function passAuth(req: Request) {
  const a = req.headers.get("authorization");
  return a ? { authorization: a } : {};
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const upstream = `${backend()}/api/jobs${u.search}`;

  try {
    const res = await fetch(upstream, {
      method: "GET",
      headers: { ...passAuth(req) },
      cache: "no-store",
    });

    // Pass-through: return the upstream response body and status directly.
    const text = await res.text().catch(() => '');
    const contentType = res.headers.get('content-type') || 'application/json';
    if (process.env.NODE_ENV === 'development') {
      try { console.log('[proxy:/api/jobs GET] upstream=', upstream, 'status=', res.status, 'body=', text?.slice ? text.slice(0, 1000) : text) } catch (_) {}
    }
    return new Response(text, { status: res.status, headers: { 'content-type': contentType } });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upstream_fetch_error", upstream, message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const upstream = `${backend()}/api/jobs`;

  try {
    const payload = await req.json().catch(() => ({}));

    const res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json", ...passAuth(req) },
      body: JSON.stringify(payload),
    });

    // Pass-through: return the upstream response body and status directly.
    const text = await res.text().catch(() => '');
    const contentType = res.headers.get('content-type') || 'application/json';
    if (process.env.NODE_ENV === 'development') {
      try { console.log('[proxy:/api/jobs POST] upstream=', upstream, 'status=', res.status, 'body=', text?.slice ? text.slice(0, 1000) : text) } catch (_) {}
    }
    return new Response(text, { status: res.status, headers: { 'content-type': contentType } });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upstream_fetch_error", upstream, message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
// removed duplicated block
