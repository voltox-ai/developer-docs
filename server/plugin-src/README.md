# Voltox AI Dev

Voltox AI Dev helps developers, merchants and partners build integrations with **Voltox Age Verification, Smile & Pay, Face Recognition and KYC** on **wallee** card terminals, wallee SoftPOS and wallee e-commerce, designed along the ep2 standard. It connects Claude to the Voltox AI Dev MCP server and ships the same best-practice skills for offline use in Claude Code.

## What you get

- **Complete documentation**: the Voltox developer docs and SDK guides (Android, Flutter), searchable.
- **Guardrails per product**: one skill per product with dos and don'ts, fail-closed result contracts and clear product boundaries.
- **Integration assistant**: asks for product, integration type, method, language and security level, then returns a blueprint (architecture, wallee interface, authentication per hop, timeouts, surrogate PAN design, performance budget).
- **Secure code skeletons** for Kotlin, Java, Dart, TypeScript, Python and C#.
- **Automatic review**: finds fail-open age gates, hard-coded secrets, disabled TLS, deprecated wallee APIs, surrogate PAN misuse and more.
- **Hard self-assessments**: a terminal catalogue (based on the wallee ep2 integration self-assessment) and an API catalogue (OAuth 2.1 / FAPI 2.0, webhooks, idempotency, PCI DSS, data protection). A mandatory item without evidence counts as not run.

## Install

Claude Code:

```
/plugin marketplace add voltox-ai/developer-docs
/plugin install voltox-ai-dev@voltox-ai-dev
```

Claude (web, desktop): Settings → Connectors → Add custom connector → paste the server URL from `.mcp.json`.

ChatGPT: Settings → Apps & Connectors → Advanced → Developer mode → Create → paste the server URL, authentication OAuth.

On first use a Voltox consent page opens. Choose **documentation only** (no account needed) or sign in with a Voltox **test** API client. Write operations always need a BestPracticeKey from the matching skill and your confirmation in chat. Production writes are disabled by default.

## Get started

Open your project and ask Claude: *"Build the Voltox integration into my application"* (prompt `build-integration`). Claude studies your code, reads the docs, runs a gap and security analysis, plans, implements after your approval, reviews and runs the self-assessment. Items that need a real terminal or device are listed with exact test steps — they cannot be passed without evidence.

## Security

- Never paste card numbers, secrets, tokens or face images into the chat; the server rejects them.
- Your Voltox credentials are stored only inside the encrypted OAuth grant on the server and are never shown to the AI.
- Access tokens live 15 minutes; refresh tokens rotate on every use.

## Privacy Policy

The server processes your requests to answer them and does not store the content you send (code you submit for review is analysed in memory and not kept). If you sign in with Voltox API credentials, they are stored encrypted in your OAuth grant until you disconnect or the grant expires. Operational logs contain request metadata only (time, tool name, status), never prompts, code, credentials or personal data. Full policy: see PRIVACY.md or the privacy page linked in the plugin listing.

## Support

Open an issue in the repository or contact Voltox developer support via the documentation site.

## License

Code: Apache-2.0 (see LICENSE). Voltox product documentation content © Voltox. wallee and ep2 are trademarks of their owners; ep2 specification text is not reproduced, only referenced.
