"use client"

import React from 'react'

export default function EditorTopBar({ userName, onSignOut }: { userName?: string | null; onSignOut?: () => void }){
  return (
    <div className="w-full flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-white font-semibold text-lg tracking-tight">AutoEditor</div>
        <div className="text-xs bg-white/6 text-white/80 px-2 py-1 rounded-full">Editor</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <div className="text-sm font-medium text-white/90">{userName || ''}</div>
          <div className="text-xs text-white/60">Workspace</div>
        </div>

        <div className="flex items-center gap-2">
          <button className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-md">Upgrade</button>
          <button onClick={onSignOut} className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/80">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h6A1.5 1.5 0 0112 4.5V6h-1V4.5a.5.5 0 00-.5-.5h-6a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h6a.5.5 0 00.5-.5V14h1v1.5A1.5 1.5 0 0110.5 17h-6A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
