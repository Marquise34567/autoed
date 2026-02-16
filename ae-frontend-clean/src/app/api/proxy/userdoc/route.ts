import { NextResponse } from "next/server";

function backend() {
  let raw = (process.env.BACKEND_URL || "").trim();
  if (!raw) throw new Error("BACKEND_URL missing in env");

  raw = raw.replace(/\/+$/, "");
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`;
  }
  return raw;
}

export async function GET(req: Request) {
  const upstream = `${backend()}/api/userdoc`;

  try {
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(upstream, {
      method: "GET",
      headers: auth ? { authorization: auth } : {},
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json() : await res.text();

    // IMPORTANT: pass through backend status (401, 200, etc). Do NOT convert to 502.
    return NextResponse.json(
      { upstream, status: res.status, body },
      { status: res.status }
    );
  } catch (e: any) {
    // This is the ONLY time we return 502: when fetch itself fails
    return NextResponse.json(
      { error: "upstream_fetch_error", upstream, message: String(e?.message || e) },
      { status: 502 }
    );
  }
}
