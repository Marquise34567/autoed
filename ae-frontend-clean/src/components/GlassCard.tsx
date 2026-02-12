"use client"

import React from 'react'

export default function GlassCard({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: 'outer' | 'inner' }){
  const base = 'rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl '
  const shadow = variant === 'inner' ? 'shadow-sm' : 'shadow-2xl'
  const padding = ''
  return (
    <div className={`${base} ${shadow} ${padding} ${className||''}`}>
      {children}
    </div>
  )
}
