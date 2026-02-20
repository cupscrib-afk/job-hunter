/**
 * Multi-source job search: ts-jobspy + Greenhouse + Lever public APIs.
 * Normalizes results into a common format and deduplicates.
 */

import { scrapeJobs } from "ts-jobspy";
import * as cache from "./cache";
import { formatSalary } from "./format";
import type { JobResult } from "./format";

export interface SearchOptions {
  site?: string;
  location?: string;
  remote?: boolean;
  results?: number;
  jobType?: string;
  hoursOld?: number;
  greenhouseBoards?: string[];
  leverSites?: string[];
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Search via ts-jobspy (LinkedIn + Indeed).
 */
async function searchJobSpy(query: string, opts: SearchOptions): Promise<JobResult[]> {
  const siteMap: Record<string, "linkedin" | "indeed"> = {
    linkedin: "linkedin",
    indeed: "indeed",
  };

  let siteName: ("linkedin" | "indeed")[] | ("linkedin" | "indeed") | undefined;
  if (opts.site && siteMap[opts.site]) {
    siteName = siteMap[opts.site];
  } else {
    siteName = ["linkedin", "indeed"];
  }

  const results = await scrapeJobs({
    siteName,
    searchTerm: query,
    location: opts.location,
    isRemote: opts.remote,
    resultsWanted: opts.results || 15,
    jobType: opts.jobType,
    hoursOld: opts.hoursOld,
    descriptionFormat: "markdown",
    linkedinFetchDescription: true,
  });

  return results.map((r) => ({
    title: r.title || "Untitled",
    company: r.company || "Unknown",
    location: r.location || "Unknown",
    isRemote: r.isRemote || false,
    jobUrl: r.jobUrl,
    source: r.site || "jobspy",
    datePosted: r.datePosted || null,
    salary: formatSalary(r.minAmount, r.maxAmount, r.interval, r.currency),
    description: r.description || "",
  }));
}

/**
 * Search Greenhouse public job board API.
 */
async function searchGreenhouse(
  query: string,
  boards: string[]
): Promise<JobResult[]> {
  const results: JobResult[] = [];

  for (const board of boards) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
      );
      if (!res.ok) continue;
      const data = await res.json();

      const queryLower = query.toLowerCase();
      const jobs = (data.jobs || []).filter((j: any) => {
        const text = `${j.title} ${j.location?.name || ""}`.toLowerCase();
        return queryLower.split(/\s+/).some((w: string) => text.includes(w));
      });

      for (const j of jobs) {
        results.push({
          title: j.title,
          company: board,
          location: j.location?.name || "Unknown",
          isRemote: /remote/i.test(j.location?.name || ""),
          jobUrl: j.absolute_url,
          source: "greenhouse",
          datePosted: j.updated_at || null,
          salary: null,
          description: j.content || "",
        });
      }
    } catch {
      console.error(`(greenhouse: failed to fetch ${board})`);
    }
  }

  return results;
}

/**
 * Search Lever public postings API.
 */
async function searchLever(
  query: string,
  sites: string[]
): Promise<JobResult[]> {
  const results: JobResult[] = [];

  for (const site of sites) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${site}?mode=json`
      );
      if (!res.ok) continue;
      const postings = await res.json();

      const queryLower = query.toLowerCase();
      const filtered = postings.filter((p: any) => {
        const text = `${p.text} ${p.categories?.location || ""} ${p.categories?.team || ""}`.toLowerCase();
        return queryLower.split(/\s+/).some((w: string) => text.includes(w));
      });

      for (const p of filtered) {
        const location = p.categories?.location || "Unknown";
        results.push({
          title: p.text,
          company: site,
          location,
          isRemote: /remote/i.test(location),
          jobUrl: p.hostedUrl || p.applyUrl,
          source: "lever",
          datePosted: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          salary: null,
          description: p.descriptionPlain || p.description || "",
        });
      }
    } catch {
      console.error(`(lever: failed to fetch ${site})`);
    }
  }

  return results;
}

/**
 * Deduplicate by job URL (normalized).
 */
function dedupe(jobs: JobResult[]): JobResult[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = j.jobUrl.replace(/\?.*$/, "").replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main search: combines all sources, caches results.
 */
export async function search(
  query: string,
  opts: SearchOptions = {}
): Promise<JobResult[]> {
  const cacheParams = JSON.stringify(opts);
  const cached = cache.get<JobResult[]>(query, cacheParams, CACHE_TTL_MS);
  if (cached) {
    console.error(`(cached — ${cached.length} results)`);
    return cached;
  }

  const promises: Promise<JobResult[]>[] = [];

  // Only skip jobspy if the site is explicitly greenhouse or lever
  if (!opts.site || ["linkedin", "indeed"].includes(opts.site)) {
    promises.push(
      searchJobSpy(query, opts).catch((e) => {
        console.error(`(jobspy error: ${e.message})`);
        return [];
      })
    );
  }

  if (opts.greenhouseBoards && opts.greenhouseBoards.length > 0) {
    promises.push(searchGreenhouse(query, opts.greenhouseBoards));
  }

  if (opts.leverSites && opts.leverSites.length > 0) {
    promises.push(searchLever(query, opts.leverSites));
  }

  const allResults = (await Promise.all(promises)).flat();
  const deduped = dedupe(allResults);

  cache.set(query, cacheParams, deduped);
  return deduped;
}
