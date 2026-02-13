"use client"

import React from 'react'
import UploadCTA from './UploadCTA'

export default function LeftMediaPanel({ onPickClick, fileInputRef, onFileChange, media }:{ onPickClick?:()=>void; fileInputRef?:any; onFileChange?:any; media?:any[] }){
  return (
    <aside className="w-full sm:w-72 lg:w-80">
      {/* full panel for sm+ screens */}
      <div className="hidden sm:block bg-[rgba(255,255,255,0.02)] border border-white/6 rounded-2xl p-4 backdrop-blur-sm h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Project Video</h3>
          <div className="text-xs text-white/50">{(media?.length||0)} items</div>
        </div>

        <div className="mb-3">
          <div className="relative">
            <div className="flex items-center gap-2 bg-white/3 rounded-md p-2 px-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input placeholder="Search" className="bg-transparent outline-none text-sm w-full text-white/70" />
            </div>
          </div>
        </div>

        <div className="space-y-3 overflow-auto max-h-[60vh] pr-2">
          { (media && media.length>0) ? media.map((m:any,idx:number)=> (
            <button key={idx} className="w-full flex items-center gap-3 p-2 rounded-lg bg-transparent hover:bg-white/4 border border-white/4 hover:shadow-lg">
              <div className="w-16 h-10 bg-black/60 rounded-md overflow-hidden shrink-0" style={{backgroundImage: `url(${m.thumbnail || m.preview || ''})`, backgroundSize:'cover', backgroundPosition:'center'}} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white truncate">{m.name || m.title || `Clip ${idx+1}`}</div>
                <div className="text-xs text-white/60">{m.duration ? `${Math.round(m.duration)}s` : m.size}</div>
              </div>
              <div className="text-xs text-white/60">•••</div>
            </button>
          )) : (
            <div className="text-sm text-white/60">No media yet. <button onClick={onPickClick} className="text-white underline">Upload</button></div>
          )}
        </div>
      </div>

      {/* compact rail for small screens */}
      <div className="sm:hidden flex flex-col items-center gap-3 p-2">
        <button onClick={onPickClick} className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center text-white/90">+</button>
        <button className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center text-white/90">⧉</button>
        <button className="w-12 h-12 rounded-xl bg-white/6 flex items-center justify-center text-white/90">▤</button>
      </div>
    </aside>
  )
}
