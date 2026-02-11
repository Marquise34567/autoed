"use client"

import React from 'react'

export default function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative bg-linear-to-b from-[#030313] via-[#071021] to-[#02020a] overflow-hidden">
      {/* Base gradient layer */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-linear-to-b from-[#030313] via-[#071021] to-[#02020a] opacity-95" />
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-gradient-to-r from-[#7c3aed]/10 to-transparent blur-3xl opacity-80" />
        <div className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-gradient-to-r from-[#06b6d4]/8 to-transparent blur-2xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_30%)]" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24">
        {children}
      </div>
    </main>
  )
}
