"use client"

import { useRouter } from 'next/navigation'
import React from 'react'

export default function SignupButton({ className }: { className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try { router.push('/login?mode=signup') } catch (_) {}
      }}
    >
      Sign Up
    </button>
  )
}
