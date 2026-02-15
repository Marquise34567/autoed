export const runtime = 'edge';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function stripHopByHop(incoming: Headers): Headers {
  const out = new Headers();
  for (const [k, v] of incoming) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    out.set(k, v);
  }
  return out;
}

function filterResponseHeaders(upstream: Headers): Headers {
  const out = new Headers();
  for (const [k, v] of upstream) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    out.set(k, v);
  }
  return out;
}

function buildTarget(base: string, pathname: string, search: string) {
  const cleanBase = String(base || '').replace(/\/+$/, '')
  // remove the proxy prefix: /api/proxy
  let suffix = pathname.replace(/^\/api\/proxy/, '') || ''
  // Ensure backend API paths are prefixed with /api when the backend expects them
  if (!suffix.startsWith('/api')) {
    suffix = '/api' + suffix
  }
  return `${cleanBase}${suffix}${search || ''}`
}

async function proxyHandler(req: Request, ctx: { params?: { path?: string[] } }): Promise<Response> {
  const BACKEND_ORIGIN = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_ORIGIN;
  if (!BACKEND_ORIGIN) {
    const body = JSON.stringify({ ok: false, error: 'Missing BACKEND_ORIGIN' });
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-proxy-target', '');
    return new Response(body, { status: 500, headers });
  }

  const url = new URL(req.url);
  const search = url.search || '';
  const pathname = url.pathname || '';
  const target = buildTarget(BACKEND_ORIGIN, pathname, search);

  const forwardHeaders = stripHopByHop(req.headers);
  forwardHeaders.delete('content-length');
  forwardHeaders.delete('host');

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: forwardHeaders,
    redirect: 'manual',
  };

  if (hasBody) {
    // @ts-ignore duplex supported in edge runtime
    init.body = req.body ?? undefined;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init as RequestInit);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const payload = JSON.stringify({ ok: false, error: 'Proxy fetch failed', detail: message, target });
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-proxy-target', target);
    return new Response(payload, { status: 502, headers });
  }

  // If upstream returned an error status, capture body for logging
  if (!upstream.ok) {
    const txt = await upstream.clone().text().catch(() => '<unreadable>')
    try { console.error('[proxy] upstream error', { target, status: upstream.status, body: txt }) } catch (_) {}
  }

  // Pass through upstream response exactly (status + body), but ensure headers are filtered
  const respHeaders = filterResponseHeaders(upstream.headers);
  respHeaders.set('x-proxy-target', target);

  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
export const HEAD = proxyHandler;
