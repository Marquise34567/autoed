import React from 'react'

export default function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-white/6 bg-[rgba(255,255,255,0.03)] p-6 backdrop-blur-xl shadow-[0_24px_60px_rgba(2,6,23,0.6)] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
