export const runtime = "nodejs";

const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "https://autoed-backend-production.up.railway.app").replace(/\/+$/, "");

function stripHeaders(inHeaders: Headers) {
  const headers: Record<string, string> = {};
  const auth = inHeaders.get("authorization");
  const cookie = inHeaders.get("cookie");
  const contentType = inHeaders.get("content-type");
  if (auth) headers["authorization"] = auth;
  if (cookie) headers["cookie"] = cookie;
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

async function proxyRequest(req: Request) {
  const url = new URL(req.url);
  // keep the path after /api
  const pathAfterApi = url.pathname.replace(/^\/api/, "") || "/";
  const upstream = `${BACKEND_ORIGIN}${pathAfterApi}${url.search}`;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const headers = stripHeaders(req.headers);

  let body: any = undefined;
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    try {
      body = await req.text();
    } catch (_) {
      body = undefined;
    }
  }

  try {
    const res = await fetch(upstream, {
      method: req.method,
      headers,
      body: typeof body === "string" && body.length > 0 ? body : undefined,
      redirect: "manual",
    });

    const text = await res.text().catch(() => "");
    const contentType = res.headers.get("content-type") || "application/json";

    if (process.env.NODE_ENV === "development") {
      try {
        console.log("[proxy:/api/*] upstream=", upstream, "status=", res.status);
        if (typeof text === "string") console.log("[proxy:/api/*] body (truncated)=", text.slice(0, 1000));
      } catch (_e) {}
    }

    return new Response(text, { status: res.status, headers: { "content-type": contentType } });
  } catch (e: any) {
    // log upstream errors
    console.error("[proxy:/api/*] upstream fetch error:", String(e?.message || e));
    const errBody = JSON.stringify({ error: "upstream_fetch_error", upstream, message: String(e?.message || e) });
    return new Response(errBody, { status: 502, headers: { "content-type": "application/json" } });
  }
}

export async function GET(req: Request) {
  return proxyRequest(req);
}
export async function POST(req: Request) {
  return proxyRequest(req);
}
export async function PUT(req: Request) {
  return proxyRequest(req);
}
export async function PATCH(req: Request) {
  return proxyRequest(req);
}
export async function DELETE(req: Request) {
  return proxyRequest(req);
}
export async function OPTIONS(req: Request) {
  return proxyRequest(req);
}
export async function HEAD(req: Request) {
  return proxyRequest(req);
}
