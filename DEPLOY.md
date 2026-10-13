# Deploy and connect

## 0. Decide (Voltox)

| Decision | Placeholder in repo |
|---|---|
| MCP domain | `https://mcp.voltox.ai/mcp` |
| Docs domain | `https://developers.voltox.ai` |
| License | Apache-2.0 (code); documentation © Voltox |
| Publication of the SDK guides (merchant edition) | included in `server/content/docs/sdk/` |
| Use of the wallee ep2 self-assessment structure | requires wallee approval |

## 1. MCP server on Cloudflare Workers

```bash
cd server && npm ci
npx wrangler login
npx wrangler kv namespace create OAUTH_KV        # paste the id into wrangler.toml
npm run deploy                                   # typecheck + tests + deploy
```

Then in `wrangler.toml`: set `MCP_PUBLIC_URL` to the final URL and add the custom domain route; redeploy. Check `https://<host>/health` and `https://<host>/.well-known/oauth-protected-resource/mcp`.

Recommended Cloudflare settings: WAF rate-limiting rule on `/mcp`, `/token`, `/register` (e.g. 60 req/min/IP); Workers Logs with short retention.

Live Voltox API: once Voltox publishes its OpenAPI, add operations to `server/content/api/operations.json` and base URLs to `VOLTOX_BASE_URLS`. Nothing is guessed until then.

## 2. Developer site

```bash
cd site && npm ci
SITE_URL=https://developers.voltox.ai MCP_PUBLIC_URL=https://mcp.voltox.ai/mcp npm run build
```

Deploy `site/dist` to Cloudflare Pages (or any static host). For GitHub Pages under a sub-path set `SITE_BASE=/voltox-ai-dev/`.

## 3. Claude plugin

```bash
cd server && node scripts/package-plugin.mjs --url https://mcp.voltox.ai/mcp
claude plugin validate ../plugins/voltox-ai-dev && claude plugin validate ..
```

Commit `plugins/voltox-ai-dev`. Users install with:

```
/plugin marketplace add voltox-ai/developer-docs
/plugin install voltox-ai-dev@voltox-ai-dev
```

Directory listing: submit the public repository at claude.ai/directory/manage (README with privacy section, LICENSE, privacy policy URL, icon are prepared).

## 4. Connect

- **Claude**: Settings → Connectors → Add custom connector → `https://mcp.voltox.ai/mcp`
- **Claude Code**: `claude mcp add --transport http voltox-ai-dev https://mcp.voltox.ai/mcp`
- **ChatGPT** (Business/Enterprise/Edu developer mode; Pro read-only): Settings → Apps & Connectors → Advanced → Developer mode → Create → URL, OAuth
- **Local (stdio, offline docs)**: `cd server && npm run build:stdio` → `claude mcp add voltox-ai-dev-local -- node /path/to/server/dist/stdio.js`
