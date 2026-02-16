// Catch-all proxy for /api/:path* -> backend
// - Strips Origin/Referer/Host/Connection/Content-Length headers
// - Handles OPTIONS preflight with 200
// - Forwards method, headers (filtered), and body

import { NextRequest } from 'next/server'

const FORBIDDEN_HEADERS = new Set(['origin', 'referer', 'host', 'connection', 'content-length'])

function filterHeaders(src: Headers): Headers {
  const h = new Headers()
  for (const [k, v] of src) {
    if (FORBIDDEN_HEADERS.has(k.toLowerCase())) continue
    h.append(k, v)
  }
  return h
}

function getBackendBase(): string {
  // Prefer server-only env var BACKEND_ORIGIN for production proxy
  const prefer = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://autoed-backend-production.up.railway.app'
  return String(prefer).replace(/\/+$|\\s+$/g, '')
}

async function handleProxy(request: Request, params: { path?: string[] }) {
  const method = request.method.toUpperCase()
  const pathParts = Array.isArray(params.path) ? params.path : (params.path ? [params.path as any] : [])
  const path = pathParts.join('/')
  // If this is the one-off debug route, handle locally to avoid proxying
  if (path === 'debug/echo-auth') {
    try {
      const auth = request.headers.get('authorization') || null
      const cookie = request.headers.get('cookie') || null
      const out = {
        ok: true,
        authorization_present: !!auth,
        authorization_length: auth ? auth.length : 0,
        authorization_preview: auth ? auth.slice(0, 80) : null,
        cookie_present: !!cookie,
        cookie_length: cookie ? cookie.length : 0,
      }
      return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } })
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
  }
  const url = new URL(request.url)
  const search = url.search || ''
  const target = `${getBackendBase()}/api/${path}${search}`

  if (method === 'OPTIONS') {
    // Respond to preflight directly
    const headers: Record<string,string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('access-control-request-headers') || '*',
    }
    return new Response(null, { status: 200, headers })
  }

  // Read body for non-GET/HEAD
  let body: ArrayBuffer | undefined = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.arrayBuffer()
    } catch (e) {
      body = undefined
    }
  }

  const proxiedHeaders = filterHeaders(request.headers as unknown as Headers)

  // TEMP LOGGING: show incoming auth/cookie for debugging auth issues
  try {
    const authHeader = String(request.headers.get('authorization') || '')
    const cookieHeader = String(request.headers.get('cookie') || '')
    if (authHeader) console.log('[proxy][incoming] authorization present, len=', authHeader.length)
    else console.log('[proxy][incoming] no authorization header')
    if (cookieHeader) console.log('[proxy][incoming] cookie present, len=', cookieHeader.length)
    else console.log('[proxy][incoming] no cookie header')
  } catch (_) {}

  let res: Response
  try {
    res = await fetch(target, {
      method,
      headers: proxiedHeaders,
      body: body && body.byteLength ? body : undefined,
      // don't automatically include credentials
      redirect: 'manual',
    })
  } catch (err) {
    // Network / fetch error — surface to browser for easier debugging
    console.error('[proxy] Network error fetching upstream', target, String(err))
    return new Response(JSON.stringify({ error: 'upstream_fetch_error', message: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }

  // If upstream returned an error status, capture body for logging and return the exact body
  let upstreamBodyText: string | null = null
  try {
    const cloned = res.clone()
    upstreamBodyText = await cloned.text()
  } catch (e) {
    upstreamBodyText = null
  }
  if (res.status >= 400) {
    try { console.error('[proxy] upstream error', target, res.status, upstreamBodyText) } catch (_) {}
    // Return the exact upstream body and content-type (if present) with the same status
    const outHeaders = new Headers()
    const ct = res.headers.get('content-type')
    if (ct) outHeaders.set('content-type', ct)
    return new Response(upstreamBodyText ?? '', { status: res.status, headers: outHeaders })
  }

  // Build response headers for successful responses
  const responseHeaders = new Headers()
  for (const [k, v] of res.headers) {
    responseHeaders.append(k, v)
  }

  const buffer = await res.arrayBuffer()
  return new Response(buffer, { status: res.status, headers: responseHeaders })
}

export async function GET(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function POST(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function PUT(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function PATCH(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function DELETE(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function HEAD(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
export async function OPTIONS(request: Request, ctx: { params?: { path?: string[] } }) {
  const params = await (ctx.params as any)
  return handleProxy(request, params)
}
