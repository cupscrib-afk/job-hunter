/**
 * Resume tailoring prompt builder.
 * Loads profile + job + research, generates prompt for Claude to tailor the resume.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as tracker from "./tracker";
import * as research from "./research";
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

function formatExperience(exp: any[]): string {
  if (!exp || exp.length === 0) return "No experience listed.";
  return exp
    .map(
      (e) =>
        `**${e.title}** @ ${e.company} (${e.dates})\n${(e.bullets || []).map((b: string) => `- ${b}`).join("\n")}${e.technologies ? `\nTech: ${e.technologies.join(", ")}` : ""}`
    )
    .join("\n\n");
}

function formatSkills(skills: any[]): string {
  if (!skills || skills.length === 0) return "No skills listed.";
  return skills
    .map((s) => `**${s.category}:** ${s.items.join(", ")}`)
    .join("\n");
}

/**
 * Build resume tailoring prompt for a tracked job.
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
  const researchSection = researchBrief
    ? `### Company Research Brief\n${researchBrief.slice(0, 2000)}`
    : "(No research done yet — consider running `research` first for better tailoring.)";

  const descSnippet = formatDescriptionForPrompt(job.description, 2500);

  return `## Resume Tailoring Task

Tailor the resume for: **${job.title}** at **${job.company}**

### Job Description
${descSnippet}

${researchSection}

### Candidate Profile

**Name:** ${profile.name}
**Summary:** ${profile.summary || "N/A"}
**Target Roles:** ${(profile.targetRoles || []).join(", ") || "N/A"}

### Experience
${formatExperience(profile.experience)}

### Education
${(profile.education || []).map((e: any) => `- ${e.degree} — ${e.school} (${e.year})`).join("\n") || "N/A"}

### Skills
${formatSkills(profile.skills)}

### Tailoring Instructions

Write a tailored resume to \`${tracker.outputDir(id)}/resume.md\`.

1. **Match keywords** — Mirror the job description's language. If they say "microservices", use "microservices" not "distributed systems".
2. **Reorder experience** — Lead with the most relevant role. Rewrite bullets to emphasize overlapping skills.
3. **Quantify impact** — Add metrics where the profile supports it (e.g., "reduced latency by 40%").
4. **Tech stack alignment** — Highlight technologies mentioned in the JD. De-emphasize irrelevant ones.
5. **Trim to 1 page** — Aggressively cut anything that doesn't serve this specific application.
6. **Skills section** — Reorder to put the JD's required skills first.

Format as a clean markdown resume. Use professional, concise language.

After writing the file, update the tracker:
\`\`\`bash
cd ~/.claude/skills/job-hunter && bun run job-hunt.ts jobs status ${id} tailored
\`\`\``;
}

/**
 * Check if tailored resume exists.
 */
export function hasOutput(id: string): boolean {
  return existsSync(join(tracker.outputDir(id), "resume.md"));
}

/**
 * Read existing tailored resume.
 */
export function readOutput(id: string): string | null {
  const path = join(tracker.outputDir(id), "resume.md");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}
