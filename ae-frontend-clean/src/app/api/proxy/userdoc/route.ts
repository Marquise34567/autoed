import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const upstream = "https://autoed-backend-production-7d0d.up.railway.app/api/userdoc";

  try {
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(upstream, {
      method: "GET",
      headers: auth ? { authorization: auth } : {},
      cache: "no-store",
    });

    const body = await res.json();
    return new Response(JSON.stringify(body), { status: res.status });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "hardcoded_fetch_failed", message: e.message }),
      { status: 502 }
    );
  }
}
