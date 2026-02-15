import { NextRequest, NextResponse } from 'next/server'

// Run this route in Node runtime so we can forward binary bodies and use
// `duplex: "half"` when necessary (required by node-fetch when passing a stream).
export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://remarkable-comfort-production-4a9a.up.railway.app'

async function handle(req: NextRequest) {
  try {
    const { params } = req as any
    const pathSegments: string[] = params?.path || []
    const targetPath = pathSegments.join('/')
    const search = req.nextUrl?.search || ''
    const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}/${targetPath}${search}`

    // Log incoming request (avoid logging headers or any secrets)
    console.log('[proxy] incoming ->', req.method, req.nextUrl?.pathname + (search || ''), '->', targetUrl)

    // Build headers, excluding host and content-length
    const headers: Record<string, string> = {}
    for (const [key, value] of req.headers.entries()) {
      const k = key.toLowerCase()
      if (k === 'host' || k === 'content-length') continue
      headers[key] = value
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

    // Prepare fetch init; include duplex when forwarding a body stream
    const fetchInit: any = {
      method: req.method,
      headers,
    }

    if (hasBody) {
      // `duplex: "half"` is required by Node when passing a stream body
      fetchInit.duplex = 'half'
      fetchInit.body = req.body
    }

    const upstream = await fetch(targetUrl, fetchInit)

    // Log upstream response status
    console.log('[proxy] upstream response', req.method, targetUrl, '->', upstream.status)

    // Copy response headers, excluding hop-by-hop headers
    const responseHeaders = new Headers()
    upstream.headers.forEach((v, k) => {
      const kl = k.toLowerCase()
      if (['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'].includes(kl)) return
      // Do not log header values (they may contain tokens)
      responseHeaders.set(k, v)
    })

    // Stream the response back to the client
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, { status: upstream.status, headers: responseHeaders })
  } catch (err: any) {
    // Server-side error logging (stack) but never print secrets
    console.error('[proxy] error', err && err.stack ? err.stack : err)
    return NextResponse.json({ error: 'proxy error' }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
