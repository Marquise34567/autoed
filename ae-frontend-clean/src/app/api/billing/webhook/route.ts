import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Minimal Stripe webhook handler that verifies signature and updates Firestore users by stripeCustomerId.
// Requires these env vars in Vercel (Production + Preview):
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET
// - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET

async function initFirebaseAdmin() {
  try {
    const admin = await import('firebase-admin')
    if (admin.apps && admin.apps.length) return admin
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (!projectId || !clientEmail || !privateKey) {
      console.error('[webhook] missing firebase admin envs')
      return null
    }
    privateKey = privateKey.replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    })
    return admin
  } catch (e) {
    console.error('[webhook] firebase-admin init error', e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const key = process.env.STRIPE_SECRET_KEY || ''
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    if (!key || !webhookSecret) {
      console.error('[webhook] Stripe secrets missing')
      return NextResponse.json({ ok: false, error: 'Missing Stripe configuration' }, { status: 500 })
    }

    const rawBody = await req.text()
    const sig = req.headers.get('stripe-signature') || ''
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      console.error('[webhook] signature verification failed', err?.message || err)
      return NextResponse.json({ ok: false, error: 'Invalid webhook signature' }, { status: 400 })
    }

    console.log('[webhook] received event', event.type)

    const admin = await initFirebaseAdmin()
    if (!admin) {
      console.error('[webhook] firebase admin not initialized')
      return NextResponse.json({ ok: false, error: 'Firebase admin not configured' }, { status: 500 })
    }

    const db = admin.firestore()

    // Helper: find user doc by stripeCustomerId
    async function findUserDocByCustomer(customerId: string) {
      try {
        const q = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
        if (q.empty) return null
        const doc = q.docs[0]
        return { id: doc.id, data: doc.data() }
      } catch (e) {
        console.error('[webhook] error finding user by customerId', e)
        return null
      }
    }

    // Handle relevant events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customer = typeof session.customer === 'string' ? session.customer : undefined
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined

        if (customer) {
          const found = await findUserDocByCustomer(customer)
          if (found) {
            await db.collection('users').doc(found.id).set({ stripeCustomerId: customer, stripeSubscriptionId: subscriptionId || null }, { merge: true })
            console.log('[webhook] checkout.session.completed -> updated user', found.id)
          } else {
            console.warn('[webhook] checkout.session.completed -> no user found for customer', customer)
          }
        }
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customer = typeof invoice.customer === 'string' ? invoice.customer : undefined
        const subscription = typeof invoice.subscription === 'string' ? invoice.subscription : undefined
        if (customer) {
          const found = await findUserDocByCustomer(customer)
          if (found) {
            await db.collection('users').doc(found.id).set({ stripeSubscriptionId: subscription || null, lastPaymentAt: Date.now() }, { merge: true })
            console.log('[webhook] invoice.payment_succeeded -> updated user', found.id)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const customer = typeof sub.customer === 'string' ? sub.customer : undefined
        if (customer) {
          const found = await findUserDocByCustomer(customer)
          if (found) {
            const updates: any = {
              stripeSubscriptionId: sub.id,
              stripeCustomerId: customer,
              stripeSubscriptionStatus: sub.status,
              stripeCurrentPeriodStart: sub.current_period_start || null,
              stripeCurrentPeriodEnd: sub.current_period_end || null,
            }
            await db.collection('users').doc(found.id).set(updates, { merge: true })
            console.log('[webhook] subscription update -> updated user', found.id)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customer = typeof sub.customer === 'string' ? sub.customer : undefined
        if (customer) {
          const found = await findUserDocByCustomer(customer)
          if (found) {
            await db.collection('users').doc(found.id).set({ stripeSubscriptionId: null, stripeSubscriptionStatus: 'deleted' }, { merge: true })
            console.log('[webhook] subscription.deleted -> updated user', found.id)
          }
        }
        break
      }

      default:
        console.log('[webhook] unhandled event type', event.type)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[webhook] fatal error', err?.message || err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown' }, { status: 500 })
  }
}
