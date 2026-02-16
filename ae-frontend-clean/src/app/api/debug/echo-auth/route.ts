// One-off debug route: echoes Authorization and Cookie headers for debugging
export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || null
    const cookie = request.headers.get('cookie') || null
    const out = { authorization_present: !!auth, authorization_length: auth ? auth.length : 0, authorization_preview: auth ? auth.slice(0,80) : null, cookie_present: !!cookie, cookie_length: cookie ? cookie.length : 0 }
    return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
