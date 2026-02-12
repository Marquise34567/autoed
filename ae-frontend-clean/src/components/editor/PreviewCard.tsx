import { GeneratedClip } from "@/lib/types";
import { useMemo } from "react";

type PreviewCardProps = {
  clip?: GeneratedClip | null;
  draftUrl?: string | null;
  finalUrl?: string | null;
  outputUrl?: string | null;
  status?: string;
  eta?: number | null;
  stageMessage?: string | null;
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  details?: {
    chosenStart?: number;
    chosenEnd?: number;
    hookStart?: number;
    improvements?: string[];
    edl?: {
      hook?: { start: number; end: number; reason: string };
      segments?: unknown[];
      expectedChange?: {
        originalDurationSec: number;
        finalDurationSec: number;
        totalRemovedSec: number;
      };
    };
    editsApplied?: {
      originalDurationSec: number;
      finalDurationSec: number;
      removedSec: number;
      hook: { start: number; end: number };
      segmentCount: number;
    };
  } | null;
};

function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "calculating…";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function PreviewCard({
  clip,
  draftUrl,
  finalUrl,
  outputUrl,
  status,
  eta,
  stageMessage,
  inputSizeBytes,
  outputSizeBytes,
  details,
}: PreviewCardProps) {
  const isDraftReady = Boolean(draftUrl) && status === "DRAFT_READY";
  const isFinalReady = Boolean(outputUrl || finalUrl) && status === "DONE";
  const editsApplied = details?.editsApplied;
  const meaningfulEdits = editsApplied ? editsApplied.removedSec >= 3 : true;
  
  // Only show final video when status is DONE - use stable URL to prevent video reloading
  const videoSrc = useMemo(() => {
    if (!isFinalReady) return null;
    const finalUrlValue = outputUrl ?? finalUrl;
    if (!finalUrlValue) return null;
    return finalUrlValue;
  }, [isFinalReady, outputUrl, finalUrl]);

  const handleDownload = async () => {
    if (!videoSrc) return;
    try {
      const response = await fetch(videoSrc);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "auto-editor-output.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };
  
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm sm:text-base text-white/60">Final Output</p>
          <h3 className="text-base sm:text-lg font-semibold">Full Video Render</h3>
        </div>
        {isFinalReady && (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200">
            ✓ Ready
          </span>
        )}
      </div>

      {/* File size info */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs sm:text-sm">
        <div>
          <p className="text-white/40">Input</p>
          <p className="text-white font-mono">{formatBytes(inputSizeBytes)}</p>
        </div>
        <div>
          <p className="text-white/40">Output</p>
          <p className="text-white font-mono">{formatBytes(outputSizeBytes)}</p>
        </div>
      </div>

      {/* EDL Info */}
      {editsApplied && isFinalReady && (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400">✂️ Edits Applied</span>
          </div>
          <div className="space-y-1 text-white/60">
            <div>
              • Hook from {editsApplied.hook.start.toFixed(1)}s-{editsApplied.hook.end.toFixed(1)}s
            </div>
            <div>
              • Removed {editsApplied.removedSec.toFixed(1)}s of {editsApplied.originalDurationSec.toFixed(1)}s
            </div>
            <div>• Final duration: {editsApplied.finalDurationSec.toFixed(1)}s</div>
            <div>• {editsApplied.segmentCount} segments kept</div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {videoSrc && meaningfulEdits ? (
            <video
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              src={videoSrc}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-white/40">
              <div className="text-sm sm:text-base">
                {meaningfulEdits
                  ? stageMessage || "Preparing video…"
                  : "No meaningful edits applied"}
              </div>
              {eta !== null && eta !== undefined && eta > 0 && (
                <div className="text-xs text-white/30 tabular-nums">
                  ~{Math.floor(eta / 60)}:{String(eta % 60).padStart(2, "0")} remaining
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isFinalReady && meaningfulEdits && (
        <div className="mt-4">
          <button
            onClick={handleDownload}
            className="w-full rounded-full bg-emerald-500 px-4 py-3.5 sm:py-3 text-base sm:text-sm font-semibold text-white hover:bg-emerald-600 min-h-12"
          >
            Download Final Video
          </button>
        </div>
      )}
    </div>
  );
}
