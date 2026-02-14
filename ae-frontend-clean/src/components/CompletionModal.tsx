"use client"

import React, { useEffect, useRef } from 'react'

interface Props {
  isOpen: boolean
  jobId?: string | null
  previewUrl?: string | null
  downloadStarted?: boolean
  onClose: () => void
  onDownload: () => void
}

export default function CompletionModal({ isOpen, jobId, previewUrl, downloadStarted, onClose, onDownload }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    try { closeBtnRef.current?.focus() } catch (_) {}
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 p-6 sm:p-8 max-w-3xl w-full mx-4 z-10 shadow-2xl">
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-2xl"
        >
          ✕
        </button>

        <div className="flex items-start space-x-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">Your video is ready.</h2>
            <p className="text-slate-400 mt-2">Consistency beats talent. You just shipped—now post it and let the algorithm work for you.</p>

            <div className="mt-4 bg-slate-800/40 border border-slate-700 rounded-lg overflow-hidden">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full max-h-72 bg-black"
                />
              ) : (
                <div className="p-6 text-center text-slate-400">Preview unavailable</div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-slate-200">{downloadStarted ? 'Download started ✅' : 'Download will begin when you click the button.'}</p>
              </div>
              <div className="shrink-0 flex items-center space-x-3">
                <button
                  onClick={onDownload}
                  className="bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:scale-[1.01] transition-transform"
                >
                  Download ✨
                </button>
                <button
                  onClick={onClose}
                  className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
