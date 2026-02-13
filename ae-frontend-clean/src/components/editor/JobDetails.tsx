import React from 'react'

export type Segment = { start: string; end: string; reason?: string }
export type Hook = { start: string; end: string; reason?: string }

export default function JobDetails({ hook, segments }: { hook?: Hook | null; segments?: Segment[] | null }) {
  const payload = React.useMemo(() => JSON.stringify({ hook, segments }, null, 2), [hook, segments])

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      // eslint-disable-next-line no-console
      console.log('Copied job details')
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm text-white/70">Chosen hook</div>
        {hook ? (
          <div className="mt-2 p-3 rounded-md bg-[rgba(255,255,255,0.02)] border border-white/6 text-sm">
            <div><strong>Start:</strong> {hook.start}</div>
            <div><strong>End:</strong> {hook.end}</div>
            {hook.reason && <div className="text-xs text-white/60 mt-1">{hook.reason}</div>}
          </div>
        ) : (
          <div className="text-sm text-white/60">Hook not selected yet</div>
        )}
      </div>

      <div>
        <div className="text-sm text-white/70">Segments</div>
        <div className="mt-2 max-h-40 overflow-auto p-2 rounded-md bg-[rgba(255,255,255,0.02)] border border-white/6 text-sm space-y-2">
          {segments && segments.length ? (
            segments.map((s, i) => (
              <div key={i} className="p-2 rounded-md bg-white/2">
                <div><strong>{i + 1}.</strong> {s.start} → {s.end}</div>
                {s.reason && <div className="text-xs text-white/60">{s.reason}</div>}
              </div>
            ))
          ) : (
            <div className="text-sm text-white/60">No segments yet</div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={copyJson} className="px-3 py-1 rounded bg-white text-black text-sm">Copy JSON</button>
      </div>
    </div>
  )
}
