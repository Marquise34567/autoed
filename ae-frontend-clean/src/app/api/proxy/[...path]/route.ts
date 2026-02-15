import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://remarkable-comfort-production-4a9a.up.railway.app'

async function handle(req: NextRequest) {
  try {
    const { params } = req as any
    const pathSegments: string[] = params?.path || []
    const targetPath = pathSegments.join('/')
    const targetUrl = `${BACKEND_URL.replace(/\/$/, '')}/${targetPath}`
    console.log('[proxy] forwarding to:', targetUrl)

    // Build headers, excluding host
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'host') return
      headers[key] = value
    })

    // Forward the request body transparently (works for JSON and multipart)
    const fetchInit: RequestInit = {
      method: req.method,
      headers,
      // body can be a ReadableStream from the Request
      body: req.body
    }

    const upstream = await fetch(targetUrl, fetchInit)

    const contentType = upstream.headers.get('content-type') || ''
    const responseHeaders = new Headers()
    // copy selective headers back
    upstream.headers.forEach((v, k) => {
      // exclude hop-by-hop headers
      if (['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'].includes(k.toLowerCase())) return
      responseHeaders.set(k, v)
    })

    const body = await upstream.arrayBuffer()

    // Return JSON if JSON
    if (contentType.includes('application/json')) {
      return new NextResponse(body, { status: upstream.status, headers: responseHeaders })
    }

    // Otherwise return as blob/binary
    return new NextResponse(body, { status: upstream.status, headers: responseHeaders })
  } catch (err: any) {
    console.error('[proxy] error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
