#!/usr/bin/env bun
/**
 * job-hunt — CLI for the job hunter pipeline.
 *
 * Commands:
 *   search "<query>" [options]     Search for jobs
 *   jobs                           List tracked jobs
 *   jobs show <id>                 Show job details + materials
 *   jobs status <id> <status>      Update job status
 *   jobs remove <id>               Remove from tracker
 *   research <id>                  Print company research prompt
 *   tailor <id>                    Print resume tailoring prompt
 *   letter <id>                    Print cover letter prompt
 *   package <id>                   Print all prompts for a job
 *   pipeline "<query>" [--top N]   Full pipeline: search → save → prompts
 *   profile                        Show current profile
 *   profile init                   Create profile from example
 *   cache clear                    Clear search cache
 *   review [jobId]                 Generate or run interactive resume review
 *   review apply [jobId]           Apply all pending suggestions
 *   review list [jobId]            List suggestions
 *   serve [--port N]               Start the web UI (default 3000)
 *
 * Search options:
 *   --site linkedin|indeed         Restrict to one job board
 *   --location "City, ST"          Location filter
 *   --remote                       Remote jobs only
 *   --results N                    Number of results (default: 15)
 *   --hours-old N                  Max posting age in hours
 *   --job-type fulltime|...        Job type filter
 *   --proxy "host:port"            Proxy for LinkedIn/Indeed scraping
 *   --save                         Auto-save all results to tracker
 *   --json                         Output raw JSON
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";
import * as search from "./lib/search";
import * as tracker from "./lib/tracker";
import * as cache from "./lib/cache";
import * as fmt from "./lib/format";
import * as research from "./lib/research";
import * as tailor from "./lib/tailor";
import * as coverLetter from "./lib/cover-letter";
import * as review from "./lib/review";
import { startServer } from "./lib/server";

const SKILL_DIR = import.meta.dir;
const PROFILE_PATH = join(SKILL_DIR, "data", "profile.json");
const PROFILE_EXAMPLE = join(SKILL_DIR, "data", "profile.example.json");

// --- Arg parsing (same pattern as x-research) ---

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): boolean {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0) {
    args.splice(idx, 1);
    return true;
  }
  return false;
}

function getOpt(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) {
    const val = args[idx + 1];
    args.splice(idx, 2);
    return val;
  }
  return undefined;
}

// --- Profile ---

function loadProfile(): any | null {
  if (!existsSync(PROFILE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(PROFILE_PATH, "utf-8"));
  } catch {
    return null;
  }
}

// --- Commands ---

async function cmdSearch() {
  const save = getFlag("save");
  const asJson = getFlag("json");
  const remote = getFlag("remote");
  const site = getOpt("site");
  const location = getOpt("location");
  const results = parseInt(getOpt("results") || "15");
  const hoursOldStr = getOpt("hours-old");
  const hoursOld = hoursOldStr ? parseInt(hoursOldStr) : undefined;
  const jobType = getOpt("job-type");
  const proxyFlag = getOpt("proxy");

  // Load profile for greenhouse/lever boards + proxy
  const profile = loadProfile();
  const greenhouseBoards = profile?.preferences?.greenhouseBoards || [];
  const leverSites = profile?.preferences?.leverSites || [];
  const proxy = proxyFlag || process.env.JOB_HUNTER_PROXY || profile?.preferences?.proxies?.[0];

  const queryParts = args.slice(1).filter((a) => !a.startsWith("--"));
  const query = queryParts.join(" ");

  if (!query) {
    console.error("Usage: job-hunt.ts search <query> [options]");
    process.exit(1);
  }

  console.error(`Searching for: "${query}"...`);

  const jobs = await search.search(query, {
    site,
    location,
    remote,
    results,
    hoursOld,
    jobType,
    greenhouseBoards,
    leverSites,
    proxy,
  });

  if (jobs.length === 0) {
    console.log("No jobs found. Try broadening your search.");
    return;
  }

  if (asJson) {
    console.log(JSON.stringify(jobs, null, 2));
  } else {
    console.log(fmt.formatSearchResults(jobs, { query, limit: results }));
  }

  if (save) {
    let added = 0;
    for (const j of jobs) {
      const id = tracker.jobId(j.jobUrl);
      const isNew = !tracker.get(id);
      tracker.add({
        title: j.title,
        company: j.company,
        location: j.location,
        isRemote: j.isRemote,
        jobUrl: j.jobUrl,
        source: j.source,
        datePosted: j.datePosted,
        salary: j.salary,
        description: j.description,
      });
      if (isNew) added++;
    }
    console.error(`\nSaved ${added} new job(s) to tracker.`);
  }

  console.error(`\n${jobs.length} results from ${new Set(jobs.map((j) => j.source)).size} source(s)`);
}

async function cmdJobs() {
  const sub = args[1];

  if (sub === "show") {
    const id = args[2];
    if (!id) {
      console.error("Usage: job-hunt.ts jobs show <id>");
      process.exit(1);
    }
    const job = tracker.get(id);
    if (!job) {
      console.error(`Job ${id} not found.`);
      process.exit(1);
    }
    console.log(fmt.formatTrackedJob(job));
    console.log(`\nDescription:\n${fmt.formatDescriptionForPrompt(job.description, 1500)}`);

    // Show available materials
    if (research.hasOutput(id)) console.log(`\nResearch: ${tracker.outputDir(id)}/research.md`);
    if (tailor.hasOutput(id)) console.log(`Resume: ${tracker.outputDir(id)}/resume.md`);
    if (coverLetter.hasOutput(id)) console.log(`Letter: ${tracker.outputDir(id)}/cover-letter.md`);
    return;
  }

  if (sub === "status") {
    const id = args[2];
    const status = args[3] as tracker.JobStatus;
    if (!id || !status) {
      console.error("Usage: job-hunt.ts jobs status <id> <status>");
      console.error("Statuses: new, researched, tailored, applied, interviewing, offer, rejected");
      process.exit(1);
    }
    const valid: tracker.JobStatus[] = ["new", "researched", "tailored", "applied", "interviewing", "offer", "rejected"];
    if (!valid.includes(status)) {
      console.error(`Invalid status "${status}". Valid: ${valid.join(", ")}`);
      process.exit(1);
    }
    const job = tracker.updateStatus(id, status);
    if (!job) {
      console.error(`Job ${id} not found.`);
      process.exit(1);
    }
    console.log(`Updated ${id} → ${status}`);
    return;
  }

  if (sub === "remove" || sub === "rm") {
    const id = args[2];
    if (!id) {
      console.error("Usage: job-hunt.ts jobs remove <id>");
      process.exit(1);
    }
    if (tracker.remove(id)) {
      console.log(`Removed job ${id}.`);
    } else {
      console.error(`Job ${id} not found.`);
    }
    return;
  }

  // Default: list all jobs
  const jobs = tracker.list();
  console.log(fmt.formatJobList(jobs));
  if (jobs.length > 0) {
    console.log("\n" + fmt.formatStats(tracker.stats()));
  }
}

function cmdResearch() {
  const id = args[1];
  if (!id) {
    console.error("Usage: job-hunt.ts research <id>");
    process.exit(1);
  }
  try {
    const prompt = research.buildPrompt(id);
    console.log(prompt);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}

function cmdTailor() {
  const id = args[1];
  if (!id) {
    console.error("Usage: job-hunt.ts tailor <id>");
    process.exit(1);
  }
  try {
    const prompt = tailor.buildPrompt(id);
    console.log(prompt);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}

function cmdLetter() {
  const id = args[1];
  if (!id) {
    console.error("Usage: job-hunt.ts letter <id>");
    process.exit(1);
  }
  try {
    const prompt = coverLetter.buildPrompt(id);
    console.log(prompt);
  } catch (e: any) {
    console.error(e.message);
    process.exit(1);
  }
}

function cmdPackage() {
  const id = args[1];
  if (!id) {
    console.error("Usage: job-hunt.ts package <id>");
    process.exit(1);
  }

  const job = tracker.get(id);
  if (!job) {
    console.error(`Job ${id} not found.`);
    process.exit(1);
  }

  console.log(`# Application Package: ${job.title} @ ${job.company}\n`);
  console.log(`Output directory: ${tracker.outputDir(id)}\n`);

  // Research
  if (!research.hasOutput(id)) {
    console.log("## Step 1: Company Research\n");
    console.log(research.buildPrompt(id));
    console.log("\n---\n");
  } else {
    console.log("## Step 1: Company Research — DONE\n");
  }

  // Tailor
  if (!tailor.hasOutput(id)) {
    console.log("## Step 2: Resume Tailoring\n");
    try {
      console.log(tailor.buildPrompt(id));
    } catch (e: any) {
      console.log(`(Skipped: ${e.message})`);
    }
    console.log("\n---\n");
  } else {
    console.log("## Step 2: Resume Tailoring — DONE\n");
  }

  // Cover letter
  if (!coverLetter.hasOutput(id)) {
    console.log("## Step 3: Cover Letter\n");
    try {
      console.log(coverLetter.buildPrompt(id));
    } catch (e: any) {
      console.log(`(Skipped: ${e.message})`);
    }
  } else {
    console.log("## Step 3: Cover Letter — DONE\n");
  }
}

async function cmdPipeline() {
  const top = parseInt(getOpt("top") || "3");
  const remote = getFlag("remote");
  const site = getOpt("site");
  const location = getOpt("location");
  const results = parseInt(getOpt("results") || "10");
  const jobType = getOpt("job-type");
  const proxyFlag = getOpt("proxy");

  const profile = loadProfile();
  const greenhouseBoards = profile?.preferences?.greenhouseBoards || [];
  const leverSites = profile?.preferences?.leverSites || [];
  const proxy = proxyFlag || process.env.JOB_HUNTER_PROXY || profile?.preferences?.proxies?.[0];

  const queryParts = args.slice(1).filter((a) => !a.startsWith("--"));
  const query = queryParts.join(" ");

  if (!query) {
    console.error("Usage: job-hunt.ts pipeline <query> [--top N] [options]");
    process.exit(1);
  }

  console.error(`Pipeline: searching for "${query}"...`);

  const jobs = await search.search(query, {
    site,
    location,
    remote,
    results,
    jobType,
    greenhouseBoards,
    leverSites,
    proxy,
  });

  if (jobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  // Save top N to tracker
  const topJobs = jobs.slice(0, top);
  const tracked: tracker.TrackedJob[] = [];

  for (const j of topJobs) {
    const t = tracker.add({
      title: j.title,
      company: j.company,
      location: j.location,
      isRemote: j.isRemote,
      jobUrl: j.jobUrl,
      source: j.source,
      datePosted: j.datePosted,
      salary: j.salary,
      description: j.description,
    });
    tracked.push(t);
  }

  console.log(`Saved top ${tracked.length} jobs. Running pipeline for each:\n`);

  for (const job of tracked) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`# ${job.title} @ ${job.company} [${job.id}]`);
    console.log(`${"=".repeat(60)}\n`);

    // Research prompt
    if (!research.hasOutput(job.id)) {
      console.log("## Step 1: Company Research\n");
      console.log(research.buildPrompt(job.id));
      console.log("\n---\n");
    } else {
      console.log("## Step 1: Company Research — DONE\n");
    }

    // Tailor prompt
    if (!tailor.hasOutput(job.id)) {
      console.log("## Step 2: Resume Tailoring\n");
      try {
        console.log(tailor.buildPrompt(job.id));
      } catch (e: any) {
        console.log(`(Skipped: ${e.message})`);
      }
      console.log("\n---\n");
    } else {
      console.log("## Step 2: Resume Tailoring — DONE\n");
    }

    // Letter prompt
    if (!coverLetter.hasOutput(job.id)) {
      console.log("## Step 3: Cover Letter\n");
      try {
        console.log(coverLetter.buildPrompt(job.id));
      } catch (e: any) {
        console.log(`(Skipped: ${e.message})`);
      }
    } else {
      console.log("## Step 3: Cover Letter — DONE\n");
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Pipeline complete. ${tracked.length} jobs queued.`);
  console.log(`Run each step's instructions above, or use \`package <id>\` for individual jobs.`);
}

function cmdProfile() {
  const sub = args[1];

  if (sub === "init") {
    if (existsSync(PROFILE_PATH)) {
      console.log("Profile already exists at data/profile.json");
      return;
    }
    if (!existsSync(PROFILE_EXAMPLE)) {
      console.error("Example profile not found at data/profile.example.json");
      process.exit(1);
    }
    copyFileSync(PROFILE_EXAMPLE, PROFILE_PATH);
    console.log("Created data/profile.json from example. Edit it with your details.");
    return;
  }

  // Default: show profile
  const profile = loadProfile();
  if (!profile) {
    console.log("No profile found. Run `profile init` to create one.");
    return;
  }

  console.log(`Name: ${profile.name}`);
  console.log(`Email: ${profile.email || "N/A"}`);
  console.log(`Location: ${profile.location || "N/A"}`);
  if (profile.urls?.length) console.log(`URLs: ${profile.urls.join(", ")}`);
  if (profile.targetRoles?.length) console.log(`Target: ${profile.targetRoles.join(", ")}`);
  if (profile.experience?.length) console.log(`Experience: ${profile.experience.length} roles`);
  if (profile.education?.length) console.log(`Education: ${profile.education.length} entries`);
  if (profile.skills?.length) console.log(`Skills: ${profile.skills.map((s: any) => s.category).join(", ")}`);
  if (profile.preferences) {
    const p = profile.preferences;
    const prefs: string[] = [];
    if (p.salary) prefs.push(`salary: ${p.salary}`);
    if (p.jobType) prefs.push(`type: ${p.jobType}`);
    if (p.remote !== undefined) prefs.push(`remote: ${p.remote}`);
    if (p.greenhouseBoards?.length) prefs.push(`greenhouse: ${p.greenhouseBoards.join(", ")}`);
    if (p.leverSites?.length) prefs.push(`lever: ${p.leverSites.join(", ")}`);
    if (prefs.length) console.log(`Preferences: ${prefs.join(" | ")}`);
  }
}

function cmdCache() {
  const sub = args[1];
  if (sub === "clear") {
    const removed = cache.clear();
    console.log(`Cleared ${removed} cached entries.`);
  } else {
    const removed = cache.prune();
    console.log(`Pruned ${removed} expired entries.`);
  }
}

async function cmdReview() {
  const sub = args[1];
  const knownSubs = ["apply", "list"];

  // review apply [jobId] [--all | default all]
  if (sub === "apply") {
    const jobId = args[2] || undefined;
    const result = review.applyByIds("all", jobId);
    if (result.applied.length === 0) {
      console.log("No suggestions to apply. Run `review` first to generate them.");
    } else {
      if (result.backupCreated) console.log("Backup saved to data/profile.backup.json");
      console.log(`Applied ${result.applied.length} suggestion(s): ${result.applied.join(", ")}`);
      if (result.skipped.length > 0) console.log(`Skipped: ${result.skipped.join(", ")}`);
    }
    return;
  }

  // review list [jobId]
  if (sub === "list") {
    const jobId = args[2] || undefined;
    console.log(review.formatSuggestionsList(jobId));
    return;
  }

  // review [jobId] — interactive if suggestions exist, otherwise print analysis prompt
  const jobId = sub && !knownSubs.includes(sub) ? sub : undefined;

  if (review.hasSuggestions(jobId)) {
    await review.runInteractiveReview(jobId);
  } else {
    try {
      const prompt = review.buildAnalysisPrompt(jobId);
      console.log(prompt);
    } catch (e: any) {
      console.error(e.message);
      process.exit(1);
    }
  }
}

function cmdServe() {
  const portOpt = getOpt("port");
  const port = parseInt(portOpt || args[1] || "3000");
  startServer(isNaN(port) ? 3000 : port);
}

function usage() {
  console.log(`job-hunt — Job application pipeline CLI

Commands:
  search "<query>" [options]     Search for jobs across multiple sources
  jobs                           List all tracked jobs by status
  jobs show <id>                 Show job details + generated materials
  jobs status <id> <status>      Update status (new|researched|tailored|applied|interviewing|offer|rejected)
  jobs remove <id>               Remove from tracker
  research <id>                  Print company research prompt for Claude
  tailor <id>                    Print resume tailoring prompt
  letter <id>                    Print cover letter prompt
  package <id>                   Print all prompts (research + tailor + letter)
  pipeline "<query>" [--top N]   Full pipeline: search → save → prompts
  profile                        Show current profile
  profile init                   Create profile.json from example
  cache clear                    Clear search cache
 review [jobId]                  Generate or run interactive resume review
 review apply [jobId]            Apply all pending suggestions to profile.json
 review list [jobId]             List suggestions without applying
 serve [--port N]                Start the web UI (default port 3000)

Search options:
  --site linkedin|indeed         Restrict to one job board
  --location "City, ST"          Location filter
  --remote                       Remote jobs only
  --results N                    Number of results (default: 15)
  --hours-old N                  Max posting age in hours
  --job-type fulltime|parttime|contract|internship
  --proxy "host:port"            Proxy for LinkedIn/Indeed (user:pass@host:port or http://host:port)
  --save                         Auto-save all results to tracker
  --json                         Raw JSON output`);
}

// --- Main ---

async function main() {
  switch (command) {
    case "search":
    case "s":
      await cmdSearch();
      break;
    case "jobs":
    case "j":
      await cmdJobs();
      break;
    case "research":
    case "r":
      cmdResearch();
      break;
    case "tailor":
    case "t":
      cmdTailor();
      break;
    case "letter":
    case "l":
      cmdLetter();
      break;
    case "package":
    case "pkg":
      cmdPackage();
      break;
    case "pipeline":
    case "pipe":
      await cmdPipeline();
      break;
    case "profile":
      cmdProfile();
      break;
    case "cache":
      cmdCache();
      break;
    case "review":
    case "rv":
      await cmdReview();
      break;
    case "serve":
      cmdServe();
      break;
    default:
      usage();
  }
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
