import { ChangeEvent } from "react";
import PremiumBadge from '@/components/PremiumBadge';
import { GenerateSettings } from "@/lib/types";

type EditorControlsProps = {
  title: string;
  onTitleChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenCrop: () => void;
  settings: GenerateSettings;
  onSettingsChange: (next: GenerateSettings) => void;
  locked: boolean;
};

export default function EditorControls({
  title,
  onTitleChange,
  onFileChange,
  settings,
  onSettingsChange,
  locked,
}: EditorControlsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-3 right-4">
          <PremiumBadge size="sm" />
        </div>

        <label className="text-xs sm:text-sm uppercase tracking-[0.12em] text-white/50">Project Title</label>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="mt-3 w-full rounded-xl sm:rounded-2xl border border-white/8 bg-black/40 px-4 py-3.5 sm:py-3 text-base sm:text-sm text-white placeholder:text-white/40 min-h-12 shadow-inner"
          placeholder="Creator sprint cut"
        />

        <div className="mt-4">
          <label className="block text-sm sm:text-xs text-white/50 mb-2">Video File (one at a time)</label>

          <label className={`group block w-full cursor-pointer rounded-xl p-6 border-2 ${locked ? 'border-white/6 bg-black/20' : 'border-dashed border-white/12 bg-white/3 hover:border-white/40'} transition`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Drag & drop or click to upload</div>
                <div className="text-xs text-white/60 mt-1">MP4, MOV, MKV — up to your plan limits</div>
              </div>
              <div className="ml-4">
                <button type="button" className="px-3 py-1 rounded-md bg-emerald-500 text-black font-medium">Choose file</button>
              </div>
            </div>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-m4v,video/x-matroska,.mp4,.mov,.mkv"
              onChange={onFileChange}
              disabled={locked}
              className="sr-only"
            />
          </label>

          {locked && (
            <p className="mt-2 text-sm sm:text-xs text-amber-400/70">Processing in progress. Please wait to upload a new video.</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            id="smartZoom"
            type="checkbox"
            checked={settings?.smartZoom !== false}
            onChange={(e) => onSettingsChange({ ...(settings || {}), smartZoom: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="smartZoom" className="text-sm text-white/80">Smart Zoom (recommended)</label>
        </div>
      </div>
    </div>
  )
}
