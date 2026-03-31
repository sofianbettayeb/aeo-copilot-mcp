# AEO Copilot MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for [AEO Copilot](https://aeo-copilot.com) — track your brand's visibility across AI search engines like ChatGPT, Claude, and Perplexity directly from your AI assistant.

## Tools

| Tool | Description |
|------|-------------|
| `list_brands` | List all brands you have access to |
| `list_topics` | List topics configured for a brand |
| `get_results` | Get prompt execution results (mentions, position, sentiment) per AI engine |
| `get_insights` | Get analytics: visibility score, sentiment, competitive share, trends |
| `get_recommendations` | Get prioritised recommendations to improve AI visibility |

## Setup

### 1. Get your API key

Log in to [aeo-copilot.com](https://aeo-copilot.com), go to **Settings → API Keys**, and generate a key. It will start with `aeo_`.

### 2. Add to Claude Code

```bash
claude mcp add aeo-copilot -e AEO_COPILOT_API_KEY=aeo_your_key_here -- npx aeo-copilot-mcp
```

Or add to your `~/.claude/claude_desktop_config.json` manually:

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

### 3. Use it

Ask your assistant things like:

- _"What's the AI visibility score for my brand?"_
- _"Which prompts mention my competitors but not me?"_
- _"What should I do to improve my brand's AI visibility?"_
- _"Show me my brand's sentiment trend over the last month"_

## Development

```bash
git clone https://github.com/YOUR_USERNAME/aeo-copilot-mcp
cd aeo-copilot-mcp
npm install
npm run dev
```

## License

MIT
