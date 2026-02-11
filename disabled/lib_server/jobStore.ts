import path from "path";
import fs from "fs";
import { CandidateSegment, TranscriptSegment, GeneratedClip } from "@/lib/types";
import type { EDL } from "@/lib/edl/types";

export type JobStatus =
  | "QUEUED"
  | "ANALYZING"
  | "ENHANCING_AUDIO"
  | "RENDERING_DRAFT"
  | "DRAFT_READY"
  | "RENDERING_FINAL"
  | "DONE"
  | "FAILED";

export type JobRecord = {
  id: string;
  filePath: string;
  createdAt: number;
  duration: number;
  transcript: TranscriptSegment[];
  candidates: CandidateSegment[];
  clips: GeneratedClip[];
  status: JobStatus;
  stage?: string;
  message?: string;
  percent?: number;
  progress?: number;
  etaSec?: number;
  draftUrl?: string;
  finalUrl?: string;
  outputPath?: string;
  outputUrl?: string;
  details?: {
    chosenStart?: number;
    chosenEnd?: number;
    hookStart?: number;
    improvements?: string[];
    edl?: EDL;
    editsApplied?: {
      originalDurationSec: number;
      finalDurationSec: number;
      removedSec: number;
      hook: { start: number; end: number };
      segmentCount: number;
    };
  };
  logs: string[];
  error?: string;
  /** Render queue priority (for scheduling) */
  priority?: "background" | "standard" | "priority" | "ultra";
};

const jobStore = new Map<string, JobRecord>();
const jobDir = path.join(process.cwd(), "tmp", "jobs");

function persistJob(job: JobRecord) {
  fs.mkdirSync(jobDir, { recursive: true });
  const filePath = path.join(jobDir, `${job.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(job, null, 2));
}

function readJob(id: string): JobRecord | null {
  try {
    const filePath = path.join(jobDir, `${id}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export function createJob(record: JobRecord) {
  jobStore.set(record.id, record);
  try {
    persistJob(record);
  } catch {
    // ignore
  }
  return record;
}

export function updateJob(id: string, update: Partial<JobRecord>) {
  const existing = jobStore.get(id);
  if (!existing) return null;
  const next = { ...existing, ...update };
  jobStore.set(id, next);
  try {
    persistJob(next);
  } catch {
    // ignore
  }
  return next;
}

export function appendJobLog(id: string, message: string) {
  const existing = jobStore.get(id);
  if (!existing) return null;
  const next = { ...existing, logs: [...existing.logs, message] };
  jobStore.set(id, next);
  try {
    persistJob(next);
  } catch {
    // ignore
  }
  return next;
}

export function getJob(id: string) {
  const cached = jobStore.get(id);
  if (cached) return cached;
  const stored = readJob(id);
  if (stored) {
    jobStore.set(id, stored);
  }
  return stored;
}
