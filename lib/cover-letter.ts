/**
 * Cover letter prompt builder.
 * Loads profile + job + research + tailored resume, generates prompt for Claude.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as tracker from "./tracker";

const PROJECT_DIR = join(import.meta.dir, "..");
import * as research from "./research";
import * as tailor from "./tailor";
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
 * Build cover letter prompt for a tracked job.
 */
export function buildPrompt(id: string): string {
  const job = tracker.get(id);
  if (!job) throw new Error(`Job ${id} not found. Run \`jobs\` to see tracked jobs.`);

  const profile = loadProfile();
  if (!profile) {
    throw new Error(
      "No profile found. Run `profile init` to create one, then fill in your details."
    );
  }

  const researchBrief = research.readOutput(id);
  const tailoredResume = tailor.readOutput(id);
  const descSnippet = formatDescriptionForPrompt(job.description, 2000);

  const researchSection = researchBrief
    ? `### Company Research\n${researchBrief.slice(0, 1500)}`
    : "(No research available.)";

  const resumeSection = tailoredResume
    ? `### Tailored Resume\n${tailoredResume.slice(0, 2000)}`
    : "(No tailored resume available — consider running `tailor` first.)";

  return `## Cover Letter Task

Draft a cover letter for: **${job.title}** at **${job.company}**

### Job Description
${descSnippet}

${researchSection}

${resumeSection}

### Candidate Info
- **Name:** ${profile.name}
- **Email:** ${profile.email || "N/A"}
- **Location:** ${profile.location || "N/A"}
- **URLs:** ${(profile.urls || []).join(", ") || "N/A"}

### Cover Letter Instructions

Write a cover letter to \`${tracker.outputDir(id)}/cover-letter.md\`.

1. **Opening** — Hook with something specific about the company (from research). Don't start with "I am writing to apply for...".
2. **Why this company** — Reference specific product, mission, or recent news. Show you've done homework.
3. **Why you** — Connect 2-3 most relevant experiences to the role's key requirements. Use specific achievements.
4. **Technical fit** — Briefly mention tech stack alignment without just listing technologies.
5. **Closing** — Express genuine interest, mention next steps, keep it confident but not presumptuous.

**Rules:**
- 3-4 paragraphs max. Under 400 words.
- No generic filler ("I am a passionate engineer with a proven track record...").
- Match the company's tone (startup = casual, enterprise = formal).
- Every sentence should earn its place — if it could go in any cover letter, cut it.

After writing the file, update the tracker:
\`\`\`bash
cd ${PROJECT_DIR} && bun run job-hunt.ts jobs status ${id} tailored
\`\`\``;
}

/**
 * Check if cover letter exists.
 */
export function hasOutput(id: string): boolean {
  return existsSync(join(tracker.outputDir(id), "cover-letter.md"));
}

/**
 * Read existing cover letter.
 */
export function readOutput(id: string): string | null {
  const path = join(tracker.outputDir(id), "cover-letter.md");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}
