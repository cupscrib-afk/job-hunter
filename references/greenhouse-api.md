# Greenhouse Job Board API Reference

Public API for accessing company job boards hosted on Greenhouse. No authentication required for GET endpoints.

## Base URL

```
https://boards-api.greenhouse.io/v1/boards/{board_token}
```

The `board_token` is the URL slug of the company's job board (e.g., if the board is at `https://boards.greenhouse.io/acme`, the token is `acme`).

## Endpoints

### List Jobs

```
GET /v1/boards/{board_token}/jobs
GET /v1/boards/{board_token}/jobs?content=true
```

**Query Parameters:**
- `content=true` — Include full job description HTML

**Response:**
```json
{
  "jobs": [
    {
      "id": 123456,
      "internal_job_id": 789,
      "title": "Software Engineer",
      "updated_at": "2024-01-15T10:30:00Z",
      "requisition_id": "REQ-001",
      "location": {
        "name": "San Francisco, CA"
      },
      "absolute_url": "https://boards.greenhouse.io/acme/jobs/123456",
      "content": "<p>Full job description HTML...</p>",
      "departments": [
        { "id": 1, "name": "Engineering" }
      ],
      "offices": [
        { "id": 1, "name": "San Francisco", "location": "San Francisco, CA" }
      ]
    }
  ],
  "meta": {
    "total": 42
  }
}
```

### Get Single Job

```
GET /v1/boards/{board_token}/jobs/{job_id}
```

### List Departments

```
GET /v1/boards/{board_token}/departments
```

### List Offices

```
GET /v1/boards/{board_token}/offices
```

## Usage Notes

- All GET endpoints are public — no API key or authentication needed.
- Rate limits are generous for read operations.
- Job descriptions are HTML. Use `content=true` to include them.
- Board tokens are case-insensitive.
- Common boards: company name, lowercase, no spaces (e.g., `stripe`, `anthropic`, `figma`).
