# Lever Postings API Reference

Public API for accessing company job postings hosted on Lever. No authentication required.

## Base URL

```
https://api.lever.co/v0/postings/{site_name}
```

The `site_name` is the company's Lever subdomain (e.g., `netflix`, `anthropic`).

## Endpoints

### List All Postings

```
GET /v0/postings/{site_name}?mode=json
```

The `mode=json` parameter returns JSON instead of HTML.

**Response:** Array of posting objects:
```json
[
  {
    "id": "abc123-def456",
    "text": "Senior Software Engineer",
    "hostedUrl": "https://jobs.lever.co/company/abc123-def456",
    "applyUrl": "https://jobs.lever.co/company/abc123-def456/apply",
    "createdAt": 1705315200000,
    "categories": {
      "commitment": "Full-time",
      "department": "Engineering",
      "level": "Senior",
      "location": "San Francisco, CA",
      "team": "Backend"
    },
    "description": "<p>HTML description...</p>",
    "descriptionPlain": "Plain text description...",
    "lists": [
      {
        "text": "Requirements",
        "content": "<li>5+ years experience...</li>"
      }
    ],
    "additional": "Additional info HTML",
    "additionalPlain": "Additional info plain text"
  }
]
```

### Get Single Posting

```
GET /v0/postings/{site_name}/{posting_id}
```

## Usage Notes

- All endpoints are public — no API key needed.
- Each company has one site name (usually company name, lowercase, no spaces).
- `createdAt` is a Unix timestamp in milliseconds.
- No server-side filtering — all postings are returned, filter client-side.
- `description` is HTML, `descriptionPlain` is plain text.
- `categories.location` is the primary location field.
