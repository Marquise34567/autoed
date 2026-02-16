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

function passAuth(req: Request) {
  const a = req.headers.get("authorization");
  return a ? { authorization: a } : {};
}

async function readBody(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? await res.json() : await res.text();
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

    const body = await readBody(res);
    return NextResponse.json({ upstream, status: res.status, body }, { status: res.status });
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

    const body = await readBody(res);
    return NextResponse.json({ upstream, status: res.status, body }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upstream_fetch_error", upstream, message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
// removed duplicated block
