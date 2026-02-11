"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { onSnapshot, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebaseClient'
import EditorClientV2 from '@/app/editor/EditorClientV2'

export default function EditorGate() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const authInst = auth
    const unsub = onAuthStateChanged(auth, (u) => {
      const isAuthed = !!u
      if (!isAuthed) {
        setAuthed(false)
        setReady(true)
        router.replace('/login?next=/editor')
        return
      }

      // user is signed in - subscribe to Firestore users/{uid} doc for subscription status
      const userDoc = doc(db, 'users', u.uid)
      const snapUnsub = onSnapshot(userDoc, (snap) => {
        const data = snap.data()
        const status = data?.status || data?.subscriptionStatus || 'inactive'
        if (status === 'active' || status === 'trialing') {
          setAuthed(true)
          setReady(true)
        } else {
          // not subscribed - redirect to pricing
          setAuthed(false)
          setReady(true)
          router.replace('/pricing')
        }
      })

      // cleanup snapshot when auth changes
      return () => snapUnsub()
    })

    // top-level cleanup
    return () => unsub()
  }, [router])

  if (!ready || !authed) return null
  return <EditorClientV2 />
}
