---
name: job-hunter
description: >
  Automated job application pipeline. Finds jobs across LinkedIn, Indeed, Greenhouse, and Lever,
  then guides you through company research, resume tailoring, and cover letter drafting.
  Use when: (1) user says "find me jobs", "job search", "job hunt", "look for roles",
  "/job-hunter", "help me apply", (2) user wants to research a company before applying,
  (3) user needs a tailored resume or cover letter for a specific role,
  (4) user wants to track their application pipeline.
  NOT for: actually submitting applications, salary negotiation, or interview prep questions.
---

# Job Hunter

Agentic job application pipeline: search → research → tailor resume → draft cover letter → package materials.

## CLI Tool

All commands run from this skill directory:

```bash
cd ~/.claude/skills/job-hunter
```

### Search

```bash
bun run job-hunt.ts search "<query>" [options]
```

**Options:**
- `--site linkedin|indeed` — restrict to one job board
- `--location "City, ST"` — location filter
- `--remote` — remote jobs only
- `--results N` — number of results (default: 15)
- `--hours-old N` — max posting age in hours
- `--job-type fulltime|parttime|contract|internship` — filter by type
- `--save` — auto-save all results to job tracker
- `--json` — raw JSON output

Also searches Greenhouse boards and Lever sites configured in `data/profile.json` under `preferences.greenhouseBoards` and `preferences.leverSites`.

**Examples:**
```bash
bun run job-hunt.ts search "software engineer" --location "San Francisco" --results 10
bun run job-hunt.ts search "senior backend engineer" --remote --save
bun run job-hunt.ts search "ML engineer" --site linkedin --results 20 --save
```

### Job Tracker

```bash
bun run job-hunt.ts jobs                              # List all tracked jobs
bun run job-hunt.ts jobs show <id>                    # Show job + materials
bun run job-hunt.ts jobs status <id> <status>         # Update status
bun run job-hunt.ts jobs remove <id>                  # Remove from tracker
```

Statuses: `new` → `researched` → `tailored` → `applied` → `interviewing` → `offer` / `rejected`

### Pipeline Steps

Each step prints a structured prompt. Execute the instructions Claude gives you.

```bash
bun run job-hunt.ts research <id>       # Company research prompt
bun run job-hunt.ts tailor <id>         # Resume tailoring prompt
bun run job-hunt.ts letter <id>         # Cover letter prompt
bun run job-hunt.ts package <id>        # All three steps for one job
```

### Full Pipeline

```bash
bun run job-hunt.ts pipeline "<query>" --top 3 [search options]
```

Searches, saves top N jobs, and prints all prompts for each.

### Profile

```bash
bun run job-hunt.ts profile             # Show current profile
bun run job-hunt.ts profile init        # Create profile.json from example
```

### Cache

```bash
bun run job-hunt.ts cache clear         # Clear search cache
```

## Agentic Pipeline Loop

When the user asks to find and apply to jobs, follow this loop:

### 1. Search & Save

Run a search with `--save` to find and track relevant jobs:
```bash
cd ~/.claude/skills/job-hunter
bun run job-hunt.ts search "<query>" --location "<loc>" --save --results 10
```

Present the results to the user. Let them pick which jobs to pursue, or use `pipeline` for the top N.

### 2. Research Each Company

For each selected job, run:
```bash
bun run job-hunt.ts research <id>
```

This prints a research prompt. Execute it: use `web_search` and `web_fetch` to research the company, then write findings to the output directory specified in the prompt.

### 3. Tailor Resume

After research is complete:
```bash
bun run job-hunt.ts tailor <id>
```

This prints a tailoring prompt with the user's full profile, the job description, and the research brief. Follow the instructions to write a tailored resume.

### 4. Draft Cover Letter

After the resume is tailored:
```bash
bun run job-hunt.ts letter <id>
```

Uses all prior context (research + tailored resume) to generate a personalized cover letter.

### 5. Review & Package

Show the user:
- Research brief (`data/output/<id>/research.md`)
- Tailored resume (`data/output/<id>/resume.md`)
- Cover letter (`data/output/<id>/cover-letter.md`)

Ask for feedback before proceeding to the next job. The user may want to revise.

### 6. Track Progress

Update job status as the user progresses:
```bash
bun run job-hunt.ts jobs status <id> applied
bun run job-hunt.ts jobs status <id> interviewing
```

## Profile Setup

Before tailoring resumes, the user needs a profile:

1. Run `bun run job-hunt.ts profile init`
2. Edit `data/profile.json` with their details
3. Include: experience, education, skills, target roles, preferences

The profile feeds into every tailoring and cover letter prompt.

## File Structure

```
skills/job-hunter/
├── SKILL.md              (this file)
├── job-hunt.ts           (CLI entry point)
├── lib/
│   ├── search.ts         (ts-jobspy + Greenhouse + Lever)
│   ├── research.ts       (company research prompt builder)
│   ├── tailor.ts         (resume tailoring prompt builder)
│   ├── cover-letter.ts   (cover letter prompt builder)
│   ├── tracker.ts        (job CRUD — data/jobs.json)
│   ├── cache.ts          (file-based cache, 30min TTL)
│   └── format.ts         (console + markdown formatters)
├── data/
│   ├── profile.json      (user's resume/profile — fill this in)
│   ├── jobs.json         (tracked jobs)
│   ├── cache/            (auto-managed search cache)
│   └── output/<id>/      (per-job materials)
└── references/
    ├── ts-jobspy-api.md
    ├── greenhouse-api.md
    └── lever-api.md
```
