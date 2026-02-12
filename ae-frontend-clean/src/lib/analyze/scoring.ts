import { CandidateSegment, TranscriptSegment } from "@/lib/types";
import { SilenceInterval } from "@/lib/analyze/silence";

const HOOK_KEYWORDS = [
  "?",
  "how",
  "why",
  "what",
  "top",
  "best",
  "secret",
  "number",
  "step",
  "result",
  "growth",
  "insane",
  "crazy",
  "shocking",
];

function computeSilenceRatio(
  segmentStart: number,
  segmentEnd: number,
  intervals: SilenceInterval[]
) {
  if (!intervals.length) return 0;
  const duration = segmentEnd - segmentStart;
  if (duration <= 0) return 0;
  const overlap = intervals.reduce((acc, interval) => {
    const start = Math.max(segmentStart, interval.start);
    const end = Math.min(segmentEnd, interval.end);
    return end > start ? acc + (end - start) : acc;
  }, 0);
  return Math.min(1, overlap / duration);
}

function computeSpeechDensity(
  segmentStart: number,
  segmentEnd: number,
  transcript: TranscriptSegment[]
) {
  if (!transcript.length) return 0.6;
  const words = transcript
    .filter((seg) => seg.end >= segmentStart && seg.start <= segmentEnd)
    .reduce((acc, seg) => acc + seg.text.split(/\s+/).length, 0);
  const duration = Math.max(1, segmentEnd - segmentStart);
  return Math.min(1, words / duration / 3.5);
}

function computeHookSignals(
  segmentStart: number,
  transcript: TranscriptSegment[]
) {
  if (!transcript.length) return [] as string[];
  const startText = transcript
    .filter((seg) => seg.end >= segmentStart && seg.start <= segmentStart + 4)
    .map((seg) => seg.text.toLowerCase())
    .join(" ");

  return HOOK_KEYWORDS.filter((keyword) => startText.includes(keyword));
}

export function scoreCandidates(
  candidates: CandidateSegment[],
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[]
) {
  return candidates.map((candidate) => {
    const silenceRatio = computeSilenceRatio(
      candidate.start,
      candidate.end,
      silenceIntervals
    );
    const speechDensity = computeSpeechDensity(
      candidate.start,
      candidate.end,
      transcript
    );
    const hookSignals = computeHookSignals(candidate.start, transcript);
    const energy = Math.max(0.2, 1 - silenceRatio);

    const hookBoost = Math.min(1, hookSignals.length / 2);
    const score = Math.round(
      Math.min(
        100,
        100 * (0.45 * speechDensity + 0.35 * energy + 0.2 * hookBoost) -
          silenceRatio * 15
      )
    );

    return {
      ...candidate,
      silenceRatio,
      speechDensity,
      energy: Math.round(energy * 100),
      hookSignals,
      score: Math.max(0, score),
    };
  });
}
