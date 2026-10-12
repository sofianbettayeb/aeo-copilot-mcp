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
| `get_results` | Per-prompt results across ChatGPT, Claude, Perplexity, and Google AI Overviews: mention status, position, sentiment, sources, competitors, and the full answer text. Set `engine` to read just one LLM's answers (e.g. Claude) |
| `get_insights` | Overview metrics: % of AI answers that name your brand (per engine, with the change since the last run), share of voice, what changed, who's named instead, reputation, cited sources, topics |
| `get_recommendations` | Prioritised action items based on prompt results and a technical audit of your site |
| `get_reputation` | Reputation brands: answers that get your brand wrong (wrong product, outdated, contradicting your facts, engine doesn't know you), by engine, with the quote and the fact it conflicts with |
| `draft_brand_facts` | Draft brand facts from your website for review (nothing is saved) |
| `set_brand_facts` | Save the brand facts answers are checked against, then re-check the latest answers |
| `check_reputation` | Re-check the latest answers against the saved brand facts |
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
- "Show me exactly what Claude said about my brand"
- "Which prompts mention my competitors but not me?"
- "Show me my visibility trend for the last 30 days"
- "What topics are performing best in AI search?"
- "What should I fix to improve my AI visibility?"
- "How does my brand compare to [competitor] in AI-generated answers?"
- "What's the sentiment breakdown for my brand mentions?"
- "Draft brand facts for my Reputation brand from our website, and show me what to correct"
- "Which AI answers describe the wrong product, and where did they get it from?"

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
Per-prompt results. Each entry includes mention status, position, sentiment, sources cited, and competitors — broken down by AI engine. Every engine block also carries `response`: the **full answer text** that engine returned for the prompt.

Optional filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `topicId` | string | Filter by topic |
| `engine` | string | Return only one engine's answers: `chatgpt`, `claude`, `perplexity`, or `googleAio`. Each result is flattened to that engine's block (including its `response` text) and prompts where it wasn't run are omitted. Omit to get every engine |
| `from` | ISO date | Start date, e.g. `2025-01-01` |
| `to` | ISO date | End date |
| `limit` | number | Max results (default 100, max 500) |

> The API has no server-side `engine` filter — it always returns all four engine blocks. The MCP server applies the `engine` filter client-side so you get a focused, smaller payload when you only want one LLM (e.g. exactly what Claude said).

### `get_insights`
```
GET /api/v1/brands/:id/insights
```
The same numbers as the Overview page:

- `visibility`: % of answers that name your brand (1 answer = 1 prompt on 1 engine, latest run of each active prompt), with `visibilityDelta` in points and the split by engine
- `shareOfVoice`: your mentions as a share of all mentions of you and your tracked competitors
- `changes`: prompts where an engine stopped or started naming you, and who was named instead
- `competitors`: you and your competitors ranked on the same metric
- `reputation`, `sources`, `topics`, top `recommendations`
- Legacy fields kept: sentiment, competitiveShare, visibilityTrend, topTopics, mentionVolume, competitorBreakdown

### `get_reputation`
```
GET /api/v1/brands/:id/reputation
```
For Reputation brands: every answer checked against your saved brand facts. Returns `status`, problems by type and engine, `fixes` (quote, conflicting fact, prompts, engine, cited sources), a prompts × engines `matrix`, `tone` on answers with no problem, `changes`, `sources` and the saved `facts`. "No problem found" means nothing conflicts with your facts, not that the answer is verified.

### `draft_brand_facts`
```
POST /api/v1/brands/:id/brand-facts/draft
```
Drafts aliases and 5 to 8 facts from your website, each with the page it came from. Nothing is saved.

### `set_brand_facts`
```
PUT /api/v1/brands/:id/brand-facts
{ "aliases": ["generic name"], "facts": [{ "id": "f1", "statement": "...", "kind": "identity", "source": null }] }
```
Replaces the facts (the version goes up by 1) and re-checks the latest answers. `kind` is one of identity, indication, regulatory, pricing, availability, other. Needs editor access. Accuracy checks run on paid plans.

### `check_reputation`
```
POST /api/v1/brands/:id/reputation/check
```
Re-checks the latest answers against the current facts in the background. Read the result with `get_reputation`.

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
