# Job Hunter

An automated job search and application tool. It finds jobs across LinkedIn, Indeed, Greenhouse, and Lever, then helps you research companies, tailor your resume, and draft cover letters — all from your terminal.

Works standalone or as a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill that lets you just say "find me jobs" and have Claude do the rest.

## What does this do?

1. **Searches multiple job boards at once** — LinkedIn, Indeed, plus any company career pages you configure (Greenhouse and Lever)
2. **Tracks your applications** — saves jobs you're interested in and tracks their status
3. **Generates application materials** — company research briefs, tailored resumes, and cover letters, all based on your profile

## Getting started

### Step 1: Install Bun (the JavaScript runtime)

Job Hunter runs on [Bun](https://bun.sh/), a fast JavaScript runtime. If you don't have it yet:

**Mac:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (WSL) / Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

After installing, close and reopen your terminal, then verify it worked:
```bash
bun --version
```
You should see a version number like `1.x.x`.

### Step 2: Download Job Hunter

Open your terminal and run:
```bash
git clone https://github.com/tjp2021/job-hunter.git
cd job-hunter
```

Then install the dependencies:
```bash
bun install
```

> **Using with Claude Code?** Clone into the skills directory instead so Claude picks it up automatically:
> ```bash
> git clone https://github.com/tjp2021/job-hunter.git ~/.claude/skills/job-hunter
> cd ~/.claude/skills/job-hunter
> bun install
> ```

### Step 3: Set up your profile

Your profile is how Job Hunter knows about your background so it can tailor resumes and cover letters for you. Create one:

```bash
bun run job-hunt.ts profile init
```

This creates a file called `data/profile.json`. Open it in any text editor (VS Code, TextEdit, Notepad, etc.) and replace the example data with your own. Here's what each section means:

```json
{
  "name": "Your full name",
  "email": "your.email@example.com",
  "location": "City, State",
  "summary": "A 1-2 sentence summary of who you are professionally",

  "targetRoles": ["Job titles you're looking for"],

  "experience": [
    {
      "company": "Where you worked",
      "title": "Your job title",
      "dates": "2022 - Present",
      "bullets": [
        "What you accomplished (use numbers when possible)",
        "Example: Reduced page load time by 40% by optimizing database queries"
      ],
      "technologies": ["Tools", "Languages", "Frameworks you used"]
    }
  ],

  "education": [
    {
      "school": "School name",
      "degree": "Your degree",
      "year": "Graduation year"
    }
  ],

  "skills": [
    { "category": "Languages", "items": ["Python", "JavaScript"] },
    { "category": "Tools", "items": ["Git", "Docker"] }
  ],

  "preferences": {
    "salary": "$100,000 - $150,000",
    "jobType": "fulltime",
    "remote": true,
    "greenhouseBoards": [],
    "leverSites": [],
    "proxies": []
  }
}
```

> **Tip:** Don't worry about getting it perfect. You can always edit this file later.

### Step 4: Run your first search

```bash
bun run job-hunt.ts search "software engineer" --results 5
```

You should see a list of job postings. If you do, everything is working.

## How to use it

### Searching for jobs

The basic command is:
```bash
bun run job-hunt.ts search "your job title here"
```

You can add filters to narrow results:

```bash
# Only remote jobs
bun run job-hunt.ts search "frontend developer" --remote

# In a specific city
bun run job-hunt.ts search "data analyst" --location "New York, NY"

# Only from LinkedIn
bun run job-hunt.ts search "product manager" --site linkedin

# Get more results (default is 15)
bun run job-hunt.ts search "designer" --results 30

# Only jobs posted in the last 24 hours
bun run job-hunt.ts search "engineer" --hours-old 24

# Filter by job type
bun run job-hunt.ts search "developer" --job-type contract

# Save all results so you can work with them later
bun run job-hunt.ts search "backend engineer" --remote --save
```

You can combine any of these filters together.

### Saving and tracking jobs

When you find jobs you like, use `--save` to add them to your tracker:

```bash
bun run job-hunt.ts search "ML engineer" --save
```

Then manage them:
```bash
# See all your saved jobs
bun run job-hunt.ts jobs

# See details about a specific job (use the ID from the list)
bun run job-hunt.ts jobs show abc123

# Update the status as you progress
bun run job-hunt.ts jobs status abc123 applied
bun run job-hunt.ts jobs status abc123 interviewing

# Remove a job you're no longer interested in
bun run job-hunt.ts jobs remove abc123
```

Job statuses go: `new` > `researched` > `tailored` > `applied` > `interviewing` > `offer` or `rejected`

### Preparing your application

Once you've saved a job, Job Hunter can help you prepare your application in three steps:

**Step 1 — Research the company:**
```bash
bun run job-hunt.ts research abc123
```
This generates a research prompt. If you're using Claude Code, it will automatically research the company and save a brief.

**Step 2 — Tailor your resume:**
```bash
bun run job-hunt.ts tailor abc123
```
Uses your profile + the job description + the research to create a tailored resume.

**Step 3 — Write a cover letter:**
```bash
bun run job-hunt.ts letter abc123
```
Drafts a personalized cover letter using everything from the previous steps.

**Or do all three at once:**
```bash
bun run job-hunt.ts package abc123
```

### The full pipeline (everything at once)

If you want to search, save, and prepare applications in one go:
```bash
bun run job-hunt.ts pipeline "backend engineer" --top 3 --remote
```

This searches for jobs, saves the top 3, and generates all application materials for each one.

## Searching company career pages

Many companies post jobs on Greenhouse or Lever before they appear on LinkedIn. You can search these directly by adding company "slugs" to your profile.

**How to find a company's slug:**
1. Go to the company's careers/jobs page
2. Look at the URL:
   - If it's `boards.greenhouse.io/stripe`, the slug is `stripe`
   - If it's `jobs.lever.co/netflix`, the slug is `netflix`

**Add them to your profile** (`data/profile.json`):
```json
{
  "preferences": {
    "greenhouseBoards": ["stripe", "anthropic", "figma"],
    "leverSites": ["netflix"]
  }
}
```

Now every search will also check those company boards.

## Proxy setup (optional)

If you're doing lots of searches, LinkedIn may temporarily rate-limit you. A proxy helps avoid this. This is totally optional — most people won't need it.

**Option 1 — Pass it directly:**
```bash
bun run job-hunt.ts search "engineer" --proxy "user:pass@proxy.example.com:8080"
```

**Option 2 — Set an environment variable** (lasts until you close your terminal):
```bash
export JOB_HUNTER_PROXY="http://proxy.example.com:8080"
```

**Option 3 — Save it in your profile** (permanent):
```json
{
  "preferences": {
    "proxies": ["user:pass@proxy.example.com:8080"]
  }
}
```

If multiple are configured, priority is: command flag > environment variable > profile.

Proxies are only used for LinkedIn and Indeed. Greenhouse and Lever don't need them.

## Using with Claude Code

If you installed Job Hunter into `~/.claude/skills/job-hunter/`, Claude Code will find it automatically. You don't need to type any commands — just talk naturally:

- "Find me backend engineer jobs in San Francisco"
- "Search for remote ML roles and save the top 5"
- "Help me apply to that Stripe posting"
- "Research the company for job abc123"
- "Tailor my resume for the Anthropic role"

Claude will run the searches, save results, research companies, write tailored resumes, and draft cover letters — all based on your profile.

## Troubleshooting

**"command not found: bun"**
Bun isn't installed or your terminal needs to be restarted. Run the install command from Step 1 again, then close and reopen your terminal.

**"No jobs found"**
Try a broader search term, remove location filters, or increase `--results`. Some job boards may be temporarily unavailable.

**"greenhouse: failed to fetch [company]"**
The company slug might be wrong. Double-check it by visiting `https://boards.greenhouse.io/[slug]/jobs` in your browser.

**"jobspy error"**
LinkedIn or Indeed may be rate-limiting you. Wait a few minutes, or set up a proxy (see above).

**Profile not working with tailor/letter commands**
Make sure `data/profile.json` exists and is valid JSON. A missing comma or extra bracket will break it. You can validate your JSON at [jsonlint.com](https://jsonlint.com/).

## Quick reference

| Command | What it does |
|---------|-------------|
| `search "query"` | Find jobs |
| `search "query" --save` | Find and save jobs |
| `jobs` | List saved jobs |
| `jobs show <id>` | Show job details |
| `jobs status <id> <status>` | Update job status |
| `jobs remove <id>` | Delete a saved job |
| `research <id>` | Research the company |
| `tailor <id>` | Tailor your resume |
| `letter <id>` | Draft a cover letter |
| `package <id>` | All three steps at once |
| `pipeline "query" --top N` | Search + save + prepare top N |
| `profile` | Show your profile |
| `profile init` | Create your profile |
| `cache clear` | Clear search cache |

All commands start with `bun run job-hunt.ts`. Example: `bun run job-hunt.ts search "engineer"`
