import { NextResponse } from "next/server";

const BACKEND =
  process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_BASE || process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET(req: Request) {
  try {
    if (!BACKEND) {
      console.error('[api/jobs] Missing BACKEND env var (NEXT_PUBLIC_API_URL or BACKEND_BASE)');
      return NextResponse.json({ ok: false, error: "Missing BACKEND_BASE env var" }, { status: 500 });
    }

    const url = new URL(req.url);
    const target = `${BACKEND.replace(/\/+$/, '')}/api/jobs${url.search}`;

    console.log('[api/jobs] proxying to backend:', { BACKEND, target });

    const r = await fetch(target, {
      method: "GET",
      headers: {
        accept: "application/json",
        cookie: req.headers.get("cookie") ?? "",
        authorization: req.headers.get("authorization") ?? "",
      },
      cache: "no-store",
    });

    const text = await r.text();

    if (r.status >= 400) {
      try { console.error('[api/jobs] backend error', { status: r.status, body: text }); } catch (_) {}
    }

    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
      },
    });
  } catch (e: any) {
    console.error("API_JOBS_PROXY_ERROR", e);
    return NextResponse.json({ ok: false, error: "Proxy failed", detail: e?.message || String(e) }, { status: 500 });
  }
}
