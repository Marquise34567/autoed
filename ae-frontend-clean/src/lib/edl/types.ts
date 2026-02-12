export type EDLSegment = {
  start: number;
  end: number;
  reason: string;
  score: number;
};

export type EDLHook = {
  start: number;
  end: number;
  reason: string;
};

export type EDL = {
  version: 1;
  hook: EDLHook;
  segments: EDLSegment[];
  notes: string;
  expectedChange: {
    originalDurationSec: number;
    finalDurationSec: number;
    totalRemovedSec: number;
  };
};
