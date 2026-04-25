#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = "https://aeo-copilot.com";

function getApiKey(): string {
  const key = process.env.AEO_COPILOT_API_KEY;
  if (!key) {
    throw new Error(
      "AEO_COPILOT_API_KEY environment variable is not set. " +
        "Create one at https://aeo-copilot.com/settings (Settings → API → Create API key)."
    );
  }
  return key;
}

async function apiFetch(path: string): Promise<unknown> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AEO Copilot API error ${res.status}: ${body}`);
  }

  return res.json();
}

const server = new McpServer({
  name: "aeo-copilot",
  version: "1.0.0",
});

// ── Tool: list_brands ─────────────────────────────────────────────────────────

server.tool(
  "list_brands",
  "List all brands you have access to in AEO Copilot.",
  {},
  async () => {
    const data = await apiFetch("/api/v1/brands");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: list_topics ─────────────────────────────────────────────────────────

server.tool(
  "list_topics",
  "List all topics configured for a brand. Topics group related prompts together (e.g. 'Product Comparisons', 'Feature Questions').",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/topics`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_results ─────────────────────────────────────────────────────────

server.tool(
  "get_results",
  "Get prompt execution results for a brand across AI engines (ChatGPT, Claude, Perplexity). Shows whether your brand was mentioned, its position, sentiment, and which competitors appeared.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    topicId: z
      .string()
      .optional()
      .describe("Filter results to a specific topic UUID"),
    from: z
      .string()
      .optional()
      .describe("Start date filter in ISO format (e.g. 2025-01-01)"),
    to: z
      .string()
      .optional()
      .describe("End date filter in ISO format (e.g. 2025-03-31)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max results to return (default 100, max 500)"),
  },
  async ({ brandId, topicId, from, to, limit }) => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (limit !== undefined) params.set("limit", String(limit));

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch(`/api/v1/brands/${brandId}/results${query}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_insights ────────────────────────────────────────────────────────

server.tool(
  "get_insights",
  "Get analytics insights for a brand: overall visibility score, sentiment breakdown, competitive share, visibility trends over time, top-performing topics, and competitor breakdown.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/insights`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_recommendations ─────────────────────────────────────────────────

server.tool(
  "get_recommendations",
  "Get prioritised, actionable recommendations to improve your brand's AI visibility — based on prompt results and a technical audit of your website.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/recommendations`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Start server ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
