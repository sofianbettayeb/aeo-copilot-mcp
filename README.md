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

## Development

```bash
git clone https://github.com/sofianbettayeb/aeo-copilot-mcp
cd aeo-copilot-mcp
npm install
AEO_COPILOT_API_KEY=aeo_your_key npm run dev
```

## License

MIT
