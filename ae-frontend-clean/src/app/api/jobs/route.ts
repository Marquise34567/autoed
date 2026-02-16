import { NextResponse } from "next/server";

function getBackend() {
  const raw = process.env.BACKEND_URL;
  if (!raw) throw new Error("BACKEND_URL is missing in env.");
  return raw.replace(/\/+$/, "");
}

function passAuth(req: Request) {
  const auth = req.headers.get("authorization");
  return auth ? { authorization: auth } : {};
}

async function toJsonOrText(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const upstream = `${getBackend()}/api/jobs${u.search}`;

    const res = await fetch(upstream, {
      method: "GET",
      headers: { ...passAuth(req) },
      cache: "no-store",
    });

    const body = await toJsonOrText(res);
    if (!res.ok) console.error("[/api/jobs GET] upstream fail", { upstream, status: res.status, body });

    return NextResponse.json(body, { status: res.status });
  } catch (e: any) {
    console.error("[/api/jobs GET] crash", e?.stack || e);
    return NextResponse.json({ error: "internal_error", detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const upstream = `${getBackend()}/api/jobs`;
    const payload = await req.json().catch(() => ({}));

    const res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json", ...passAuth(req) },
      body: JSON.stringify(payload),
    });

    const body = await toJsonOrText(res);
    if (!res.ok) console.error("[/api/jobs POST] upstream fail", { upstream, status: res.status, body });

    return NextResponse.json(body, { status: res.status });
  } catch (e: any) {
    console.error("[/api/jobs POST] crash", e?.stack || e);
    return NextResponse.json({ error: "internal_error", detail: String(e?.message || e) }, { status: 500 });
  }
}
