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

function buildBackendUrl(request: Request, params: { path?: string[] }) {
  const backendOrigin = process.env.BACKEND_ORIGIN;
  if (!backendOrigin) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Missing BACKEND_ORIGIN' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })) };

  }

  const url = new URL(request.url);
  const qs = url.search || '';

  const segments = Array.isArray(params?.path) ? [...params.path] : [];
  if (segments.length > 0 && segments[0].toLowerCase() === 'api') segments.shift();

  const pathSuffix = segments.length ? `/${segments.map(encodeURIComponent).join('/')}` : '';
  const proxiedPath = `/api${pathSuffix}`;

  let backendUrl: string;
  try {
    backendUrl = new URL(proxiedPath + qs, backendOrigin).toString();
  } catch (err) {
    return { ok: false, response: new Response(JSON.stringify({ error: 'Invalid BACKEND_ORIGIN' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })) };
  }

  return { ok: true, backendUrl };
}

function forwardHeaders(request: Request): Headers {
  const incoming = request.headers;
  const headers = stripHopByHop(incoming);

  // Ensure forwarded metadata is present
  const host = incoming.get('host');
  const proto = request.url.startsWith('https') ? 'https' : 'http';
  if (host && !headers.has('x-forwarded-host')) headers.set('x-forwarded-host', host);
  if (!headers.has('x-forwarded-proto')) headers.set('x-forwarded-proto', proto);
  if (!headers.has('x-forwarded-for')) {
    const existing = incoming.get('x-forwarded-for');
    if (existing) headers.set('x-forwarded-for', existing);
  }

  headers.delete('content-length');
  return headers;
}

function filterResponseHeaders(h: Headers): Headers {
  const out = new Headers();
  for (const [k, v] of h) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    out.set(k, v);
  }
  return out;
}

async function handleProxy(request: Request, ctx: { params: { path?: string[] } }): Promise<Response> {
  const built = buildBackendUrl(request, ctx.params);
  if (!built.ok) return built.response;

  const backendUrl = built.backendUrl as string;

  const headers = forwardHeaders(request);

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // @ts-expect-error duplex is supported in the runtime for streaming
    init.body = request.body ?? undefined;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, init as RequestInit);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Proxy crashed', detail: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const respHeaders = filterResponseHeaders(upstream.headers);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export async function GET(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function POST(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function PUT(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function PATCH(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function DELETE(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function OPTIONS(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
export async function HEAD(request: Request, ctx: { params: { path?: string[] } }) { return handleProxy(request, ctx); }
