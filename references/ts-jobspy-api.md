# ts-jobspy API Reference

TypeScript job scraper for LinkedIn and Indeed. Rewritten from python-jobspy.

## Installation

```bash
bun add ts-jobspy
```

Requires Node.js >= 20.0.0.

## Main Function

```typescript
import { scrapeJobs } from "ts-jobspy";

const jobs = await scrapeJobs({
  siteName: ["linkedin", "indeed"],
  searchTerm: "software engineer",
  location: "San Francisco, CA",
  resultsWanted: 20,
});
```

## ScrapeJobsOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `siteName` | `string \| string[]` | `["linkedin", "indeed"]` | Sites to scrape |
| `searchTerm` | `string` | — | Job title or keywords |
| `location` | `string` | — | Geographic location |
| `distance` | `number` | `50` | Miles from location |
| `isRemote` | `boolean` | — | Remote jobs only |
| `jobType` | `string` | — | fulltime, parttime, contract, internship |
| `resultsWanted` | `number` | — | Results per site |
| `hoursOld` | `number` | — | Max posting age in hours |
| `easyApply` | `boolean` | — | Easy apply filter |
| `descriptionFormat` | `string` | `"markdown"` | markdown, html, or plain |
| `linkedinFetchDescription` | `boolean` | — | Fetch full descriptions (slower) |
| `linkedinCompanyIds` | `number[]` | — | Filter by LinkedIn company IDs |
| `countryIndeed` | `string` | — | Country for Indeed (e.g., "usa") |
| `enforceAnnualSalary` | `boolean` | — | Normalize salary to annual |
| `offset` | `number` | — | Pagination offset |
| `proxies` | `string \| string[]` | — | Proxy servers |
| `verbose` | `number` | — | Logging verbosity |

## JobData Return Type

```typescript
interface JobData {
  id: string | null;
  site: string;                    // "linkedin" or "indeed"
  jobUrl: string;
  jobUrlDirect: string | null;
  title: string;
  company: string | null;
  location: string | null;
  datePosted: string | null;
  jobType: string | null;
  isRemote: boolean | null;
  description: string | null;
  // Salary
  salarySource: string | null;
  interval: string | null;         // yearly, monthly, hourly
  minAmount: number | null;
  maxAmount: number | null;
  currency: string | null;
  // Company info
  companyUrl: string | null;
  companyIndustry: string | null;
  companyNumEmployees: string | null;
  companyRevenue: string | null;
  companyDescription: string | null;
  companyLogo: string | null;
  // Role details
  jobLevel: string | null;
  jobFunction: string | null;
  skills: string | null;
  experienceRange: string | null;
}
```

## Limitations

- **Indeed**: Only one of `hoursOld`, `jobType`/`isRemote`, or `easyApply` per search.
- **LinkedIn**: Rate limits around 10th page. Proxies recommended for large scrapes.
- **Working sites**: Only LinkedIn and Indeed as of v2.0.3.
