import { CandidateSegment, TranscriptSegment } from "@/lib/types";

function alignToTranscript(
  start: number,
  transcript: TranscriptSegment[]
): number {
  if (!transcript.length) return start;
  const nearest = transcript.reduce((closest, segment) => {
    const diff = Math.abs(segment.start - start);
    return diff < closest.diff ? { diff, start: segment.start } : closest;
  }, { diff: Number.POSITIVE_INFINITY, start });
  if (Math.abs(nearest.start - start) <= 1) {
    return nearest.start;
  }
  return start;
}

export function generateCandidateSegments(
  duration: number,
  clipLengths: number[],
  transcript: TranscriptSegment[]
): CandidateSegment[] {
  const candidates: CandidateSegment[] = [];
  clipLengths.forEach((length) => {
    const step = Math.max(2, Math.floor(length / 2));
    for (let start = 0; start + length <= duration; start += step) {
      const alignedStart = alignToTranscript(start, transcript);
      const end = Math.min(duration, alignedStart + length);
      candidates.push({
        id: `${length}-${alignedStart.toFixed(2)}`,
        start: alignedStart,
        end,
        duration: end - alignedStart,
        lengthTarget: length,
        score: 0,
        silenceRatio: 0,
        speechDensity: 0,
        energy: 0,
        hookSignals: [],
      });
    }
  });
  return candidates;
}
