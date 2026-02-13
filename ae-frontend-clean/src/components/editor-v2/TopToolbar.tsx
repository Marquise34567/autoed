"use client"

import React from 'react'

export default function TopToolbar({ children }:{ children?: React.ReactNode }){
  return (
    <div className="w-full sticky top-6 bg-[rgba(255,255,255,0.02)] border border-white/6 rounded-2xl p-3 backdrop-blur-md flex items-center justify-between gap-4 shadow-sm z-20">
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/90" aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/90" aria-label="Undo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.5 3a7.5 7.5 0 107.5 7.5V9A5.5 5.5 0 1110 3.5H9.5z" /></svg>
        </button>
        <button className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/90" aria-label="Redo">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="hidden md:flex items-center gap-3 px-2 py-1 rounded-full bg-white/4">
        <div className="flex items-center gap-3 text-white/90">
          <div className="p-2 rounded-md bg-white/6"> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4v16l8-8z" /></svg></div>
          <div className="p-2 rounded-md bg-transparent text-white/60">T</div>
          <div className="p-2 rounded-md bg-transparent text-white/60">S</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full bg-white/6 hover:bg-white/8 text-white/90" aria-label="Play">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-4.586 2.855A1 1 0 018 12.998V7a1 1 0 011.514-.857l4.586 2.855a1 1 0 010 1.73z" /></svg>
        </button>
        <button className="px-3 py-1 rounded-full bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-lg">Export</button>
        <div className="w-8 h-8 rounded-full bg-white/8 ml-2 flex items-center justify-center text-sm text-white/90">JD</div>
      </div>
    </div>
  )
}
