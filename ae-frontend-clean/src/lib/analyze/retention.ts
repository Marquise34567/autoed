import { TranscriptSegment } from "@/lib/types";
import { SilenceInterval } from "@/lib/analyze/silence";

export type RetentionSegment = {
  start: number;
  end: number;
  score: number;
  reason: string;
};

export type RetentionHook = {
  start: number;
  end: number;
  reason: string;
};

export type RetentionPlan = {
  hook: RetentionHook;
  segments: RetentionSegment[];
  stats: {
    duration: number;
    keptDuration: number;
    keepRatio: number;
    aggressiveness: "low" | "med" | "high";
    windowSize: number;
    step: number;
  };
};

const HOOK_KEYWORDS = [
  "?",
  "how",
  "why",
  "what",
  "wait",
  "watch",
  "look",
  "listen",
  "secret",
  "insane",
  "crazy",
  "shocking",
  "unbelievable",
  "no way",
  "wild",
  "funny",
  "hilarious",
  "awkward",
  "emotional",
  "surprise",
  "boom",
  "wow",
  "stop",
  "real",
];

const AGGRESSIVE_THRESHOLD = {
  low: 0.35,
  med: 0.45,
  high: 0.55,
} as const;

const TARGET_KEEP_RATIO = {
  low: 0.65,
  med: 0.5,
  high: 0.4,
} as const;

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

function computeKeywordScore(
  segmentStart: number,
  segmentEnd: number,
  transcript: TranscriptSegment[]
) {
  if (!transcript.length) return 0;
  const text = transcript
    .filter((seg) => seg.end >= segmentStart && seg.start <= segmentEnd)
    .map((seg) => seg.text.toLowerCase())
    .join(" ");

  const hits = HOOK_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  return Math.min(1, hits / 3);
}

function pickHookSegment(
  duration: number,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[]
): RetentionHook {
  if (!transcript.length) {
    const fallbackStart = earliestNonSilence(0, silenceIntervals);
    const end = Math.min(duration, fallbackStart + 2.5);
    return {
      start: fallbackStart,
      end,
      reason: "Fallback hook (no transcript)",
    };
  }

  const scored = transcript.map((seg) => {
    const keywordScore = computeKeywordScore(seg.start, seg.end, transcript);
    const density = computeSpeechDensity(seg.start, seg.end, transcript);
    const durationScore = Math.min(1, (seg.end - seg.start) / 3);
    const score = 0.45 * density + 0.35 * keywordScore + 0.2 * durationScore;
    return { seg, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  const hookStart = earliestNonSilence(best.seg.start, silenceIntervals);
  const hookEnd = Math.min(duration, Math.max(hookStart + 1, hookStart + 2.5));

  return {
    start: hookStart,
    end: hookEnd,
    reason: "High-interest moment hook",
  };
}

function earliestNonSilence(start: number, intervals: SilenceInterval[]) {
  const blocking = intervals.find(
    (interval) => interval.start <= start && interval.end >= start
  );
  if (!blocking) return start;
  return blocking.end;
}

function mergeSegments(segments: RetentionSegment[], gap = 0.2) {
  if (!segments.length) return [] as RetentionSegment[];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: RetentionSegment[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    if (next.start <= current.end + gap) {
      current.end = Math.max(current.end, next.end);
      current.score = Math.max(current.score, next.score);
      current.reason = "Merged high-retention segment";
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

function enforceKeepRatio(
  segments: RetentionSegment[],
  duration: number,
  targetRatio: number
) {
  const kept = segments.reduce((acc, seg) => acc + (seg.end - seg.start), 0);
  if (kept >= duration * targetRatio) return segments;

  const targetSeconds = Math.max(30, duration * targetRatio);
  const sorted = [...segments].sort((a, b) => b.score - a.score);
  const keptSegments: RetentionSegment[] = [];
  let total = 0;
  for (const seg of sorted) {
    if (total >= targetSeconds) break;
    keptSegments.push(seg);
    total += seg.end - seg.start;
  }
  return mergeSegments(keptSegments);
}

function trimOverlap(segments: RetentionSegment[], hook: RetentionHook) {
  return segments
    .map((segment) => {
      if (segment.end <= hook.start || segment.start >= hook.end) return segment;
      const left = segment.start < hook.start ? { ...segment, end: hook.start } : null;
      const right = segment.end > hook.end ? { ...segment, start: hook.end } : null;
      const candidates = [left, right].filter(Boolean) as RetentionSegment[];
      return candidates;
    })
    .flat()
    .filter((segment) => segment.end - segment.start >= 0.8);
}

export function buildRetentionPlan(params: {
  duration: number;
  transcript: TranscriptSegment[];
  silenceIntervals: SilenceInterval[];
  aggressiveness?: "low" | "med" | "high";
}) {
  const {
    duration,
    transcript,
    silenceIntervals,
    aggressiveness = "high",
  } = params;

  const windowSize = 4;
  const step = 2;
  const segments: RetentionSegment[] = [];

  for (let start = 0; start < duration; start += step) {
    const end = Math.min(duration, start + windowSize);
    const silenceRatio = computeSilenceRatio(start, end, silenceIntervals);
    const speechDensity = computeSpeechDensity(start, end, transcript);
    const keywordScore = computeKeywordScore(start, end, transcript);
    const energy = 1 - silenceRatio;
    const score = 0.45 * speechDensity + 0.35 * energy + 0.2 * keywordScore;

    segments.push({
      start,
      end,
      score: Number(score.toFixed(3)),
      reason: "Retention window",
    });
  }

  let threshold = Number(AGGRESSIVE_THRESHOLD[aggressiveness]);
  let filtered = segments.filter((seg) => seg.score >= threshold);
  filtered = filtered.filter(
    (seg) => computeSilenceRatio(seg.start, seg.end, silenceIntervals) < 0.65
  );

  if (!filtered.length) {
    threshold = Math.max(0.25, threshold - 0.1);
    filtered = segments.filter((seg) => seg.score >= threshold);
  }

  let merged = mergeSegments(filtered);
  merged = enforceKeepRatio(merged, duration, TARGET_KEEP_RATIO[aggressiveness]);

  const hook = pickHookSegment(duration, transcript, silenceIntervals);
  const trimmedSegments = trimOverlap(merged, hook);

  const keptDuration = trimmedSegments.reduce(
    (acc, seg) => acc + (seg.end - seg.start),
    0
  );

  return {
    hook,
    segments: trimmedSegments,
    stats: {
      duration,
      keptDuration,
      keepRatio: duration ? keptDuration / duration : 1,
      aggressiveness,
      windowSize,
      step,
    },
  } satisfies RetentionPlan;
}
