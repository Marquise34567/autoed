import { CandidateSegment, TranscriptSegment } from "@/lib/types";
import { SilenceInterval } from "@/lib/analyze/silence";

const HOOK_PATTERNS = [
  /\?/,
  /\bhow\b/,
  /\bwhy\b/,
  /\btop\b/,
  /\bnumber\b/,
  /\bsecret\b/,
  /\bresult\b/,
  /\bfast\b/,
  /\bboost\b/,
  /\bwin\b/,
];

function earliestNonSilence(start: number, intervals: SilenceInterval[]) {
  const blocking = intervals.find(
    (interval) => interval.start <= start && interval.end >= start
  );
  if (!blocking) return start;
  return blocking.end;
}

export function selectHookStart(
  candidate: CandidateSegment,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[]
) {
  const relevant = transcript.filter(
    (seg) => seg.start >= candidate.start && seg.start <= candidate.start + 5
  );
  for (const seg of relevant) {
    const text = seg.text.toLowerCase();
    if (HOOK_PATTERNS.some((pattern) => pattern.test(text))) {
      return seg.start;
    }
  }
  return earliestNonSilence(candidate.start, silenceIntervals);
}
