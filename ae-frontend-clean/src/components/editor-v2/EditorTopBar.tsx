"use client"

import React from 'react'

export default function EditorTopBar({ userName, onSignOut }: { userName?: string | null; onSignOut?: () => void }){
  return (
    <div className="w-full flex items-center justify-between gap-6 py-3 px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="AutoEditor" className="h-8 w-auto" />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight" style={{background: 'linear-gradient(90deg,#ffffff,#cbd5e1)', WebkitBackgroundClip: 'text', color: 'transparent'}}>AutoEditor</div>
          <div className="text-xs text-white/60">Creator Studio</div>
        </div>
        <div className="ml-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{background: 'linear-gradient(90deg,#7c3aed,#06b6d4)'}}>Premium</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <div className="text-sm font-medium">{userName || ''}</div>
          <div className="text-xs text-white/60">Workspace</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.location.href = '/pricing'} className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-[#7c3aed] to-[#06b6d4] text-white text-sm font-semibold shadow-lg">Upgrade</button>
          <button onClick={onSignOut} className="p-2 rounded-full bg-white/6 hover:bg-white/8" title="Sign out">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M10 3v4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 7l3-4 3 4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17h12" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
