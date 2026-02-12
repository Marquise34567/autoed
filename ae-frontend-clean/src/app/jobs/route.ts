import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fileUrl, userId } = body

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing fileUrl' }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Job received',
        fileUrl,
      },
      { status: 200 }
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Job route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
