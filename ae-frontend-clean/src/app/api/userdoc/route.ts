import { NextResponse } from 'next/server'
import { admin } from '@/lib/firebase-admin'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!admin || !admin.auth) {
      console.error('[userdoc] firebase-admin not initialized')
      return NextResponse.json({ plan: 'starter', status: 'unknown', source: 'default' })
    }

    let decoded: any
    try {
      decoded = await admin.auth().verifyIdToken(token)
    } catch (err) {
      console.warn('[userdoc] token verify failed', err)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uid = decoded && decoded.uid
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = admin.firestore()

    // Try users collection first
    const userDocRef = db.doc(`users/${uid}`)
    const userSnap = await userDocRef.get()
    let userData = userSnap.exists ? userSnap.data() : null

    // Also attempt billing_status if present
    let billingData = null
    try {
      const bSnap = await db.doc(`billing_status/${uid}`).get()
      billingData = bSnap.exists ? bSnap.data() : null
    } catch (e) {
      // ignore billing read errors
    }

    if (!userData) {
      return NextResponse.json({ plan: 'starter', status: 'unknown', source: 'default' })
    }

    // Merge billing status into response if present
    if (billingData) userData.billing = billingData

    return NextResponse.json({ ...userData, source: 'server' })
  } catch (err) {
    console.error('[userdoc] unexpected error', err)
    return NextResponse.json({ plan: 'starter', status: 'unknown', source: 'default' })
  }
}
