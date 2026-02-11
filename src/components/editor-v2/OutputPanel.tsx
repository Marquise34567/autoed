"use client"

import React from 'react'

export default function OutputPanel({ fileInfo, onOpen, onOpenNewTab }:{ fileInfo?:{ size?:string; format?:string }, onOpen?: ()=>void, onOpenNewTab?: ()=>void }){
  return (
    <div className="w-full rounded-2xl bg-[rgba(6,10,14,0.65)] border border-white/6 p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-white">Your edit is ready</div>
          <div className="text-xs text-white/60 mt-1">{fileInfo?.size ? `${fileInfo.size}` : ''} {fileInfo?.format ? `• ${fileInfo.format}` : ''}</div>
        </div>
        <div className="text-sm text-white/60">Delivered</div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={(e)=>{ e.preventDefault(); if (onOpen) onOpen() }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-linear-to-br from-[#7c3aed] to-[#06b6d4] text-white font-semibold shadow-lg hover:-translate-y-0.5 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4-4-4M21 21H3" />
          </svg>
          Download
        </button>

        <button
          type="button"
          onClick={(e)=>{ e.preventDefault(); if (onOpenNewTab) onOpenNewTab() }}
          className="text-sm text-white/70 underline"
        >
          Open in new tab
        </button>
      </div>
    </div>
  )
}
