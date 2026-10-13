// Local transport (Claude Code / Claude Desktop plugin). Credentials come only from the environment,
// which the plugin fills from sensitive userConfig (stored in the OS keychain). Nothing is written to disk.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./core/server.js";
import type { Credentials, LiveConfig } from "./core/live.js";

const env = process.env;
const clean = (v?: string) => (v && !v.startsWith("${") ? v.trim() : undefined); // ignore unresolved placeholders

const environment: Credentials["environment"] = clean(env.VOLTOX_ENV) === "live" ? "live" : "test";
const clientId = clean(env.VOLTOX_CLIENT_ID);
const clientSecret = clean(env.VOLTOX_CLIENT_SECRET);

let baseUrls: Record<string, string> = {};
try { baseUrls = JSON.parse(clean(env.VOLTOX_BASE_URLS) ?? "{}"); } catch { console.error("[voltox-ai-dev] VOLTOX_BASE_URLS is not valid JSON; live API disabled."); }
for (const [k, v] of Object.entries(baseUrls)) {
  if (!/^https:\/\//.test(v)) { console.error(`[voltox-ai-dev] base URL for ${k} is not https; ignored.`); delete baseUrls[k]; }
}

const live: LiveConfig = { baseUrls, allowProductionWrites: clean(env.VOLTOX_ALLOW_PRODUCTION_WRITES) === "true" };
const credentials: Credentials | undefined = clientId ? { clientId, clientSecret, environment } : undefined;

const server = createServer({ mode: "local", credentials, live });
await server.connect(new StdioServerTransport());
// stdout belongs to the protocol; diagnostics go to stderr and never contain secrets
console.error(`[voltox-ai-dev] ready (local, ${environment}, signed in: ${Boolean(clientId)})`);
