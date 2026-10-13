# Voltox AI Dev

Developer documentation site and **Voltox AI Dev MCP** server for integrating Voltox Age Verification, Smile & Pay, Face Recognition and KYC with **wallee** terminals, SoftPOS and e-commerce — built along ep2.

| Folder | What | Runs on |
|---|---|---|
| [`server/content/`](server/content) | **Single source of truth**: docs, best-practice skills, self-assessment catalogues | — |
| [`server/`](server) | MCP server: remote (Cloudflare Worker, OAuth 2.1) and local (stdio) | Cloudflare Workers / Node ≥ 20 |
| [`site/`](site) | Developer site (Astro Starlight) generated from the same content, incl. `llms.txt` | Any static host |
| [`plugins/voltox-ai-dev/`](plugins/voltox-ai-dev) | Claude plugin (remote MCP + skills), generated | Claude Code, Claude |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Plugin marketplace for `/plugin marketplace add voltox-ai/developer-docs` | — |

## Quick start

```bash
cd server && npm ci && npm run typecheck && npm test   # 13 tests: every tool, resource, guard, checker, assessment
npm run dev                                           # local worker on http://127.0.0.1:8787
npm run test:e2e                                      # full OAuth 2.1 + MCP round trip against the local worker
cd ../site && npm ci && npm run build                 # static site in site/dist
```

Deployment, Claude/ChatGPT connection and directory submission: see [DEPLOY.md](DEPLOY.md).

## Content rules

- English. Facts about wallee and ep2 are marked *Available* or *Confirm with wallee*.
- ep2 specification text is licensed: reference chapters, never copy text.
- No secrets, card data, biometric data or SDK binaries in this repository.
- Every relative link is checked at build time (`server/scripts/build-content.mjs`, site link check in CI).

## Security

See [SECURITY.md](SECURITY.md).
