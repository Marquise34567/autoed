"use client"

import React from 'react'
import EditorGate from '@/components/editor/EditorGate'
import { useAuth } from '@/lib/auth/useAuth'
import { useRouter } from 'next/navigation'

export default function Page() {
  const { user, authReady } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!authReady) return
    if (!user) {
      try { router.replace(`/login?next=${encodeURIComponent('/editor')}`) } catch (_) {}
    }
  }, [authReady, user, router])

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-8 w-8"></div>
          <p className="mt-4 text-white/60">Loading editor…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // While redirecting, show a simple message/spinner to avoid rendering editor
    return (
      <div className="min-h-screen bg-[#07090f] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-white/20 border-t-blue-500 h-8 w-8"></div>
          <p className="mt-4 text-white/60">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  // authReady === true && user exists — render the editor gate
  return <EditorGate />
}
