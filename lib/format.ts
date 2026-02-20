/**
 * Formatters for job listings, tracker stats, and output display.
 */

import type { TrackedJob, JobStatus } from "./tracker";

export interface JobResult {
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobUrl: string;
  source: string;
  datePosted: string | null;
  salary: string | null;
  description: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_ICONS: Record<JobStatus, string> = {
  new: "o",
  researched: "R",
  tailored: "T",
  applied: "A",
  interviewing: "I",
  offer: "$",
  rejected: "x",
};

/**
 * Format a single job search result for console display.
 */
export function formatJobResult(job: JobResult, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const remote = job.isRemote ? " (remote)" : "";
  const salary = job.salary ? ` | ${job.salary}` : "";
  const posted = job.datePosted ? ` | ${timeAgo(job.datePosted)}` : "";

  let out = `${prefix}${job.title} @ ${job.company}`;
  out += `\n   ${job.location}${remote}${salary}${posted}`;
  out += `\n   [${job.source}] ${job.jobUrl}`;

  return out;
}

/**
 * Format a list of search results.
 */
export function formatSearchResults(
  jobs: JobResult[],
  opts: { query?: string; limit?: number } = {}
): string {
  const limit = opts.limit || 15;
  const shown = jobs.slice(0, limit);

  let out = "";
  if (opts.query) {
    out += `Search: "${opts.query}" — ${jobs.length} results\n\n`;
  }

  out += shown.map((j, i) => formatJobResult(j, i)).join("\n\n");

  if (jobs.length > limit) {
    out += `\n\n... +${jobs.length - limit} more`;
  }

  return out;
}

/**
 * Format a tracked job for display.
 */
export function formatTrackedJob(job: TrackedJob): string {
  const remote = job.isRemote ? " (remote)" : "";
  const salary = job.salary ? ` | ${job.salary}` : "";
  const flags = [
    job.researchDone ? "research" : null,
    job.resumeTailored ? "resume" : null,
    job.letterDrafted ? "letter" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const materials = flags ? ` | materials: ${flags}` : "";

  let out = `[${STATUS_ICONS[job.status]}] ${job.title} @ ${job.company}`;
  out += `\n    id: ${job.id} | status: ${job.status}${materials}`;
  out += `\n    ${job.location}${remote}${salary}`;
  out += `\n    ${job.jobUrl}`;
  out += `\n    found: ${job.dateFound.split("T")[0]}`;

  return out;
}

/**
 * Format the full job tracker listing.
 */
export function formatJobList(jobs: TrackedJob[]): string {
  if (jobs.length === 0) return "No tracked jobs. Use `search --save` to add jobs.";

  const grouped: Record<string, TrackedJob[]> = {};
  for (const j of jobs) {
    if (!grouped[j.status]) grouped[j.status] = [];
    grouped[j.status].push(j);
  }

  const order: JobStatus[] = ["new", "researched", "tailored", "applied", "interviewing", "offer", "rejected"];
  let out = `Job Tracker — ${jobs.length} jobs\n`;

  for (const status of order) {
    const group = grouped[status];
    if (!group || group.length === 0) continue;

    out += `\n--- ${status.toUpperCase()} (${group.length}) ---\n\n`;
    out += group.map((j) => formatTrackedJob(j)).join("\n\n");
    out += "\n";
  }

  return out;
}

/**
 * Format tracker stats summary.
 */
export function formatStats(statsByStatus: Record<string, number>): string {
  const total = Object.values(statsByStatus).reduce((a, b) => a + b, 0);
  if (total === 0) return "No tracked jobs.";

  let out = `Pipeline: ${total} jobs total\n`;
  const order: JobStatus[] = ["new", "researched", "tailored", "applied", "interviewing", "offer", "rejected"];
  for (const s of order) {
    const count = statsByStatus[s] || 0;
    if (count > 0) out += `  [${STATUS_ICONS[s]}] ${s}: ${count}\n`;
  }
  return out;
}

/**
 * Format a job description for use in prompts (truncated).
 */
export function formatDescriptionForPrompt(description: string, maxLen: number = 3000): string {
  return truncate(description, maxLen);
}

/**
 * Format salary from min/max/interval.
 */
export function formatSalary(
  min: number | null,
  max: number | null,
  interval: string | null,
  currency: string | null
): string | null {
  if (!min && !max) return null;
  const curr = currency || "USD";
  const per = interval ? `/${interval}` : "";
  if (min && max) return `${curr} ${min.toLocaleString()}-${max.toLocaleString()}${per}`;
  if (min) return `${curr} ${min.toLocaleString()}+${per}`;
  if (max) return `up to ${curr} ${max.toLocaleString()}${per}`;
  return null;
}
