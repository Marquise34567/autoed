"use client"

import React from 'react'

export default function UploadCTA({ fileName, onPickClick, onFileChange }:{ fileName?: string; onPickClick: ()=>void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>)=>void }){
  return (
    <div className="w-full">
      <div className="rounded-2xl bg-[rgba(255,255,255,0.02)] border border-white/6 p-6 flex flex-col items-center gap-3">
        {!fileName ? (
          <>
            <button onClick={onPickClick} className="px-6 py-4 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] text-white font-semibold shadow hover:brightness-105 transition">Select a video to start</button>
            <div className="text-xs text-white/60">MP4 / MOV / MKV — max 2GB</div>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <div className="text-sm text-white/90 truncate">{fileName}</div>
            <button onClick={onPickClick} className="text-sm text-blue-300">Change</button>
          </div>
        )}
      </div>
    </div>
  )
}
