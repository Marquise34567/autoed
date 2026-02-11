export type ManualFacecamCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
};

export type CandidateSegment = {
  id: string;
  start: number;
  end: number;
  duration: number;
  lengthTarget: number;
  score: number;
  hookStart?: number;
  silenceRatio: number;
  speechDensity: number;
  energy: number;
  hookSignals: string[];
};

export type AnalyzeResult = {
  jobId: string;
  duration: number;
  transcript: TranscriptSegment[];
  candidates: CandidateSegment[];
};

export type GenerateSettings = {
  clipLengths: number[];
  numClips: number;
  aggressiveness: "low" | "med" | "high";
  autoSelect: boolean;
  autoHook: boolean;
  soundEnhance: boolean;
  manualFacecamCrop?: ManualFacecamCrop | null;
};

export type GeneratedClip = {
  id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  hookStart?: number;
  outputPath: string;
  thumbnailPath?: string;
};
