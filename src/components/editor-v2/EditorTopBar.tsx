"use client"

import React from 'react'

export default function EditorTopBar({ userName, onSignOut }: { userName?: string | null; onSignOut?: () => void }){
  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-white font-semibold text-lg">AutoEditor</div>
        <div className="text-xs bg-white/6 text-white/80 px-2 py-1 rounded-full">Editor</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-white/70 hidden sm:block">{userName || ''}</div>
        <button onClick={onSignOut} className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/80">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h6A1.5 1.5 0 0112 4.5V6h-1V4.5a.5.5 0 00-.5-.5h-6a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h6a.5.5 0 00.5-.5V14h1v1.5A1.5 1.5 0 0110.5 17h-6A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/></svg>
        </button>
      </div>
    </div>
  )
}
