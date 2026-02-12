import { TranscriptSegment } from "@/lib/types";
import { SilenceInterval } from "@/lib/analyze/silence";
import type { EDL, EDLSegment, EDLHook } from "./types";

const HOOK_KEYWORDS = [
  "?",
  "how",
  "why",
  "what",
  "wait",
  "watch",
  "look",
  "listen",
  "bro",
  "no way",
  "oh my god",
  "secret",
  "insane",
  "crazy",
  "shocking",
  "unbelievable",
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

function computeSilenceRatio(
  start: number,
  end: number,
  intervals: SilenceInterval[]
): number {
  if (!intervals.length) return 0;
  const duration = end - start;
  if (duration <= 0) return 0;
  const overlap = intervals.reduce((acc, interval) => {
    const s = Math.max(start, interval.start);
    const e = Math.min(end, interval.end);
    return e > s ? acc + (e - s) : acc;
  }, 0);
  return Math.min(1, overlap / duration);
}

function computeSpeechDensity(
  start: number,
  end: number,
  transcript: TranscriptSegment[]
): number {
  if (!transcript.length) return 0.3;
  const words = transcript
    .filter((seg) => seg.end >= start && seg.start <= end)
    .reduce((acc, seg) => acc + seg.text.split(/\s+/).filter(Boolean).length, 0);
  const duration = Math.max(1, end - start);
  const wordsPerSecond = words / duration;
  return Math.min(1, wordsPerSecond / 3.5);
}

function computeKeywordScore(
  start: number,
  end: number,
  transcript: TranscriptSegment[]
): number {
  if (!transcript.length) return 0;
  const text = transcript
    .filter((seg) => seg.end >= start && seg.start <= end)
    .map((seg) => seg.text.toLowerCase())
    .join(" ");

  const hits = HOOK_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  return Math.min(1, hits / 3);
}

function scoreSegment(
  start: number,
  end: number,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[]
): number {
  const silenceRatio = computeSilenceRatio(start, end, silenceIntervals);
  const speechDensity = computeSpeechDensity(start, end, transcript);
  const keywordScore = computeKeywordScore(start, end, transcript);
  const energy = 1 - silenceRatio;

  const score = 0.45 * speechDensity + 0.35 * energy + 0.2 * keywordScore;
  return Number(score.toFixed(3));
}

function findBestHook(
  duration: number,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[]
): EDLHook {
  if (duration < 3) {
    return {
      start: 0,
      end: Math.min(duration, 2.5),
      reason: "Video too short for hook extraction",
    };
  }

  if (!transcript.length) {
    // Fallback: use first non-silent moment
    const firstNonSilent = silenceIntervals.length > 0 && silenceIntervals[0].start === 0
      ? silenceIntervals[0].end
      : 0;
    return {
      start: firstNonSilent,
      end: Math.min(duration, firstNonSilent + 2.5),
      reason: "First non-silent moment (no transcript)",
    };
  }

  // Score all transcript segments as potential hooks
  const candidates = transcript
    .filter((seg) => seg.end - seg.start >= 0.5 && seg.end - seg.start <= 5)
    .map((seg) => {
      const score = scoreSegment(seg.start, seg.end, transcript, silenceIntervals);
      const keywordBonus = computeKeywordScore(seg.start, seg.end, transcript);
      const finalScore = score + keywordBonus * 0.3;
      return { seg, score: finalScore };
    })
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      start: 0,
      end: Math.min(duration, 2.5),
      reason: "No suitable hook found, using opening",
    };
  }

  const best = candidates[0];
  const hookStart = best.seg.start;
  const hookEnd = Math.min(
    duration,
    Math.max(hookStart + 1.5, Math.min(hookStart + 3.0, best.seg.end))
  );

  // Check if hook is already at the beginning (0-3 seconds)
  if (hookStart < 3) {
    return {
      start: hookStart,
      end: hookEnd,
      reason: "Best moment already at opening",
    };
  }

  return {
    start: hookStart,
    end: hookEnd,
    reason: `High-retention moment from ${hookStart.toFixed(1)}s`,
  };
}

function findBestHookInRange(
  duration: number,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[],
  minRatio = 0.1,
  maxRatio = 0.9
): EDLHook {
  const minStart = Math.max(0, duration * minRatio);
  const maxStart = Math.max(minStart, duration * maxRatio - 2.5);
  const window = 2.5;
  const step = 0.5;

  let bestStart = minStart;
  let bestScore = -Infinity;

  for (let start = minStart; start <= maxStart; start += step) {
    const end = Math.min(duration, start + window);
    const score = scoreSegment(start, end, transcript, silenceIntervals);
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  const hookStart = Math.min(bestStart, Math.max(0, duration - 2.5));
  const hookEnd = Math.min(duration, hookStart + 2.5);

  return {
    start: hookStart,
    end: hookEnd,
    reason: `Auto-rewrite hook from ${hookStart.toFixed(1)}s`,
  };
}

function computeEDLStats(edl: EDL, duration: number) {
  const hookSec = edl.hook.end - edl.hook.start;
  const segmentsSec = edl.segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const keptSec = hookSec + segmentsSec;
  const removedSec = Math.max(0, duration - keptSec);
  const hookFromLater = edl.hook.start > 3;
  return {
    keptSec,
    removedSec,
    hookFromLater,
    segmentCount: edl.segments.length,
  };
}

function isMeaningfulEdit(edl: EDL, duration: number): boolean {
  const { removedSec, hookFromLater, segmentCount } = computeEDLStats(edl, duration);
  const minRemoved = Math.max(3, duration * 0.05);
  const hookOk = duration < 10 ? true : hookFromLater;
  return removedSec >= minRemoved && hookOk && segmentCount >= 2;
}

function isOverlapping(a: EDLSegment, b: EDLSegment) {
  return a.start < b.end && b.start < a.end;
}

function rewriteEDLMeaningful(params: {
  duration: number;
  transcript: TranscriptSegment[];
  silenceIntervals: SilenceInterval[];
}): EDL {
  const { duration, transcript, silenceIntervals } = params;
  const hook = findBestHookInRange(duration, transcript, silenceIntervals);

  const targetSec = Math.min(Math.max(25, duration * 0.6), duration - 3);

  const contextStart = hook.end;
  const contextEnd = Math.min(duration, contextStart + 4.5);
  const contextSegment: EDLSegment | null =
    contextEnd - contextStart >= 2
      ? {
          start: contextStart,
          end: contextEnd,
          reason: "Post-hook context",
          score: 0.6,
        }
      : null;

  const rawCandidates = generateSegments(duration, transcript, silenceIntervals, "high");
  const candidates = removeHookOverlap(rawCandidates, hook)
    .filter((seg) => seg.end - seg.start >= 2)
    .map((seg) => ({
      ...seg,
      end: Math.min(seg.end, seg.start + 6),
    }))
    .filter((seg) => seg.end - seg.start >= 2)
    .sort((a, b) => b.score - a.score);

  const segments: EDLSegment[] = [];
  if (contextSegment) segments.push(contextSegment);

  let keptSec = (hook.end - hook.start) + (contextSegment ? contextSegment.end - contextSegment.start : 0);

  for (const candidate of candidates) {
    if (keptSec >= targetSec) break;
    if (segments.some((seg) => isOverlapping(seg, candidate))) continue;
    segments.push(candidate);
    keptSec += candidate.end - candidate.start;
  }

  // Ensure at least 2 segments (excluding hook)
  if (segments.length < 2) {
    const fallbackStart = Math.min(duration * 0.7, Math.max(0, duration - 6));
    const fallbackEnd = Math.min(duration, fallbackStart + 3.5);
    const fallback: EDLSegment = {
      start: fallbackStart,
      end: fallbackEnd,
      reason: "Fallback energetic segment",
      score: 0.4,
    };
    if (!segments.some((seg) => isOverlapping(seg, fallback))) {
      segments.push(fallback);
    }
  }

  const orderedSegments = segments.sort((a, b) => a.start - b.start);
  const hookDuration = hook.end - hook.start;
  const segmentsDuration = orderedSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const finalDuration = hookDuration + segmentsDuration;
  const totalRemoved = Math.max(0, duration - finalDuration);

  return {
    version: 1,
    hook,
    segments: orderedSegments,
    notes: `Auto-rewrite for meaningful edits (kept ${finalDuration.toFixed(1)}s)`,
    expectedChange: {
      originalDurationSec: duration,
      finalDurationSec: finalDuration,
      totalRemovedSec: totalRemoved,
    },
  };
}

function generateSegments(
  duration: number,
  transcript: TranscriptSegment[],
  silenceIntervals: SilenceInterval[],
  aggressiveness: "low" | "med" | "high"
): EDLSegment[] {
  const windowSize = 3;
  const step = 1.5;
  const thresholds = { low: 0.35, med: 0.45, high: 0.55 };
  let threshold = thresholds[aggressiveness];

  const candidates: EDLSegment[] = [];

  for (let start = 0; start < duration; start += step) {
    const end = Math.min(duration, start + windowSize);
    const score = scoreSegment(start, end, transcript, silenceIntervals);
    const silenceRatio = computeSilenceRatio(start, end, silenceIntervals);

    if (score >= threshold && silenceRatio < 0.7) {
      candidates.push({
        start,
        end,
        score,
        reason: "High-value content",
      });
    }
  }

  // If too aggressive, lower threshold
  if (candidates.length === 0) {
    threshold = Math.max(0.25, threshold - 0.15);
    for (let start = 0; start < duration; start += step) {
      const end = Math.min(duration, start + windowSize);
      const score = scoreSegment(start, end, transcript, silenceIntervals);
      candidates.push({ start, end, score, reason: "Acceptable content" });
    }
  }

  // Merge overlapping segments
  if (candidates.length === 0) {
    return [];
  }

  const sorted = candidates.sort((a, b) => a.start - b.start);
  const merged: EDLSegment[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    if (next.start <= current.end + 0.3) {
      current.end = Math.max(current.end, next.end);
      current.score = Math.max(current.score, next.score);
    } else {
      if (current.end - current.start >= 0.8) {
        merged.push(current);
      }
      current = { ...next };
    }
  }

  if (current.end - current.start >= 0.8) {
    merged.push(current);
  }

  return merged;
}

function removeHookOverlap(
  segments: EDLSegment[],
  hook: EDLHook
): EDLSegment[] {
  return segments
    .map((seg) => {
      // No overlap
      if (seg.end <= hook.start || seg.start >= hook.end) {
        return seg;
      }

      // Segment contains hook - split it
      const parts: EDLSegment[] = [];
      if (seg.start < hook.start) {
        parts.push({ ...seg, end: hook.start });
      }
      if (seg.end > hook.end) {
        parts.push({ ...seg, start: hook.end });
      }
      return parts;
    })
    .flat()
    .filter((seg) => seg.end - seg.start >= 0.8);
}

export function buildEDL(params: {
  duration: number;
  transcript: TranscriptSegment[];
  silenceIntervals: SilenceInterval[];
  aggressiveness?: "low" | "med" | "high";
}): EDL {
  const {
    duration,
    transcript,
    silenceIntervals,
    aggressiveness = "high",
  } = params;

  if (duration < 5) {
    // Video too short to edit meaningfully
    return {
      version: 1,
      hook: { start: 0, end: duration, reason: "Video too short" },
      segments: [],
      notes: "Video shorter than 5 seconds, no edits applied",
      expectedChange: {
        originalDurationSec: duration,
        finalDurationSec: duration,
        totalRemovedSec: 0,
      },
    };
  }

  const hook = findBestHook(duration, transcript, silenceIntervals);
  let segments = generateSegments(duration, transcript, silenceIntervals, aggressiveness);

  // Remove hook overlap from segments
  segments = removeHookOverlap(segments, hook);

  // Ensure we keep at least 40% of video (configurable by aggressiveness)
  const targetKeepRatio = aggressiveness === "high" ? 0.4 : aggressiveness === "med" ? 0.5 : 0.65;
  const keptDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const currentRatio = duration > 0 ? keptDuration / duration : 1;

  if (currentRatio < targetKeepRatio) {
    // Too aggressive, add more segments
    const additionalNeeded = duration * targetKeepRatio - keptDuration;
    const allCandidates = generateSegments(
      duration,
      transcript,
      silenceIntervals,
      "low" // use lower threshold
    );
    const filtered = removeHookOverlap(allCandidates, hook)
      .filter((seg) => !segments.some((s) => s.start === seg.start))
      .sort((a, b) => b.score - a.score);

    let added = 0;
    for (const seg of filtered) {
      if (added >= additionalNeeded) break;
      segments.push(seg);
      added += seg.end - seg.start;
    }

    segments = segments.sort((a, b) => a.start - b.start);
  }

  const hookDuration = hook.end - hook.start;
  const segmentsDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  const finalDuration = hookDuration + segmentsDuration;
  const totalRemoved = Math.max(0, duration - finalDuration);

  const notes = segments.length > 0
    ? `Extracted hook from ${hook.start.toFixed(1)}s, kept ${segments.length} segments`
    : `Hook-only edit (removed ${totalRemoved.toFixed(1)}s)`;

  const baseEDL: EDL = {
    version: 1,
    hook,
    segments,
    notes,
    expectedChange: {
      originalDurationSec: duration,
      finalDurationSec: finalDuration,
      totalRemovedSec: totalRemoved,
    },
  };

  if (isMeaningfulEdit(baseEDL, duration)) {
    return baseEDL;
  }

  return rewriteEDLMeaningful({ duration, transcript, silenceIntervals });
}

export function validateEDL(edl: EDL): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!edl || edl.version !== 1) {
    errors.push("Invalid EDL version");
  }

  if (!edl.hook || edl.hook.end <= edl.hook.start) {
    errors.push("Invalid hook timing");
  }

  if (edl.hook.start < 0 || edl.hook.end > edl.expectedChange.originalDurationSec) {
    errors.push("Hook out of bounds");
  }

  for (let i = 0; i < edl.segments.length; i += 1) {
    const seg = edl.segments[i];
    if (seg.end <= seg.start) {
      errors.push(`Segment ${i}: end <= start`);
    }
    if (seg.start < 0 || seg.end > edl.expectedChange.originalDurationSec) {
      errors.push(`Segment ${i}: out of bounds`);
    }
  }

  // Check for overlaps in segments
  for (let i = 0; i < edl.segments.length - 1; i += 1) {
    if (edl.segments[i].end > edl.segments[i + 1].start) {
      errors.push(`Segments ${i} and ${i + 1} overlap`);
    }
  }

  const minRemoved = Math.max(3, edl.expectedChange.originalDurationSec * 0.05);
  if (edl.expectedChange.totalRemovedSec < minRemoved) {
    errors.push("No meaningful edits: removed duration below threshold");
  }
  if (edl.expectedChange.originalDurationSec >= 10 && edl.hook.start <= 3) {
    errors.push("No meaningful edits: hook not moved from later in the video");
  }
  if (edl.segments.length < 2) {
    errors.push("No meaningful edits: fewer than 2 segments");
  }

  return { valid: errors.length === 0, errors };
}
