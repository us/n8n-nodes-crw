import { describe, test, expect } from "bun:test";

const API_KEY = process.env.CRW_API_KEY;
const API_URL = "https://fastcrw.com/api";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

describe.skipIf(!API_KEY)("CRW API integration tests", () => {
  test("scrape endpoint works", async () => {
    const resp = await fetch(`${API_URL}/v1/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://example.com" }),
    });

    expect(resp.ok).toBe(true);
    const json = await resp.json();
    expect(json.success).toBe(true);
    expect(json.data.markdown).toBeDefined();
    expect(json.data.markdown.length).toBeGreaterThan(0);
  });

  test("search endpoint works", async () => {
    const resp = await fetch(`${API_URL}/v1/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: "web scraping tools", limit: 3 }),
    });

    expect(resp.ok).toBe(true);
    const json = await resp.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty("url");
    expect(json.data[0]).toHaveProperty("title");
  });

  test("crawl start + poll works", async () => {
    // Start a crawl with minimal limits
    const startResp = await fetch(`${API_URL}/v1/crawl`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: "https://example.com",
        maxDepth: 1,
        maxPages: 2,
      }),
    });

    expect(startResp.ok).toBe(true);
    const startJson = await startResp.json();
    expect(startJson.success).toBe(true);
    expect(startJson.id).toBeDefined();

    // Poll until done (max 60s)
    const jobId = startJson.id;
    const deadline = Date.now() + 60_000;
    let status = "";

    while (Date.now() < deadline) {
      const pollResp = await fetch(`${API_URL}/v1/crawl/${jobId}`, {
        headers,
      });
      const pollJson = await pollResp.json();
      status = pollJson.status;

      if (status === "completed" || status === "failed") {
        expect(status).toBe("completed");
        expect(Array.isArray(pollJson.data)).toBe(true);
        return;
      }

      await new Promise((r) => setTimeout(r, 3000));
    }

    throw new Error(`Crawl did not complete within 60s, last status: ${status}`);
  }, 90_000); // 90s timeout for this test
});
