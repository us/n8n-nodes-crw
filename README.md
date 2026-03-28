# n8n-nodes-crw

[n8n](https://n8n.io/) community node for [CRW](https://github.com/us/crw) — the open-source web scraper built for AI agents.

Scrape, crawl, and extract web data directly in your n8n workflows. Works with both self-hosted CRW and [fastcrw.com](https://fastcrw.com) cloud.

## Installation

### Via n8n UI

1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-crw`
4. Click **Install**

### Via Environment Variable

```bash
# Docker
docker run -e EXTRA_COMMUNITY_PACKAGES=n8n-nodes-crw n8nio/n8n

# docker-compose
environment:
  - EXTRA_COMMUNITY_PACKAGES=n8n-nodes-crw
```

## Setup — Pick One

### Option A: Cloud ([fastcrw.com](https://fastcrw.com)) — Quickest Start

[Sign up at fastcrw.com](https://fastcrw.com) and get **500 free credits**. Then add credentials in n8n:

| Field | Value |
|---|---|
| **Base URL** | `https://fastcrw.com/api` (default) |
| **API Key** | `crw_live_...` from fastcrw.com |

### Option B: Self-hosted with binary (free, no limits)

```bash
curl -fsSL https://raw.githubusercontent.com/us/crw/main/install.sh | bash
crw  # starts on http://localhost:3000
```

| Field | Value |
|---|---|
| **Base URL** | `http://localhost:3000` |
| **API Key** | *(leave empty)* |

### Option C: Self-hosted with Docker

```bash
docker run -d -p 3000:3000 ghcr.io/us/crw:latest
```

Same credentials as Option B.

## Operations

### Scrape

Scrape a single URL and return its content in one or more formats.

- **URL** — The page to scrape
- **Output Formats** — markdown, html, rawHtml, plainText, links, json
- **Only Main Content** — Strip nav/footer/sidebar (default: true)
- **Additional Options** — JS rendering, CSS selectors, XPath, custom headers, proxy, stealth mode, JSON schema for LLM extraction

### Crawl

Crawl a website starting from a URL. Returns content from multiple pages.

- **URL** — Starting URL
- **Max Depth** — How many links deep to follow (default: 2)
- **Max Pages** — Maximum pages to crawl (default: 100)
- **Wait for Completion** — Poll until done, or return job ID immediately
- **Poll Interval / Max Wait Time** — Control polling behavior

Each crawled page is returned as a separate n8n item for downstream processing.

### Check Crawl Status

Check the status of a crawl job by its ID. Returns status, progress, and page data.

### Cancel Crawl

Cancel a running crawl job by its ID.

### Map

Discover all URLs on a website. Each discovered URL is returned as a separate n8n item.

- **URL** — The site to map
- **Max Depth** — How deep to discover links (default: 2)
- **Use Sitemap** — Whether to use the site's sitemap (default: true)

## AI Agent Tool

This node supports `usableAsTool: true`, so it can be used as a tool by n8n's AI Agent node. Set the environment variable:

```
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

## Example Workflows

### Scrape and save to Google Sheets

```
[CRW: Scrape] → [Google Sheets: Append Row]
```

### Crawl site for RAG pipeline

```
[CRW: Crawl] → [Embeddings: OpenAI] → [Pinecone: Upsert]
```

### Map and batch scrape

```
[CRW: Map] → [CRW: Scrape] → [OpenAI: Summarize] → [Slack: Post]
```

## Links

- [CRW GitHub](https://github.com/us/crw)
- [fastcrw.com](https://fastcrw.com)
- [CRW REST API Docs](https://fastcrw.com/docs/rest-api)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT — this node wrapper is MIT licensed. The CRW server itself is AGPL-3.0.
