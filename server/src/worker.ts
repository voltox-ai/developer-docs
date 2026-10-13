// Remote transport on Cloudflare Workers: OAuth 2.1 authorization server (PKCE S256, dynamic client
// registration, RFC 8707/9728 metadata) wrapping a stateless Streamable HTTP MCP endpoint at /mcp.
// The Voltox credentials a user enters on the consent page are stored ONLY inside the encrypted grant
// props (workers-oauth-provider encrypts props with a key derived from the token). They are never
// logged, never returned to the AI client, and the MCP client only ever sees an opaque access token
// for THIS server (no token passthrough).
import OAuthProvider, { type AuthRequest, type ConsentDescription, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer, SCOPES, SERVER_NAME, SERVER_VERSION } from "./core/server.js";
import type { Credentials, LiveConfig } from "./core/live.js";
import { CONTENT_VERSION } from "./generated/content.js";

interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  VOLTOX_BASE_URLS?: string;                 // JSON, e.g. {"test:api":"https://…","live:api":"https://…"}
  VOLTOX_ALLOW_PRODUCTION_WRITES?: string;   // "true" to allow; default off (boundary G3)
  MCP_PUBLIC_URL?: string;                   // canonical resource URL, e.g. https://mcp.voltox.ai/mcp
}

interface Props { credentials?: Credentials; scopes: string[]; grantedAt: number; [k: string]: unknown }

const MAX_BODY = 1_000_000;
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};
const HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self' https: http://localhost:* http://127.0.0.1:*; frame-ancestors 'none'; base-uri 'none'";

function liveConfig(env: Env): LiveConfig {
  let baseUrls: Record<string, string> = {};
  try { baseUrls = JSON.parse(env.VOLTOX_BASE_URLS ?? "{}"); } catch { baseUrls = {}; }
  for (const [k, v] of Object.entries(baseUrls)) if (!/^https:\/\//.test(String(v))) delete baseUrls[k];
  return { baseUrls, allowProductionWrites: env.VOLTOX_ALLOW_PRODUCTION_WRITES === "true" };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function html(body: string, status = 200, extra?: Headers): Response {
  const h = new Headers({ "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": HTML_CSP, "Cache-Control": "no-store", ...SECURITY_HEADERS });
  // keep our stricter CSP / framing headers; take cookies and cache headers from the library
  extra?.forEach((v, k) => { const l = k.toLowerCase(); if (l === "set-cookie") h.append(k, v); else if (l !== "content-security-policy" && l !== "x-frame-options") h.set(k, v); });
  h.set("X-Frame-Options", "DENY");
  return new Response(body, { status, headers: h });
}

const page = (title: string, inner: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>:root{--bg:#0b0f14;--card:#121821;--fg:#e8eef5;--mut:#93a1b2;--acc:#4fa7ae;--warn:#ffb020;--line:#223041}
@media (prefers-color-scheme: light){:root{--bg:#f6f8fa;--card:#fff;--fg:#0b0f14;--mut:#57606a;--acc:#1c5257;--warn:#9a6700;--line:#d0d7de}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:640px;margin:40px auto;padding:0 16px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px}
h1{font-size:22px;margin:0 0 8px}h2{font-size:16px;margin:20px 0 8px}p,li{color:var(--mut)}code{background:var(--bg);padding:2px 6px;border-radius:6px;color:var(--fg)}
label{display:block;margin:12px 0 4px;font-weight:600}input[type=text],input[type=password],select{width:100%;padding:10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);font:inherit}
.row{display:flex;gap:12px;margin-top:20px}button{flex:1;padding:11px;border-radius:8px;border:1px solid var(--line);font:inherit;font-weight:600;cursor:pointer;background:var(--bg);color:var(--fg)}
button.primary{background:var(--acc);color:#fff;border-color:var(--acc)}.warn{color:var(--warn)}.opt{border:1px solid var(--line);border-radius:8px;padding:12px;margin-top:8px}
.opt input{margin-right:8px}small{color:var(--mut)}</style></head><body><main>${inner}</main></body></html>`;

// ---------------------------------------------------------------- consent / login
async function renderConsent(req: Request, env: Env): Promise<Response> {
  let auth: AuthRequest;
  try { auth = await env.OAUTH_PROVIDER.parseAuthRequest(req); } catch { return html(page("Invalid request", `<div class="card"><h1>Invalid authorization request</h1><p>Start the connection again from Claude or ChatGPT.</p></div>`), 400); }
  if (auth.codeChallengeMethod !== "S256") return html(page("PKCE required", `<div class="card"><h1>PKCE (S256) is required</h1><p>This server only accepts OAuth 2.1 authorization requests with PKCE S256.</p></div>`), 400);
  const d: ConsentDescription = await env.OAUTH_PROVIDER.describeConsent(auth);
  const tx = await env.OAUTH_PROVIDER.beginConsent(auth);
  const body = page("Connect Voltox AI Dev", `<div class="card">
  <h1>Connect ${esc(d.clientName)} to Voltox AI Dev</h1>
  <p>After approval, tokens are sent to <code>${esc(d.redirectHost)}</code>${d.clientDomain ? ` (verified domain <code>${esc(d.clientDomain)}</code>)` : " (client name is self-declared)"}.</p>
  ${d.redirectIsLoopback ? `<p class="warn">The redirect goes to an app on this computer. Approve only if you started this connection yourself.</p>` : ""}
  <form method="post" action="/authorize" autocomplete="off">
    <input type="hidden" name="handle" value="${esc(tx.handle)}">
    <h2>Access</h2>
    <div class="opt"><label><input type="radio" name="access" value="docs" checked>Documentation, guardrails, code and self-assessment only</label><small>No Voltox account needed. Recommended to start.</small></div>
    <div class="opt"><label><input type="radio" name="access" value="read">…plus read-only Voltox API with my credentials</label></div>
    <div class="opt"><label><input type="radio" name="access" value="write">…plus write operations (each one needs the BestPracticeKey and my confirmation in chat)</label></div>
    <h2>Voltox credentials <small>(only for API access)</small></h2>
    <p>Create them in the Voltox dashboard under your merchant account. Use a <b>test</b> client first. The secret is stored encrypted inside this grant only and is never shown to the AI.</p>
    <label for="env">Environment</label><select id="env" name="environment"><option value="test" selected>Test</option><option value="live">Live</option></select>
    <label for="cid">Client ID</label><input id="cid" type="text" name="clientId" maxlength="200" spellcheck="false">
    <label for="cs">Client Secret</label><input id="cs" type="password" name="clientSecret" maxlength="400" autocomplete="new-password">
    <div class="row"><button type="submit" name="decision" value="deny">Cancel</button><button class="primary" type="submit" name="decision" value="approve">Approve</button></div>
  </form></div>
  <p><small>${esc(SERVER_NAME)} ${esc(SERVER_VERSION)} · content ${esc(CONTENT_VERSION)}</small></p>`);
  return html(body, 200, tx.headers);
}

async function sha256Hex(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Reads the body with a hard byte limit (also for chunked requests without Content-Length). */
async function limitBody(req: Request, max: number): Promise<Request | null> {
  if ((Number(req.headers.get("content-length")) || 0) > max) return null;
  if (!req.body) return req;
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let n = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; n += value.byteLength; if (n > max) { await reader.cancel(); return null; } chunks.push(value); }
  const buf = new Uint8Array(n); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
  return new Request(req, { body: buf });
}

async function submitConsent(raw: Request, env: Env): Promise<Response> {
  const req = await limitBody(raw, 16_384);
  if (!req) return html(page("Too large", "<p>Request too large.</p>"), 413);
  const form = await req.formData();
  const handle = String(form.get("handle") ?? "");
  try {
    if (form.get("decision") !== "approve") {
      const denied = await env.OAUTH_PROVIDER.denyConsent(req, handle);
      const headers = new Headers(denied.headers);
      headers.set("Location", denied.redirectTo);
      return new Response(null, { status: 302, headers });
    }
    const access = String(form.get("access") ?? "docs");
    const environment: Credentials["environment"] = form.get("environment") === "live" ? "live" : "test";
    const clientId = String(form.get("clientId") ?? "").trim();
    const clientSecret = String(form.get("clientSecret") ?? "").trim();
    const wantsApi = access === "read" || access === "write";
    if (wantsApi && (!/^[\w.\-:]{4,200}$/.test(clientId) || clientSecret.length < 8 || /\s/.test(clientSecret))) {
      return html(page("Check credentials", `<div class="card"><h1>Credentials missing or malformed</h1><p>API access needs a Voltox Client ID and Client Secret. Go back and correct them, or choose documentation-only access.</p></div>`), 400);
    }
    const scopes = [SCOPES.docs, ...(wantsApi ? [SCOPES.read] : []), ...(access === "write" ? [SCOPES.write] : [])];
    const approved = await env.OAUTH_PROVIDER.approveConsent(req, handle, { scope: scopes });
    // stable, non-reversible user id: one grant per Voltox client+environment; guests get a random id
    const userId = wantsApi ? `vx-${(await sha256Hex(`${environment}|${clientId}|${await sha256Hex(clientSecret)}`)).slice(0, 32)}` : `guest-${crypto.randomUUID()}`;
    const props: Props = { scopes, grantedAt: Date.now(), ...(wantsApi ? { credentials: { clientId, clientSecret, environment } } : {}) };
    const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
      request: approved.request, userId, scope: scopes, props,
      metadata: { access, environment: wantsApi ? environment : null, label: wantsApi ? `${clientId.slice(0, 4)}…` : "docs-only" },
    });
    const headers = new Headers(approved.headers);
    headers.set("Location", redirectTo);
    return new Response(null, { status: 302, headers });
  } catch {
    return html(page("Session expired", `<div class="card"><h1>This approval page expired or was already used</h1><p>Start the connection again from Claude or ChatGPT.</p></div>`), 400);
  }
}

// ---------------------------------------------------------------- public pages
function landing(origin: string): Response {
  return html(page("Voltox AI Dev MCP", `<div class="card">
  <h1>Voltox AI Dev — MCP server</h1>
  <p>Documentation, guardrails, code generation, code review and hard self-assessments for integrating Voltox Age Verification, Smile &amp; Pay, Face Recognition and KYC with wallee terminals, SoftPOS and e-commerce — built along ep2.</p>
  <h2>Server URL</h2><p><code>${esc(origin)}/mcp</code></p>
  <h2>Claude</h2><ul><li>Settings → Connectors → Add custom connector → paste the server URL → Connect.</li><li>Claude Code: <code>claude mcp add --transport http voltox-ai-dev ${esc(origin)}/mcp</code></li></ul>
  <h2>ChatGPT</h2><ul><li>Settings → Apps &amp; Connectors → Advanced → Developer mode → Create → paste the server URL, authentication OAuth.</li></ul>
  <p>On first connect you choose documentation-only access or sign in with your Voltox test/live API client. Write operations always need your confirmation.</p></div>`));
}

// ---------------------------------------------------------------- MCP endpoint
const mcpHandler = {
  async fetch(raw: Request, env: Env, ctx: ExecutionContext & { props?: Props; auth?: { scope?: string[] } }): Promise<Response> {
    if (raw.method === "GET" || raw.method === "DELETE") {
      // stateless server: no standalone SSE stream and no sessions to delete
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }
    const request = await limitBody(raw, MAX_BODY);
    if (!request) return new Response("Payload too large", { status: 413 });
    const props = ctx.props ?? ({ scopes: [SCOPES.docs], grantedAt: 0 } as Props);
    // effective scopes = the token's verified (possibly down-scoped) scopes ∩ the grant's scopes
    const tokenScopes = ctx.auth?.scope;
    const scopes = Array.isArray(tokenScopes) ? props.scopes.filter((s) => tokenScopes.includes(s)) : props.scopes;
    const server = createServer({ mode: "remote", credentials: props.credentials, live: liveConfig(env), scopes });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const res = await transport.handleRequest(request);
    ctx.waitUntil(Promise.resolve().then(() => server.close()).catch(() => {}));
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
    h.set("Cache-Control", "no-store");
    return new Response(res.body, { status: res.status, headers: h });
  },
};

const defaultHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/authorize") {
      if (request.method === "GET") return renderConsent(request, env);
      if (request.method === "POST") return submitConsent(request, env);
      return new Response(null, { status: 405 });
    }
    if (url.pathname === "/health") return Response.json({ ok: true, server: SERVER_NAME, version: SERVER_VERSION, content: CONTENT_VERSION }, { headers: { "Cache-Control": "no-store" } });
    if (url.pathname === "/" || url.pathname === "") return landing(url.origin);
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /authorize\n", { headers: { "Content-Type": "text/plain" } });
    return new Response("Not found", { status: 404 });
  },
};

// One provider per canonical resource URL (RFC 9728/8707). MCP_PUBLIC_URL pins it in production
// (e.g. https://mcp.voltox.ai/mcp); otherwise the request origin is used (workers.dev / wrangler dev).
const providers = new Map<string, OAuthProvider<Env>>();
function provider(resource: string) {
  let p = providers.get(resource);
  if (!p) {
    p = new OAuthProvider<Env>({
      apiRoute: "/mcp",
      apiHandler: mcpHandler as any,
      defaultHandler: defaultHandler as any,
      authorizeEndpoint: "/authorize",
      tokenEndpoint: "/token",
      clientRegistrationEndpoint: "/register",
      scopesSupported: [SCOPES.docs, SCOPES.read, SCOPES.write],
      requiredScopes: [SCOPES.docs],
      resourceMetadata: { resource, resource_name: "Voltox AI Dev MCP" },
      accessTokenTTL: 900,                 // 15 min (RFC 9700 / FAPI-style short-lived access tokens)
      refreshTokenTTL: 30 * 24 * 3600,     // 30 days; refresh tokens rotate on use
    });
    providers.set(resource, p);
  }
  return p;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const resource = env.MCP_PUBLIC_URL || `${new URL(request.url).origin}/mcp`;
    return provider(resource).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
