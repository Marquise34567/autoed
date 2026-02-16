"use client"

import React from 'react'

export default function EditorTopBar({ userName, onSignOut }: { userName?: string | null; onSignOut?: () => void }){
  return (
    <div className="w-full flex items-center justify-between gap-4 toolbar">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold tracking-tight" style={{background: 'linear-gradient(90deg,var(--primary-500),var(--accent-400))', WebkitBackgroundClip: 'text', color: 'transparent'}}>AutoEditor</div>
          <div className="text-xs px-2 py-1 rounded-full surface muted">Editor</div>
          <div className="ml-2 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-semibold px-2 py-1 rounded-full shadow-sm">Premium</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <div className="text-sm font-medium">{userName || ''}</div>
          <div className="text-xs muted">Workspace</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.location.href = '/pricing'} className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary-500 to-accent-400 hover:opacity-95 text-sm font-semibold shadow">Upgrade</button>
          <button onClick={onSignOut} className="p-2 rounded-full glass" title="Sign out">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h6A1.5 1.5 0 0112 4.5V6h-1V4.5a.5.5 0 00-.5-.5h-6a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h6a.5.5 0 00.5-.5V14h1v1.5A1.5 1.5 0 0110.5 17h-6A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
