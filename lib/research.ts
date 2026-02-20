/**
 * Company research prompt builder.
 * Generates a structured prompt for Claude to research a company using web tools.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as tracker from "./tracker";
import { formatDescriptionForPrompt } from "./format";

function loadProfile(): any | null {
  const path = join(import.meta.dir, "..", "data", "profile.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Build the research prompt for a tracked job.
 * Returns the prompt string for Claude to execute.
 */
export function buildPrompt(id: string): string {
  const job = tracker.get(id);
  if (!job) throw new Error(`Job ${id} not found. Run \`jobs\` to see tracked jobs.`);

  const profile = loadProfile();
  const targetContext = profile?.targetRoles?.length
    ? `\nThe candidate is targeting: ${profile.targetRoles.join(", ")}.`
    : "";

  const descSnippet = formatDescriptionForPrompt(job.description, 2000);

  return `## Company Research Task

Research **${job.company}** for the role: **${job.title}**${targetContext}

### Job Details
- **Company:** ${job.company}
- **Title:** ${job.title}
- **Location:** ${job.location}${job.isRemote ? " (remote)" : ""}
- **URL:** ${job.jobUrl}
${job.salary ? `- **Salary:** ${job.salary}` : ""}

### Job Description (excerpt)
${descSnippet}

### Research Instructions

Use \`web_search\` and \`web_fetch\` to research the following. Write findings to \`${tracker.outputDir(id)}/research.md\`.

1. **Company Overview** — What does ${job.company} do? Product/service, market position, founding year, HQ location.
2. **Culture & Values** — Mission statement, Glassdoor reviews summary, engineering blog insights, remote culture.
3. **Tech Stack** — Languages, frameworks, infrastructure. Check job posting, engineering blog, GitHub.
4. **Recent News** — Last 6 months: funding, product launches, acquisitions, leadership changes.
5. **Team & Growth** — How big is the engineering team? Hiring pace? Open roles count.
6. **Interview Process** — What candidates say on Glassdoor/Blind about interviews for this role type.
7. **Red Flags** — Layoffs, Glassdoor complaints, controversies, high turnover signals.
8. **Talking Points** — 3-5 specific things the candidate can reference in interviews to show genuine interest.

Format as a clean markdown document with these sections. Be factual — cite sources where possible.

After writing the file, update the job status:
\`\`\`bash
cd ~/.claude/skills/job-hunter && bun run job-hunt.ts jobs status ${id} researched
\`\`\``;
}

/**
 * Check if research output already exists.
 */
export function hasOutput(id: string): boolean {
  return existsSync(join(tracker.outputDir(id), "research.md"));
}

/**
 * Read existing research output.
 */
export function readOutput(id: string): string | null {
  const path = join(tracker.outputDir(id), "research.md");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}
