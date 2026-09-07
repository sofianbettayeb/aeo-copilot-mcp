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

async function apiFetch(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${path}`;
  const method = options.method ?? "GET";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AEO Copilot API error ${res.status}: ${body}`);
  }

  return res.json();
}

const server = new McpServer({
  name: "aeo-copilot",
  version: "1.3.0",
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
  "Get prompt execution results for a brand across AI engines (ChatGPT, Claude, Perplexity, Google AI Overviews). Each result includes a per-engine block with the full answer text (`response`), plus whether your brand was mentioned, its position, sentiment, sources, and which competitors appeared. Set `engine` to return only one engine's answers — e.g. 'claude' to read exactly what Claude said.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    topicId: z
      .string()
      .optional()
      .describe("Filter results to a specific topic UUID"),
    engine: z
      .enum(["chatgpt", "claude", "perplexity", "googleAio"])
      .optional()
      .describe(
        "Return only this engine's answer/response for each prompt (e.g. 'claude'). Omit to get every engine's block."
      ),
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
  async ({ brandId, topicId, engine, from, to, limit }) => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (limit !== undefined) params.set("limit", String(limit));

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = (await apiFetch(
      `/api/v1/brands/${brandId}/results${query}`
    )) as { data?: unknown[]; total?: number };

    // The API has no server-side engine filter — it always returns all four
    // engine blocks. When the caller asks for one engine, flatten each result
    // to that engine's answer so the payload is focused (and much smaller).
    let payload: unknown = data;
    if (engine && Array.isArray(data?.data)) {
      const filtered = (data.data as Record<string, any>[])
        .map((r) => {
          const block = r[engine];
          if (!block) return null; // engine not run for this prompt
          return {
            promptId: r.promptId,
            promptText: r.promptText,
            topicId: r.topicId,
            topicName: r.topicName,
            runDate: r.runDate,
            engine,
            mentioned: block.mentioned,
            position: block.position,
            sentiment: block.sentiment,
            sources: block.sources,
            competitors: block.competitors,
            response: block.response ?? null,
          };
        })
        .filter(Boolean);
      payload = { data: filtered, total: filtered.length, engine };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
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

// ── Tool: create_brand ────────────────────────────────────────────────────────

server.tool(
  "create_brand",
  "Create a new brand on your AEO Copilot account. Subject to your plan's brand limit — the API will return an error if you've reached it.",
  {
    name: z.string().min(1).describe("Brand name"),
    website: z
      .string()
      .url()
      .optional()
      .describe("Brand website URL (e.g. https://example.com)"),
    industry: z.string().optional().describe("Industry or vertical"),
    products: z
      .array(z.string())
      .optional()
      .describe("List of products or services the brand offers"),
    competitors: z
      .array(z.string())
      .optional()
      .describe("List of competitor names"),
  },
  async ({ name, website, industry, products, competitors }) => {
    const data = await apiFetch("/api/v1/brands", {
      method: "POST",
      body: { name, website, industry, products, competitors },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: create_topic ────────────────────────────────────────────────────────

server.tool(
  "create_topic",
  "Create a topic cluster for a brand. Topics group related prompts (e.g. 'Pricing Questions', 'Product Comparisons').",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    name: z.string().min(1).describe("Topic name"),
    description: z
      .string()
      .optional()
      .describe("What this topic covers"),
    pages: z
      .array(z.string())
      .optional()
      .describe("Target page URLs that the topic should drive traffic to"),
    keywords: z
      .array(z.string())
      .optional()
      .describe("Keywords associated with this topic"),
  },
  async ({ brandId, name, description, pages, keywords }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/topics`, {
      method: "POST",
      body: { name, description, pages, keywords },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: add_prompts ─────────────────────────────────────────────────────────

server.tool(
  "add_prompts",
  "Bulk-add prompts to a brand under a specific topic. Subject to your plan's monthly prompt limit — the API will return an error if you've reached it.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    topicId: z
      .string()
      .describe("The topic UUID from list_topics — prompts are grouped under a topic"),
    prompts: z
      .array(z.string().min(1))
      .min(1)
      .describe("Array of prompt strings to add"),
  },
  async ({ brandId, topicId, prompts }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/prompts`, {
      method: "POST",
      body: { topicId, prompts: prompts.map((text) => ({ text })) },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: update_prompt ───────────────────────────────────────────────────────

const promptEditFields = {
  text: z
    .string()
    .min(1)
    .optional()
    .describe("New prompt text. Past results stay linked to this prompt; future runs use the new text."),
  llm: z
    .string()
    .optional()
    .describe("LLM engine label (one of: ChatGPT, Claude, Perplexity, Google AIO)"),
  topicId: z
    .string()
    .nullable()
    .optional()
    .describe("Move the prompt to another topic UUID (must belong to the same brand), or null to ungroup"),
  recommendationPageUrl: z
    .string()
    .nullable()
    .optional()
    .describe("Target page URL this prompt should drive traffic to, or null to clear"),
};

server.tool(
  "update_prompt",
  "Edit a single prompt: its text, topic, or target page URL. Editing the text keeps all past results linked to the prompt — only future runs use the new wording.",
  {
    promptId: z.string().describe("The prompt UUID (from get_results promptId)"),
    ...promptEditFields,
  },
  async ({ promptId, ...fields }) => {
    const body = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    const data = await apiFetch(`/api/v1/prompts/${promptId}`, {
      method: "PATCH",
      body,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: update_prompts ──────────────────────────────────────────────────────

server.tool(
  "update_prompts",
  "Bulk-edit up to 50 prompts in one call. Each update needs the prompt's id plus the fields to change (text, llm, topicId, recommendationPageUrl). Items are processed independently — the response reports how many updated and which failed, so you can retry just the failures. Editing text keeps past results linked; only future runs use the new wording.",
  {
    updates: z
      .array(
        z.object({
          id: z.string().describe("The prompt UUID"),
          ...promptEditFields,
        })
      )
      .min(1)
      .max(50)
      .describe("Array of prompt updates (max 50)"),
  },
  async ({ updates }) => {
    const cleaned = updates.map((u) =>
      Object.fromEntries(Object.entries(u).filter(([, v]) => v !== undefined))
    );
    const data = await apiFetch("/api/v1/prompts", {
      method: "PATCH",
      body: { updates: cleaned },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: list_prompts ────────────────────────────────────────────────────────

server.tool(
  "list_prompts",
  "List all prompts for a brand with their ids, text, topic, target page, last run date, and paused state. Use this to discover prompt ids for update_prompt, update_prompts, and delete_prompts — including prompts that have never been run (which get_results cannot see).",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    topicId: z
      .string()
      .optional()
      .describe("Optional topic UUID — if provided, only that topic's prompts are returned"),
  },
  async ({ brandId, topicId }) => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await apiFetch(`/api/v1/brands/${brandId}/prompts${query}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: list_deleted_prompts ────────────────────────────────────────────────

server.tool(
  "list_deleted_prompts",
  "List recently deleted prompts for a brand that are still restorable (48-hour grace window), grouped by delete batch with sample texts and expiry. Use the batchId with restore_prompts to undo a deletion.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/prompts/deleted?brandId=${encodeURIComponent(brandId)}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: restore_prompts ─────────────────────────────────────────────────────

server.tool(
  "restore_prompts",
  "Restore a batch of recently deleted prompts (undo a delete_prompts call). Works while the batch is still inside the 48-hour grace window; get the batchId from list_deleted_prompts or from the delete_prompts response.",
  {
    batchId: z.string().describe("The delete batch UUID from list_deleted_prompts or delete_prompts"),
  },
  async ({ batchId }) => {
    const data = await apiFetch("/api/v1/prompts/bulk-restore", {
      method: "POST",
      body: { batchId },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: delete_prompts ──────────────────────────────────────────────────────

server.tool(
  "delete_prompts",
  "Delete 1 to 50 prompts by id. This is a soft delete: the prompts stop collecting data immediately, stay restorable from the web app's Recently deleted view for 48 hours, and are then permanently removed along with their results. Prompts you don't own are skipped and reported back, not failed.",
  {
    promptIds: z
      .array(z.string())
      .min(1)
      .max(50)
      .describe("Prompt UUIDs to delete (from get_results promptId)"),
  },
  async ({ promptIds }) => {
    const data = await apiFetch("/api/v1/prompts/bulk-delete", {
      method: "POST",
      body: { promptIds },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: run_brand_prompts ───────────────────────────────────────────────────

server.tool(
  "run_brand_prompts",
  "Run all prompts for a brand across every enabled LLM (ChatGPT, Claude, Perplexity, Google AI Overviews). Optionally filter to a single topic. Returns the count of prompts run.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    topicId: z
      .string()
      .optional()
      .describe("Optional topic UUID — if provided, only that topic's prompts run"),
  },
  async ({ brandId, topicId }) => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    const query = params.toString() ? `?${params.toString()}` : "";

    const data = await apiFetch(`/api/v1/brands/${brandId}/run${query}`, {
      method: "POST",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: scan_brand ──────────────────────────────────────────────────────────

server.tool(
  "scan_brand",
  "Run a technical audit on the brand's website. Returns the full scan result — same data the dashboard's technical scan view shows (schema markup, sitemap, llms.txt, etc.).",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/scan`, {
      method: "POST",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: create_index ────────────────────────────────────────────────────────

server.tool(
  "create_index",
  "Create an industry index — a brand-agnostic view of an industry that tracks every entity cited across prompts (no single brand is the focus).",
  {
    name: z.string().min(1).describe("Index name"),
    industry: z.string().min(1).describe("Industry or vertical the index covers"),
    description: z
      .string()
      .optional()
      .describe("What this index is tracking"),
  },
  async ({ name, industry, description }) => {
    const data = await apiFetch("/api/v1/indexes", {
      method: "POST",
      body: { name, industry, description },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: list_indexes ────────────────────────────────────────────────────────

server.tool(
  "list_indexes",
  "List all industry indexes you have access to in AEO Copilot.",
  {},
  async () => {
    const data = await apiFetch("/api/v1/indexes");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: add_index_topic ─────────────────────────────────────────────────────

server.tool(
  "add_index_topic",
  "Add a topic cluster to an industry index. Topics group related prompts (e.g. 'Pricing Questions', 'Best-of Comparisons').",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
    name: z.string().min(1).describe("Topic name"),
    description: z
      .string()
      .optional()
      .describe("What this topic covers"),
  },
  async ({ indexId, name, description }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/topics`, {
      method: "POST",
      body: { name, description },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: add_index_prompts ───────────────────────────────────────────────────

server.tool(
  "add_index_prompts",
  "Bulk-add prompts to a topic in an industry index.",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
    topicId: z
      .string()
      .describe("The topic UUID — prompts are grouped under a topic"),
    prompts: z
      .array(z.string().min(1))
      .min(1)
      .describe("Array of prompt strings to add"),
  },
  async ({ indexId, topicId, prompts }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/prompts`, {
      method: "POST",
      body: { topicId, prompts: prompts.map((text) => ({ text })) },
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: run_index_prompts ───────────────────────────────────────────────────

server.tool(
  "run_index_prompts",
  "Run all prompts in an index across all 4 LLMs (ChatGPT, Claude, Perplexity, Google AI Overviews) and store full per-LLM results. No brand filter — every entity mentioned is captured.",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
  },
  async ({ indexId }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/run`, {
      method: "POST",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_index_results ───────────────────────────────────────────────────

server.tool(
  "get_index_results",
  "Get raw per-prompt results for an industry index across all 4 LLMs. Same shape as get_results minus the brand-mention fields — every cited entity is captured.",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
  },
  async ({ indexId }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/results`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_index_share_of_voice ────────────────────────────────────────────

server.tool(
  "get_index_share_of_voice",
  "Get the ranked entity list for an index by citation frequency, plus a concentration score (top-1 share % and HHI-style index showing how concentrated mentions are).",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
  },
  async ({ indexId }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/share-of-voice`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_index_sources ───────────────────────────────────────────────────

server.tool(
  "get_index_sources",
  "Get domains ranked by citation frequency across every LLM response in the index — which sources the AI engines lean on most.",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
  },
  async ({ indexId }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/sources`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_index_whitespace ────────────────────────────────────────────────

server.tool(
  "get_index_whitespace",
  "Find whitespace opportunities in an index: prompts and topics where no entity is consistently cited (threshold: fewer than 1 consistent entity across at least 50% of runs). These are gaps where a brand could establish authority.",
  {
    indexId: z.string().describe("The index UUID from list_indexes"),
  },
  async ({ indexId }) => {
    const data = await apiFetch(`/api/v1/indexes/${indexId}/whitespace`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: discover_audit_pages ────────────────────────────────────────────────

server.tool(
  "discover_audit_pages",
  "Step 1 of the deep AEO tech audit: list the brand site's URLs (sitemap-first, crawl fallback), grouped by source, with the saved selection and a smart default selection. Use it to review or change which pages run_deep_audit will test.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/audit/discover`, {
      method: "POST",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: run_deep_audit ──────────────────────────────────────────────────────

server.tool(
  "run_deep_audit",
  "Run the deep AEO tech audit on a brand: every selected page is fetched with 9 AI crawler identities (GPTBot, ClaudeBot, PerplexityBot, etc.) comparing status and response size, robots.txt is parsed per crawler token, and the raw HTML is parsed for structure, metadata, structured data (incl. whether FAQ answers are carried in full), and attribute-JSON payloads. Returns layer verdicts, severity-ranked findings, the access matrix, and per-page parseability. Takes up to 2 minutes. Omit urls to use the brand's saved page selection (or a smart default). Limitation: crawler identities are tested from a regular IP, so IP-verified bot blocking will not show.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
    urls: z
      .array(z.string().url())
      .min(1)
      .max(20)
      .optional()
      .describe("Pages to audit (1-20). Omit to use the saved selection, else a smart default (homepage + tracked pages + sitemap sample)"),
  },
  async ({ brandId, urls }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/audit/run`, {
      method: "POST",
      body: urls ? { urls } : {},
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool: get_audit_result ────────────────────────────────────────────────────

server.tool(
  "get_audit_result",
  "Get the latest stored tech-audit result for a brand without re-running it: layer verdicts (access / rendering / parseability), findings, crawler-access matrix, robots.txt per AI token, and per-page parseability. Deep-audit fields are null if only the legacy quick scan has run.",
  {
    brandId: z.string().describe("The brand UUID from list_brands"),
  },
  async ({ brandId }) => {
    const data = await apiFetch(`/api/v1/brands/${brandId}/audit/result`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Start server ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
