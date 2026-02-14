"use client"

import React, { useEffect, useRef, useState } from 'react'

export default function CompletionModal({ jobId, videoUrl, onClose, onDownload }: { jobId: string; videoUrl?: string; onClose: () => void; onDownload: () => void }) {
  const [toast, setToast] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    // simple confetti using canvas — lightweight, no deps
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let particles: Array<any> = []
    const rand = (a:number, b:number) => a + Math.random() * (b - a)
    const colors = ['#ff6b6b','#ffd166','#4dd0e1','#7c3aed','#06b6d4']
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight }
    resize()
    window.addEventListener('resize', resize)

    // generate a burst
    for (let i=0;i<80;i++) {
      particles.push({
        x: canvas.width/2 + rand(-80,80),
        y: canvas.height/2 + rand(-40,40),
        vx: rand(-6,6),
        vy: rand(-12,-3),
        r: rand(4,9),
        color: colors[Math.floor(Math.random()*colors.length)],
        life: rand(50,140)
      })
    }

    const step = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      particles.forEach(p => {
        p.vy += 0.3
        p.x += p.vx
        p.y += p.vy
        p.life--
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(p.x,p.y,p.r,p.r,0,0,Math.PI*2)
        ctx.fill()
      })
      particles = particles.filter(p=>p.life>0)
      if (particles.length>0) animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)
    const t = setTimeout(()=>{ if (animRef.current) cancelAnimationFrame(animRef.current) }, 3500)
    return () => { clearTimeout(t); window.removeEventListener('resize', resize); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const handleDownload = () => {
    try {
      onDownload()
      setToast('Download started ✅ Go make the next one.')
    } catch (e) {}
  }

  return (
    <div className="ae-modal-backdrop">
      <div className="ae-modal celebration-wrap">
        <canvas ref={canvasRef} className="celebration-canvas" />
        <div className="flex items-start justify-between">
          <div>
            <div className="title">Your video is ready 🎉</div>
            <div className="message">Thank you for creating. Consistency beats talent — you just shipped. Now post it and let the world react.</div>
          </div>
          <div className="text-white/60">Job: {jobId}</div>
        </div>

        <div className="mt-4 ae-modal .video-wrap">
          <div className="video-wrap" style={{height: 360}}>
            {videoUrl ? (
              // small player inside modal
              <video src={videoUrl} controls className="w-full h-full object-contain bg-black" />
            ) : (
              <div className="text-white/60 p-6">Preview not available</div>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={handleDownload}>Download</button>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>

        {toast && <div className="ae-toast">{toast}</div>}
      </div>
    </div>
  )
}
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
    // focus close button for accessibility
    try { closeBtnRef.current?.focus() } catch (_) {}
    // prevent background scroll
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
