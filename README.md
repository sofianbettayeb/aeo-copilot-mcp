# AEO Copilot MCP Server

Connect [AEO Copilot](https://aeo-copilot.com) to Claude or any MCP-compatible assistant. Ask your AI about your brand's visibility in ChatGPT, Claude, Perplexity, and Google AI Overviews without switching tabs.

## What is AEO Copilot?

AI search engines are eating into traditional search traffic. When someone asks ChatGPT "What's the best tool for X?", your brand either shows up or it doesn't — and unlike Google, there's no ranking page to check.

[AEO Copilot](https://aeo-copilot.com) runs prompts against ChatGPT, Claude, Perplexity, and Google AI Overviews and records whether your brand got mentioned, where it ranked, how it was described, and which competitors showed up instead. This MCP server puts that data inside your AI assistant.

## Tools

| Tool | Description |
|------|-------------|
| `list_brands` | List all brands on your account |
| `list_topics` | List topics for a brand (e.g. "Product Comparisons", "Pricing Questions") |
| `get_results` | Per-prompt results across ChatGPT, Claude, Perplexity, and Google AI Overviews: mention status, position, sentiment, sources, competitors |
| `get_insights` | Aggregated analytics: visibility score, sentiment counts, competitive share, weekly trends, top topics |
| `get_recommendations` | Prioritised action items based on prompt results and a technical audit of your site |
| `create_brand` | Create a new brand (subject to your plan's brand limit) |
| `create_topic` | Create a topic cluster for a brand |
| `add_prompts` | Bulk-add prompts to a brand under a topic (subject to your plan's monthly prompt limit) |
| `run_brand_prompts` | Run all prompts for a brand (or one topic) across every enabled LLM |
| `scan_brand` | Run the technical audit on the brand's website and return the full scan result |
| `create_index` | Create an industry index (brand-agnostic — every cited entity is captured) |
| `list_indexes` | List all industry indexes on your account |
| `add_index_topic` | Add a topic cluster to an index |
| `add_index_prompts` | Bulk-add prompts to a topic in an index |
| `run_index_prompts` | Run all index prompts across all 4 LLMs and store full per-LLM results |
| `get_index_results` | Raw per-prompt results for an index across all LLMs |
| `get_index_share_of_voice` | Ranked entity list by citation frequency + concentration score (top-1 share, HHI) |
| `get_index_sources` | Domains ranked by citation frequency across every LLM response |
| `get_index_whitespace` | Prompts/topics where no entity is consistently cited — opportunity gaps |

## Setup

### 1. Get your API key

1. Log in to [aeo-copilot.com](https://aeo-copilot.com)
2. Go to **Settings → API**
3. Click **Create API key**
4. Copy the key — it starts with `aeo_`

Keep it somewhere safe; you won't be able to see the full key again after closing the dialog.

### 2. Add to Claude Code

```bash
claude mcp add aeo-copilot -e AEO_COPILOT_API_KEY=aeo_your_key_here -- npx aeo-copilot-mcp
```

### 3. Add to Claude Desktop

Edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aeo-copilot": {
      "command": "npx",
      "args": ["aeo-copilot-mcp"],
      "env": {
        "AEO_COPILOT_API_KEY": "aeo_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

## What you can ask

- "What's my brand's AI visibility score?"
- "Which prompts mention my competitors but not me?"
- "Show me my visibility trend for the last 30 days"
- "What topics are performing best in AI search?"
- "What should I fix to improve my AI visibility?"
- "How does my brand compare to [competitor] in AI-generated answers?"
- "What's the sentiment breakdown for my brand mentions?"

## API reference

### `list_brands`
```
GET /api/v1/brands
```
Returns all brands on your account: name, website, industry, products, competitors.

### `list_topics`
```
GET /api/v1/brands/:id/topics
```
Topics group related prompts. Each topic has a name, description, target pages, and keywords.

### `get_results`
```
GET /api/v1/brands/:id/results
```
Per-prompt results. Each entry includes mention status, position, sentiment, sources cited, and competitors — broken down by AI engine.

Optional filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `topicId` | string | Filter by topic |
| `from` | ISO date | Start date, e.g. `2025-01-01` |
| `to` | ISO date | End date |
| `limit` | number | Max results (default 100, max 500) |

### `get_insights`
```
GET /api/v1/brands/:id/insights
```
Aggregated analytics:

- Visibility score: percentage of prompts where your brand was mentioned
- Sentiment: positive, neutral, and negative counts
- Competitive share: your mentions vs. competitor mentions
- Visibility trend: week-by-week breakdown
- Top topics: which groups are driving the most visibility
- Competitor breakdown: how often each competitor appears

### `get_recommendations`
```
GET /api/v1/brands/:id/recommendations
```
Prioritised recommendations (high / medium / low) across visibility, content, and technical categories.

### `create_brand`
```
POST /api/v1/brands
```
Create a new brand. Body: `name` (required), `website`, `industry`, `products[]`, `competitors[]`. Returns 402 if you've hit your plan's brand limit.

### `create_topic`
```
POST /api/v1/brands/:id/topics
```
Create a topic cluster. Body: `name` (required), `description`, `pages[]`, `keywords[]`.

### `add_prompts`
```
POST /api/v1/brands/:id/prompts
```
Bulk-add prompts under a topic. Body: `topicId` (required), `prompts[]` (required, array of strings). Returns 402 if adding these prompts would exceed your plan's monthly prompt limit.

### `run_brand_prompts`
```
POST /api/v1/brands/:id/run
```
Run all prompts across every enabled LLM. Optional query param `topicId` to scope to a single topic. Returns the count of prompts run.

### `scan_brand`
```
POST /api/v1/brands/:id/scan
```
Run the technical audit on the brand's website. Returns the full scan result (schema markup, sitemap, llms.txt, etc.) — same data the dashboard's technical scan view shows.

## Industry indexes

Indexes are brand-agnostic: instead of tracking how *your* brand is mentioned, an index tracks **every entity** cited across an industry's prompts. Useful for category mapping, competitive whitespace, and seeing which sources the LLMs lean on.

### `create_index`
```
POST /api/v1/indexes
```
Create an industry index. Body: `name` (required), `industry` (required), `description`.

### `list_indexes`
```
GET /api/v1/indexes
```
List all indexes on your account.

### `add_index_topic`
```
POST /api/v1/indexes/:id/topics
```
Add a topic cluster. Body: `name` (required), `description`.

### `add_index_prompts`
```
POST /api/v1/indexes/:id/prompts
```
Bulk-add prompts under a topic. Body: `topicId` (required), `prompts[]` (required, array of strings).

### `run_index_prompts`
```
POST /api/v1/indexes/:id/run
```
Run every prompt across all 4 LLMs (ChatGPT, Claude, Perplexity, Google AI Overviews). All extracted entities are stored as competitors — no brand filter.

### `get_index_results`
```
GET /api/v1/indexes/:id/results
```
Raw per-prompt results across all LLMs. Same shape as `/brands/:id/results` minus the brand-mention fields.

### `get_index_share_of_voice`
```
GET /api/v1/indexes/:id/share-of-voice
```
Ranked entity list by citation frequency, plus a concentration score:

- `top1Share`: the % of mentions held by the most-cited entity
- `hhi`: an HHI-style index (sum of squared shares × 10,000) showing how concentrated mentions are. Higher = more dominated by a few entities.

### `get_index_sources`
```
GET /api/v1/indexes/:id/sources
```
Domains ranked by citation frequency across every LLM response in the index.

### `get_index_whitespace`
```
GET /api/v1/indexes/:id/whitespace
```
Prompts and topics where **no entity is consistently cited** — i.e. fewer than 1 consistent entity appears across at least 50% of runs. These are the gaps where a brand can establish authority before the category solidifies.

## Development

```bash
git clone https://github.com/sofianbettayeb/aeo-copilot-mcp
cd aeo-copilot-mcp
npm install
AEO_COPILOT_API_KEY=aeo_your_key npm run dev
```

## License

MIT
