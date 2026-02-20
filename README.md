# Job Hunter

Automated job application pipeline for [Claude Code](https://claude.ai/claude-code). Searches LinkedIn, Indeed, Greenhouse, and Lever, then guides you through company research, resume tailoring, and cover letter drafting.

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Claude Code](https://claude.ai/claude-code) (optional — works standalone as a CLI too)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/tinyclaw/job-hunter.git ~/.claude/skills/job-hunter
cd ~/.claude/skills/job-hunter
bun install
```

### 2. Create your profile

```bash
bun run job-hunt.ts profile init
```

This copies `data/profile.example.json` to `data/profile.json`. Open it and fill in your details:

```json
{
  "name": "Your Name",
  "email": "you@example.com",
  "location": "City, ST",
  "summary": "Brief professional summary...",
  "targetRoles": ["Senior Software Engineer", "Backend Engineer"],
  "experience": [
    {
      "company": "Acme Corp",
      "title": "Software Engineer",
      "dates": "2022 - Present",
      "bullets": [
        "Built X that did Y resulting in Z"
      ],
      "technologies": ["Go", "PostgreSQL", "Kubernetes"]
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "B.S. Computer Science",
      "year": "2020"
    }
  ],
  "skills": [
    { "category": "Languages", "items": ["Go", "Python", "TypeScript"] },
    { "category": "Infrastructure", "items": ["Kubernetes", "AWS", "Terraform"] }
  ],
  "preferences": {
    "salary": "$150,000 - $200,000",
    "jobType": "fulltime",
    "remote": true,
    "greenhouseBoards": ["stripe", "anthropic"],
    "leverSites": ["netflix"],
    "proxies": []
  }
}
```

The `preferences` section controls which Greenhouse/Lever company boards get searched alongside LinkedIn and Indeed. Add any company's board slug (the part in their careers URL).

### 3. Verify it works

```bash
bun run job-hunt.ts search "software engineer" --results 5
```

You should see job listings from your configured sources.

## Usage

### Search for jobs

```bash
# Basic search
bun run job-hunt.ts search "backend engineer"

# With filters
bun run job-hunt.ts search "ML engineer" --location "San Francisco" --remote --results 20

# Save results to tracker
bun run job-hunt.ts search "senior engineer" --save

# Use a proxy for LinkedIn/Indeed (avoids rate limiting)
bun run job-hunt.ts search "engineer" --proxy "user:pass@proxy.example.com:8080"
```

**Search options:**

| Flag | Description |
|------|-------------|
| `--site linkedin\|indeed` | Restrict to one job board |
| `--location "City, ST"` | Location filter |
| `--remote` | Remote jobs only |
| `--results N` | Number of results (default: 15) |
| `--hours-old N` | Max posting age in hours |
| `--job-type fulltime\|parttime\|contract\|internship` | Job type filter |
| `--proxy "host:port"` | Proxy for LinkedIn/Indeed scraping |
| `--save` | Auto-save all results to tracker |
| `--json` | Raw JSON output |

### Track jobs

```bash
bun run job-hunt.ts jobs                        # List all tracked jobs
bun run job-hunt.ts jobs show <id>              # Show job details
bun run job-hunt.ts jobs status <id> applied    # Update status
bun run job-hunt.ts jobs remove <id>            # Remove from tracker
```

Statuses: `new` > `researched` > `tailored` > `applied` > `interviewing` > `offer` / `rejected`

### Application pipeline

Each step prints a structured prompt. If using Claude Code, it will execute the instructions automatically (researching the company, writing your tailored resume, drafting the cover letter).

```bash
bun run job-hunt.ts research <id>     # Step 1: Company research
bun run job-hunt.ts tailor <id>       # Step 2: Resume tailoring
bun run job-hunt.ts letter <id>       # Step 3: Cover letter
bun run job-hunt.ts package <id>      # All three steps at once
```

### Full pipeline (search + save + all prompts)

```bash
bun run job-hunt.ts pipeline "senior backend engineer" --top 3 --remote
```

Searches, saves the top N jobs, and prints all pipeline prompts for each.

## Proxy setup

LinkedIn rate-limits after ~10 pages of results. To avoid this, configure a proxy:

**One-off (CLI flag):**
```bash
bun run job-hunt.ts search "engineer" --proxy "user:pass@proxy.example.com:8080"
```

**Environment variable:**
```bash
export JOB_HUNTER_PROXY="http://proxy.example.com:8080"
bun run job-hunt.ts search "engineer"
```

**Persistent (profile.json):**
```json
{
  "preferences": {
    "proxies": ["user:pass@proxy1.com:8080"]
  }
}
```

Priority: `--proxy` flag > `JOB_HUNTER_PROXY` env var > profile config.

Proxies are only used for LinkedIn/Indeed. Greenhouse and Lever use public APIs that don't rate-limit.

## Adding company boards

To search a company's Greenhouse or Lever job board, add their slug to your profile:

1. Find the slug from their careers page URL:
   - Greenhouse: `boards.greenhouse.io/stripe` -> slug is `stripe`
   - Lever: `jobs.lever.co/netflix` -> slug is `netflix`

2. Add to `data/profile.json`:
```json
{
  "preferences": {
    "greenhouseBoards": ["stripe", "anthropic", "figma"],
    "leverSites": ["netflix"]
  }
}
```

All configured boards are searched automatically alongside LinkedIn/Indeed.

## File structure

```
job-hunter/
├── README.md
├── SKILL.md              # Claude Code skill metadata
├── job-hunt.ts           # CLI entry point
├── package.json
├── lib/
│   ├── search.ts         # Multi-source search (ts-jobspy + Greenhouse + Lever)
│   ├── tracker.ts        # Job CRUD (data/jobs.json)
│   ├── research.ts       # Company research prompt builder
│   ├── tailor.ts         # Resume tailoring prompt builder
│   ├── cover-letter.ts   # Cover letter prompt builder
│   ├── cache.ts          # File-based cache (30min TTL)
│   └── format.ts         # Console + markdown formatters
├── data/
│   ├── profile.json      # Your resume/profile (git-ignored)
│   ├── profile.example.json
│   ├── jobs.json         # Tracked jobs
│   ├── cache/            # Auto-managed search cache
│   └── output/<id>/      # Per-job generated materials
└── references/           # API docs for job board integrations
```

## As a Claude Code skill

If you cloned this into `~/.claude/skills/job-hunter/`, Claude Code will automatically pick it up. Just say things like:

- "Find me backend engineer jobs in SF"
- "Search for remote ML roles"
- "Help me apply to that Stripe job"
- "/job-hunter"

Claude will run the search, save results, research companies, tailor your resume, and draft cover letters — all guided by your profile.
