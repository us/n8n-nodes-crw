# n8n Community Node for CRW — Integration Plan

## Overview

Build and publish `n8n-nodes-crw`, an n8n community node that exposes CRW's Firecrawl-compatible REST API as native n8n operations. The node supports both self-hosted CRW instances and the managed cloud at [fastcrw.com](https://fastcrw.com).

**Why this matters:** n8n has 181K+ GitHub stars and 400+ integrations. A first-class CRW node puts web scraping directly into n8n workflows — RAG pipelines, content monitoring, lead enrichment, and AI agent tool use — without users writing HTTP Request nodes manually.

**Competitive context:** Multiple Firecrawl n8n nodes already exist (`n8n-nodes-firecrawl`, `@mendable/n8n-nodes-firecrawl`, `@1kdanny/n8n-nodes-firecrawl`). CRW's node differentiates by supporting self-hosted deployments (zero cost), being significantly faster (5.5x), and using 75x less RAM.

---

## 1. Package Structure

```
n8n-nodes-crw/
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── LICENSE                         # MIT (node wrapper) — CRW server itself is AGPL-3.0
├── README.md
├── credentials/
│   └── CrwApi.credentials.ts      # API key + base URL credential
├── nodes/
│   └── Crw/
│       ├── Crw.node.ts            # Main node (INodeType)
│       ├── Crw.node.json          # Codex metadata (for n8n search/discovery)
│       ├── crw.svg                # Node icon (CRW logo, 60x60 SVG)
│       ├── descriptions/
│       │   ├── ScrapeDescription.ts
│       │   ├── CrawlDescription.ts
│       │   ├── CrawlStatusDescription.ts
│       │   ├── MapDescription.ts
│       │   └── ExtractDescription.ts
│       └── GenericFunctions.ts    # Shared HTTP helpers (crwApiRequest, etc.)
└── dist/                          # Compiled output (gitignored, npm-published)
```

### package.json (key fields)

```json
{
  "name": "n8n-nodes-crw",
  "version": "0.1.0",
  "description": "n8n community node for CRW — the open-source web scraper built for AI agents",
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "crw",
    "web-scraping",
    "markdown",
    "crawling",
    "ai-agent"
  ],
  "license": "MIT",
  "homepage": "https://github.com/us/crw",
  "repository": {
    "type": "git",
    "url": "https://github.com/us/n8n-nodes-crw.git"
  },
  "main": "dist/nodes/Crw/Crw.node.js",
  "files": ["dist"],
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "prepublishOnly": "npm run build"
  },
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/CrwApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Crw/Crw.node.js"
    ]
  },
  "devDependencies": {
    "@n8n/node-cli": "*",
    "eslint": "^9.0.0",
    "gulp": "^5.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.5.0"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "target": "es2022",
    "lib": ["es2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["credentials/**/*.ts", "nodes/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 2. Credentials

### CrwApi.credentials.ts

```typescript
import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class CrwApi implements ICredentialType {
  name = 'crwApi';
  displayName = 'CRW API';
  documentationUrl = 'https://fastcrw.com/docs/rest-api';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://fastcrw.com',
      placeholder: 'https://fastcrw.com or http://localhost:3000',
      description: 'CRW server URL. Use https://fastcrw.com for cloud or your self-hosted URL.',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Bearer token for authentication. Leave empty if your self-hosted instance has no auth.',
      required: false,
    },
  ];
}
```

**Design decisions:**
- `baseUrl` defaults to `https://fastcrw.com` (cloud) — nudges users toward the managed service.
- `apiKey` is optional — self-hosted CRW works without auth by default.
- The credential supports both deployment models with a single config.

### n8n UI mockup — Credentials dialog

```
┌─────────────────────────────────────────────┐
│  CRW API                                    │
├─────────────────────────────────────────────┤
│                                             │
│  Base URL                                   │
│  ┌─────────────────────────────────────┐    │
│  │ https://fastcrw.com                 │    │
│  └─────────────────────────────────────┘    │
│  CRW server URL. Use https://fastcrw.com    │
│  for cloud or your self-hosted URL.         │
│                                             │
│  API Key                                    │
│  ┌─────────────────────────────────────┐    │
│  │ ●●●●●●●●●●●●●●●●●●●●              │    │
│  └─────────────────────────────────────┘    │
│  Bearer token for authentication.           │
│                                             │
│        [Save]           [Cancel]            │
└─────────────────────────────────────────────┘
```

---

## 3. Node Operations

### 3.1 Resource: Page

#### Operation: Scrape

**API:** `POST /v1/scrape`

| n8n Parameter | API Field | Type | Default | Notes |
|---|---|---|---|---|
| URL | `url` | string | — | Required |
| Output Formats | `formats` | multiOptions | `["markdown"]` | Options: markdown, html, rawHtml, plainText, links, json |
| Only Main Content | `onlyMainContent` | boolean | `true` | Strip nav/footer/sidebar |
| Render JavaScript | `renderJs` | options | Auto | Auto / Force JS / HTTP Only |
| Wait For (ms) | `waitFor` | number | — | Show when renderJs != HTTP Only |
| CSS Selector | `cssSelector` | string | — | Optional, advanced |
| XPath | `xpath` | string | — | Optional, advanced |
| Include Tags | `includeTags` | string (comma-separated) | — | CSS selectors to include |
| Exclude Tags | `excludeTags` | string (comma-separated) | — | CSS selectors to exclude |
| Custom Headers | `headers` | fixedCollection | — | Key-value pairs |
| JSON Schema | `jsonSchema` | json | — | Show when formats includes "json" |
| Proxy | `proxy` | string | — | Advanced; per-request proxy override |
| Stealth Mode | `stealth` | boolean | — | Advanced; override global stealth |

**Additional Options (collapsible):**

| Parameter | API Field | Type | Notes |
|---|---|---|---|
| Chunk Strategy | `chunkStrategy.type` | options | topic / sentence / regex |
| Max Chars (sentence) | `chunkStrategy.maxChars` | number | Show when strategy=sentence |
| Pattern (regex) | `chunkStrategy.pattern` | string | Show when strategy=regex |
| Query | `query` | string | For chunk ranking |
| Filter Mode | `filterMode` | options | bm25 / cosine |
| Top K | `topK` | number | Default: 5 |

**Response mapping:** Return `data` object with all requested format fields + `metadata`.

#### Operation: Crawl

**API:** `POST /v1/crawl`

| n8n Parameter | API Field | Type | Default |
|---|---|---|---|
| URL | `url` | string | — (required) |
| Max Depth | `maxDepth` | number | `2` |
| Max Pages | `maxPages` | number | `100` |
| Output Formats | `formats` | multiOptions | `["markdown"]` |
| Only Main Content | `onlyMainContent` | boolean | `true` |
| Wait for Completion | (node logic) | boolean | `true` |
| Poll Interval (sec) | (node logic) | number | `5` |
| Max Wait Time (sec) | (node logic) | number | `300` |

**Behavior:** When "Wait for Completion" is true, the node polls `GET /v1/crawl/{id}` at the configured interval until `status === "completed"` or `status === "failed"` or max wait time is exceeded. Returns all crawled page data as separate n8n items (one item per page).

When "Wait for Completion" is false, returns `{ id, success }` immediately — user chains a separate "Check Crawl Status" node.

#### Operation: Check Crawl Status

**API:** `GET /v1/crawl/{id}`

| n8n Parameter | API Field | Type |
|---|---|---|
| Crawl Job ID | path param | string (required) |

**Response:** Returns status, total, completed count, and all page data items.

#### Operation: Cancel Crawl

**API:** `DELETE /v1/crawl/{id}`

| n8n Parameter | API Field | Type |
|---|---|---|
| Crawl Job ID | path param | string (required) |

#### Operation: Map

**API:** `POST /v1/map`

| n8n Parameter | API Field | Type | Default |
|---|---|---|---|
| URL | `url` | string | — (required) |
| Max Depth | `maxDepth` | number | `2` |
| Use Sitemap | `useSitemap` | boolean | `true` |

**Response:** Returns `data.links` array. Each link becomes a separate n8n output item for easy chaining.

### 3.2 n8n UI Mockup — Node Panel

```
┌─────────────────────────────────────────────┐
│  🕷️ CRW                                     │
├─────────────────────────────────────────────┤
│                                             │
│  Credential    [CRW API          ▾]         │
│                                             │
│  Operation     [Scrape           ▾]         │
│                ┌──────────────────┐          │
│                │ Scrape           │          │
│                │ Crawl            │          │
│                │ Check Crawl Status│         │
│                │ Cancel Crawl     │          │
│                │ Map              │          │
│                └──────────────────┘          │
│                                             │
│  URL           ┌───────────────────────┐    │
│                │ https://example.com    │    │
│                └───────────────────────┘    │
│                                             │
│  Output Formats  ☑ Markdown                 │
│                  ☐ HTML                      │
│                  ☐ Plain Text                │
│                  ☐ Links                     │
│                  ☐ JSON (LLM Extract)        │
│                                             │
│  Only Main Content  [✓]                     │
│                                             │
│  ▸ Additional Options                       │
│                                             │
└─────────────────────────────────────────────┘
```

### 3.3 Expanded "Additional Options" for Scrape

```
│  ▾ Additional Options                       │
│                                             │
│  Render JavaScript  [Auto         ▾]        │
│  Wait For (ms)      [          ]            │
│  CSS Selector       [          ]            │
│  XPath              [          ]            │
│  Include Tags       [          ]            │
│  Exclude Tags       [          ]            │
│  Custom Headers     [+ Add Header]          │
│  Proxy              [          ]            │
│  Stealth Mode       [ ]                     │
│                                             │
│  ── Chunking ──                             │
│  Chunk Strategy     [None         ▾]        │
│  Query              [          ]            │
│  Filter Mode        [BM25         ▾]        │
│  Top K              [5           ]          │
```

---

## 4. Shared Helper — GenericFunctions.ts

```typescript
import {
  IExecuteFunctions,
  IHttpRequestMethods,
  IRequestOptions,
  JsonObject,
} from 'n8n-workflow';

export async function crwApiRequest(
  this: IExecuteFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: object = {},
  query: object = {},
): Promise<JsonObject> {
  const credentials = await this.getCredentials('crwApi');
  const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}${endpoint}`,
    body,
    qs: query,
    json: true,
    headers: {},
  };

  // Add auth header if API key is configured
  const apiKey = credentials.apiKey as string;
  if (apiKey) {
    options.headers!['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await this.helpers.request(options);

  if (response.success === false) {
    throw new Error(`CRW API error: ${response.error} (${response.error_code})`);
  }

  return response;
}

export async function crwApiRequestWithPolling(
  this: IExecuteFunctions,
  jobId: string,
  pollIntervalSec: number,
  maxWaitSec: number,
): Promise<JsonObject> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSec * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const response = await crwApiRequest.call(this, 'GET', `/v1/crawl/${jobId}`);

    if (response.status === 'completed' || response.status === 'failed') {
      return response;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalSec * 1000));
  }

  throw new Error(`Crawl job ${jobId} did not complete within ${maxWaitSec} seconds`);
}
```

---

## 5. AI Agent Tool Support

The node must set `usableAsTool: true` in the description to appear as a tool for n8n's AI Agent node. This requires n8n >= 1.79.0.

```typescript
description: INodeTypeDescription = {
  displayName: 'CRW',
  name: 'crw',
  icon: 'file:crw.svg',
  group: ['transform'],
  version: 1,
  subtitle: '={{ $parameter["operation"] }}',
  description: 'Scrape, crawl, and extract web data with CRW — the open-source web scraper built for AI agents',
  defaults: {
    name: 'CRW',
  },
  inputs: ['main'],
  outputs: ['main'],
  usableAsTool: true,                    // <-- Enable AI Agent tool use
  credentials: [
    {
      name: 'crwApi',
      required: true,
    },
  ],
  properties: [
    // ... operation selector + all operation descriptions
  ],
};
```

**AI Agent use case:** An AI Agent can use CRW as a tool to autonomously scrape web pages, discover site URLs, or crawl entire sites during a conversation. This is a key differentiator since CRW is built specifically for AI agents.

---

## 6. Codex Metadata — Crw.node.json

This file powers n8n's search and discovery. It maps node operations to natural-language descriptions.

```json
{
  "node": "n8n-nodes-crw.crw",
  "nodeVersion": "1.0",
  "codexVersion": "1.0",
  "categories": ["Data & Storage"],
  "subcategories": {
    "Data & Storage": ["Web Scraping"]
  },
  "resources": {
    "primaryDocumentation": [
      {
        "url": "https://fastcrw.com/docs/rest-api"
      }
    ],
    "credentialDocumentation": [
      {
        "url": "https://fastcrw.com/docs/rest-api#authentication"
      }
    ]
  },
  "alias": ["scrape", "crawl", "web", "markdown", "extract", "spider"],
  "subcategories": {
    "Data & Storage": ["Web Scraping"]
  }
}
```

---

## 7. Tier-Based Implementation Plan

### Tier 1 — MVP (Week 1-2)

**Goal:** Publishable node with core operations.

| Task | Details | Est. Hours |
|---|---|---|
| Scaffold project | Use `n8n-nodes-starter` template, rename, configure | 2h |
| CrwApi credentials | Base URL + API key, test connection via `/health` | 2h |
| Scrape operation | All fields from `/v1/scrape`, format response as n8n items | 6h |
| Map operation | `/v1/map` with links as separate output items | 2h |
| Crawl operation (fire & forget) | `POST /v1/crawl` returns job ID | 2h |
| Check Crawl Status | `GET /v1/crawl/{id}`, return page data as items | 2h |
| GenericFunctions | `crwApiRequest` helper, error handling | 2h |
| SVG icon | CRW logo adapted to n8n's 60x60 node icon format | 1h |
| README | Installation, operations table, screenshots | 2h |
| Manual testing | Test all operations against local CRW + fastcrw.com | 4h |
| **Total** | | **25h** |

**Deliverable:** `n8n-nodes-crw@0.1.0` on npm.

### Tier 2 — Polish (Week 3)

| Task | Details | Est. Hours |
|---|---|---|
| Crawl polling | "Wait for Completion" mode with configurable poll interval | 4h |
| Cancel Crawl | `DELETE /v1/crawl/{id}` operation | 1h |
| Advanced scrape options | CSS selector, XPath, include/exclude tags, headers, proxy, stealth | 4h |
| Chunking support | chunkStrategy, query, filterMode, topK parameters | 3h |
| `usableAsTool: true` | Enable AI Agent tool integration, test with Tools Agent | 2h |
| Codex metadata | `Crw.node.json` for n8n search/discovery | 1h |
| Error handling | Map CRW error codes to n8n's `NodeApiError` with helpful messages | 2h |
| Credential test | `testConnection` method that hits `/health` endpoint | 1h |
| **Total** | | **18h** |

**Deliverable:** `n8n-nodes-crw@0.2.0` on npm.

### Tier 3 — Growth (Week 4+)

| Task | Details | Est. Hours |
|---|---|---|
| LLM structured extraction | JSON Schema input for `/v1/scrape` with `formats: ["json"]` | 4h |
| Batch scrape | Accept multiple URLs, run scrapes in parallel, return all results | 3h |
| Workflow templates | Pre-built n8n workflows (RAG pipeline, content monitor, lead enrichment) | 6h |
| n8n community submission | Submit to n8n verified community nodes list | 2h |
| Blog post | "Web Scraping in n8n with CRW" — publish on fastcrw.com blog + n8n community | 4h |
| n8n forum announcement | Post on community.n8n.io with workflow examples | 1h |
| Screenshot gallery | Generate node screenshots for README and n8n listing | 2h |
| **Total** | | **22h** |

**Deliverable:** `n8n-nodes-crw@0.3.0`, verified community node status, blog post.

---

## 8. npm Publishing Strategy

### Package Name

- **Primary:** `n8n-nodes-crw` (unscoped, shorter, easier to install)
- **Alternative:** `@crw/n8n-nodes-crw` (scoped, if unscoped is taken)

### Versioning

- Follow SemVer: `0.x.y` until stable, then `1.0.0`
- Use `release-please` for automated version bumps via conventional commits

### Publishing Workflow

```yaml
# .github/workflows/npm-publish.yml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write    # Required for npm provenance (n8n requires this from May 2026)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Important:** From May 1, 2026, n8n requires npm provenance for verified community nodes. The `--provenance` flag and `id-token: write` permission handle this.

### Installation in n8n

Users install via:
1. **n8n UI:** Settings → Community Nodes → Install → `n8n-nodes-crw`
2. **Environment variable:** `EXTRA_COMMUNITY_PACKAGES=n8n-nodes-crw`
3. **Docker:** `docker run -e EXTRA_COMMUNITY_PACKAGES=n8n-nodes-crw n8nio/n8n`

For AI Agent tool use, the user must also set:
```
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

---

## 9. Repository Strategy

**Option A (recommended): Dedicated repository**
- `github.com/us/n8n-nodes-crw`
- Clean separation, easier for n8n community contributors
- Standard for community nodes (Firecrawl, Neon, etc. all use separate repos)

**Option B: Monorepo under crw**
- `crw/packages/n8n-nodes-crw`
- Tighter coupling, harder for n8n-only contributors to navigate

**Recommendation:** Option A. Create `github.com/us/n8n-nodes-crw` with its own CI, npm publishing, and README. Link back to main CRW repo and fastcrw.com.

---

## 10. Example n8n Workflows

### 10.1 Simple Scrape → Save to Google Sheets

```
[CRW: Scrape] → [Google Sheets: Append Row]
```
- Scrape a URL, extract title + markdown
- Append to a Google Sheet for content tracking

### 10.2 Crawl Site → Vector Store (RAG Pipeline)

```
[CRW: Crawl] → [Embeddings: OpenAI] → [Pinecone: Upsert]
```
- Crawl an entire documentation site
- Generate embeddings for each page
- Store in Pinecone for RAG retrieval

### 10.3 Map → Batch Scrape → AI Summary

```
[CRW: Map] → [CRW: Scrape] → [OpenAI: Summarize] → [Slack: Post]
```
- Discover all pages on a site
- Scrape each page
- Summarize with GPT-4
- Post summaries to Slack

### 10.4 AI Agent with CRW Tool

```
[Chat Trigger] → [AI Agent (Tools Agent)]
                        ↓ tools
                  [CRW (usableAsTool)]
                  [Calculator]
```
- User asks the AI Agent a question
- Agent autonomously decides to scrape web pages using CRW
- Returns answer with sources

---

## 11. Testing Strategy

### Unit Tests

- Mock `this.helpers.request` to test request construction
- Verify all operations build correct API payloads
- Test error handling for CRW error codes

### Integration Tests

- Run against a local `crw-server` instance
- Test each operation end-to-end
- Verify response mapping to n8n item format

### Manual Testing Checklist

- [ ] Install node in local n8n via `npm link`
- [ ] Configure credentials for fastcrw.com cloud
- [ ] Configure credentials for local self-hosted CRW
- [ ] Test Scrape with all format combinations
- [ ] Test Crawl with polling
- [ ] Test Crawl without polling (fire & forget)
- [ ] Test Check Crawl Status
- [ ] Test Cancel Crawl
- [ ] Test Map
- [ ] Test as AI Agent tool
- [ ] Test error cases (invalid URL, auth failure, rate limit)
- [ ] Verify node appears in n8n search with correct icon

---

## 12. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Programmatic vs Declarative | **Programmatic** | Crawl polling requires custom logic in `execute()` |
| Single node vs multiple | **Single node** with operation selector | Standard n8n pattern (like HTTP Request, Airtable, etc.) |
| Response format | **One n8n item per page** | Crawl returns many pages; Map returns many links — each becomes an item for downstream processing |
| Auth model | **Optional API key** | Self-hosted CRW works without auth; cloud requires it |
| Base URL default | **`https://fastcrw.com`** | Nudges toward managed cloud while supporting self-hosted |
| AI tool support | **`usableAsTool: true`** | CRW is "built for AI agents" — this is a natural fit |
| Node naming | **`CRW`** not `fastCRW` | The node wraps the CRW API, which works with both self-hosted and cloud |

---

## 13. Marketing & Distribution

### Launch checklist

- [ ] Publish `n8n-nodes-crw` to npm
- [ ] Post on [n8n Community Forum](https://community.n8n.io) (Built with n8n category)
- [ ] Submit for [n8n Verified Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)
- [ ] Add to CRW README under "Integrations" section
- [ ] Add to fastcrw.com docs under "Integrations"
- [ ] Create blog post: "How to Scrape the Web in n8n with CRW"
- [ ] Share n8n workflow templates in the [n8n Workflow Templates](https://n8n.io/workflows/) gallery
- [ ] Add badge to CRW README: `Works with: n8n`

### SEO keywords for npm / n8n listing

- web scraping n8n
- crawl website n8n
- markdown scraper n8n
- firecrawl alternative n8n
- AI agent web scraping
- RAG pipeline web scraper

---

## 14. Timeline Summary

| Week | Milestone | Version |
|---|---|---|
| Week 1-2 | MVP: Scrape, Map, Crawl, Check Status | `0.1.0` |
| Week 3 | Polish: Polling, AI tool, advanced options, error handling | `0.2.0` |
| Week 4 | Growth: LLM extraction, templates, community submission | `0.3.0` |
| Week 5+ | Maintenance, user feedback, n8n version compatibility | `0.x.y` |

**Total estimated effort:** ~65 hours across 4 weeks.
