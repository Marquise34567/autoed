"use client"

import React from 'react'

export default function UploadCTA({ fileName, onPickClick, onFileChange }:{ fileName?: string; onPickClick: ()=>void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>)=>void }){
  return (
    <div className="w-full">
      <div className="w-full rounded-2xl bg-white/4 border border-white/8 p-6 flex flex-col items-center gap-3 backdrop-blur-md shadow-lg">
        {!fileName ? (
          <>
            <button onClick={onPickClick} className="px-6 py-4 rounded-xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-lg hover:scale-[1.02] transition-transform">Select a video to start</button>
            <div className="text-xs text-white/70">MP4 / MOV / MKV — max 2GB</div>
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
