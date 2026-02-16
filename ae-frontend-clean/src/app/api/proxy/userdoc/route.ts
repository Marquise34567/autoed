import { NextResponse } from "next/server";

function getBackend() {
  const raw = process.env.BACKEND_URL;
  if (!raw) throw new Error("BACKEND_URL is missing in env.");
  return raw.replace(/\/+$/, "");
}

export async function GET(req: Request) {
  const upstream = `${getBackend()}/api/userdoc`;
  try {
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(upstream, {
      method: "GET",
      headers: auth ? { authorization: auth } : {},
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      console.error("[/api/proxy/userdoc GET] upstream non-ok", { upstream, status: res.status, body });
      return NextResponse.json({ error: "bad_gateway", upstream, status: res.status, body }, { status: 502 });
    }

    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    console.error("[/api/proxy/userdoc GET] crash", e?.stack || e);
    return NextResponse.json({ error: "bad_gateway", upstream, detail: String(e?.message || e) }, { status: 502 });
  }
}
