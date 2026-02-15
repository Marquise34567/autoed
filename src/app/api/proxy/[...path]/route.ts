import { NextResponse } from "next/server";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;

function buildTargetUrl(origin: string, pathParts: string[], search: string) {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const cleanPath = pathParts.join("/").replace(/^\/+/, "");
  return `${cleanOrigin}/api/${cleanPath}${search}`;
}

async function proxyHandler(
  req: Request,
  context: { params: { path?: string[] } }
) {
  try {
    if (!BACKEND_ORIGIN) {
      return NextResponse.json(
        {
          error: "Missing BACKEND_ORIGIN",
          hint: "Set BACKEND_ORIGIN in Vercel Production env vars",
        },
        { status: 500 }
      );
    }

    const { path = [] } = context.params;
    const url = new URL(req.url);

    const targetUrl = buildTargetUrl(
      BACKEND_ORIGIN,
      path,
      url.search || ""
    );

    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("content-length");

    const method = req.method.toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-ignore
      duplex: "half",
      cache: "no-store",
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.set("x-proxy-target", targetUrl);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Proxy fetch failed",
        detail: err?.message || String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
