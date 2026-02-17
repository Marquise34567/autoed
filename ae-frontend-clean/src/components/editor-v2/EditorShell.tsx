"use client"

import React from 'react'

export default function EditorShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 z-0 bg-[#05060a] text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-[520px] h-[520px] rounded-full bg-[#7c3aed]/20 blur-[120px]" />
        <div className="absolute -right-24 top-[18%] w-[360px] h-[360px] rounded-full bg-[#06b6d4]/18 blur-[120px]" style={{ animationDelay: '1.2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_30%)] mix-blend-overlay" />
      </div>

      <div className="h-full w-full p-6 overflow-auto">
        <div className="mx-auto h-full w-full p-6" style={{ maxWidth: '1400px' }}>
          <div className="bg-[rgba(255,255,255,0.025)] rounded-2xl p-4 sm:p-6 shadow-[0_30px_80px_rgba(2,6,23,0.6)]" style={{ minHeight: '620px' }}>
            <div className="grid grid-cols-12 gap-6 h-full">
              <aside className="col-span-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="text-sm font-semibold">Clips</div>
                  <div className="text-xs text-white/60">Library</div>
                </div>
                <div className="mt-3 overflow-auto px-2 pb-3">{/* Clips list mounts here */}</div>
              </aside>

              <section className="col-span-6 p-3 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.01),rgba(255,255,255,0.006))] shadow-inner flex flex-col">
                {children}
              </section>

              <aside className="col-span-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="text-sm font-semibold">Properties</div>
                  <div className="text-xs text-white/60">Settings</div>
                </div>
                <div className="mt-3 overflow-auto px-2 pb-3">{/* Properties / inspector */}</div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
