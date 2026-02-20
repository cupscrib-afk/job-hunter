/**
 * Job tracking CRUD — persists to data/jobs.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const DATA_DIR = join(import.meta.dir, "..", "data");
const JOBS_PATH = join(DATA_DIR, "jobs.json");
const OUTPUT_DIR = join(DATA_DIR, "output");

export type JobStatus =
  | "new"
  | "researched"
  | "tailored"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

export interface TrackedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobUrl: string;
  source: string;
  datePosted: string | null;
  dateFound: string;
  salary: string | null;
  description: string;
  status: JobStatus;
  researchDone: boolean;
  resumeTailored: boolean;
  letterDrafted: boolean;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function jobId(url: string): string {
  return createHash("md5").update(url).digest("hex").slice(0, 8);
}

export function load(): TrackedJob[] {
  ensureDir();
  if (!existsSync(JOBS_PATH)) return [];
  try {
    return JSON.parse(readFileSync(JOBS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function save(jobs: TrackedJob[]): void {
  ensureDir();
  writeFileSync(JOBS_PATH, JSON.stringify(jobs, null, 2));
}

export function add(job: Omit<TrackedJob, "id" | "dateFound" | "status" | "researchDone" | "resumeTailored" | "letterDrafted">): TrackedJob {
  const jobs = load();
  const id = jobId(job.jobUrl);

  const existing = jobs.find((j) => j.id === id);
  if (existing) return existing;

  const tracked: TrackedJob = {
    ...job,
    id,
    dateFound: new Date().toISOString(),
    status: "new",
    researchDone: false,
    resumeTailored: false,
    letterDrafted: false,
  };

  jobs.push(tracked);
  save(jobs);
  return tracked;
}

export function get(id: string): TrackedJob | undefined {
  return load().find((j) => j.id === id);
}

export function updateStatus(id: string, status: JobStatus): TrackedJob | null {
  const jobs = load();
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;
  job.status = status;
  save(jobs);
  return job;
}

export function updateFlags(
  id: string,
  flags: Partial<Pick<TrackedJob, "researchDone" | "resumeTailored" | "letterDrafted">>
): TrackedJob | null {
  const jobs = load();
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;
  Object.assign(job, flags);
  save(jobs);
  return job;
}

export function remove(id: string): boolean {
  const jobs = load();
  const before = jobs.length;
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === before) return false;
  save(filtered);
  return true;
}

export function list(status?: JobStatus): TrackedJob[] {
  const jobs = load();
  if (!status) return jobs;
  return jobs.filter((j) => j.status === status);
}

export function outputDir(id: string): string {
  const dir = join(OUTPUT_DIR, id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function stats(): Record<JobStatus, number> {
  const jobs = load();
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    counts[j.status] = (counts[j.status] || 0) + 1;
  }
  return counts as Record<JobStatus, number>;
}
