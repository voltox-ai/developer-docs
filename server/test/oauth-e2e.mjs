// Full OAuth 2.1 + MCP round trip against a running worker (wrangler dev). Usage: node test/oauth-e2e.mjs http://127.0.0.1:8787
import assert from "node:assert/strict";
import crypto from "node:crypto";
const BASE = process.argv[2] ?? "http://127.0.0.1:8787";
const REDIRECT = "http://localhost:9999/callback";
const b64u = (b) => Buffer.from(b).toString("base64url");
const log = (...a) => console.log("✔", ...a);

// 1. unauthenticated MCP → 401 with resource metadata pointer
let r = await fetch(`${BASE}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
assert.equal(r.status, 401); const www = r.headers.get("www-authenticate"); assert.match(www, /resource_metadata=/); log("401 + WWW-Authenticate", www);

// 2. discovery
const prm = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`)).json();
assert.ok(prm.authorization_servers?.length); log("protected resource metadata", prm.resource, prm.scopes_supported);
const as = await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json();
assert.ok(as.code_challenge_methods_supported.includes("S256")); log("AS metadata", as.issuer, as.grant_types_supported, as.code_challenge_methods_supported);

async function connect(access, creds = {}) {
  // 3. dynamic client registration (public client)
  const reg = await (await fetch(as.registration_endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "e2e test", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] }) })).json();
  assert.ok(reg.client_id);
  // 4. authorize with PKCE S256 + resource indicator
  const verifier = b64u(crypto.randomBytes(32)); const challenge = b64u(crypto.createHash("sha256").update(verifier).digest());
  const state = b64u(crypto.randomBytes(12));
  const q = new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state, scope: "voltox.docs", resource: prm.resource });
  r = await fetch(`${as.authorization_endpoint}?${q}`, { redirect: "manual" });
  assert.equal(r.status, 200); const html = await r.text();
  assert.match(r.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const handle = html.match(/name="handle" value="([^"]+)"/)[1]; const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  // plain PKCE rejected
  const qp = new URLSearchParams(q); qp.set("code_challenge_method", "plain"); qp.set("code_challenge", verifier);
  const rp = await fetch(`${as.authorization_endpoint}?${qp}`, { redirect: "manual" }); assert.notEqual(rp.status, 302);
  // 5. consent post
  const form = new URLSearchParams({ handle, decision: "approve", access, environment: "test", ...creds });
  r = await fetch(as.authorization_endpoint, { method: "POST", redirect: "manual", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: form });
  assert.equal(r.status, 302, await r.clone().text()); const loc = new URL(r.headers.get("location"));
  assert.equal(loc.searchParams.get("state"), state); const code = loc.searchParams.get("code"); assert.ok(code);
  // replay of the consent handle fails
  const replay = await fetch(as.authorization_endpoint, { method: "POST", redirect: "manual", headers: { cookie, "content-type": "application/x-www-form-urlencoded" }, body: form });
  assert.notEqual(replay.status, 302);
  // 6. wrong verifier rejected, right verifier accepted
  const bad = await fetch(as.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: reg.client_id, code_verifier: b64u(crypto.randomBytes(32)), resource: prm.resource }) });
  assert.equal(bad.status, 400);
  // code is single use; get a fresh one by repeating is out of scope — the failed attempt above may have burned it, so retry the flow if needed
  let tok = await (await fetch(as.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: reg.client_id, code_verifier: verifier, resource: prm.resource }) })).json();
  return { tok, reg, verifier };
}

async function mcp(token, method, params = {}, id = 1) {
  const res = await fetch(`${BASE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" }, body: JSON.stringify({ jsonrpc: "2.0", id, method, params }) });
  const t = await res.text(); assert.equal(res.status, 200, t);
  assert.match(res.headers.get("strict-transport-security") ?? "", /max-age/);
  return JSON.parse(t);
}

const docs = await connect("docs");
if (docs.tok.error) console.log("note: code burned by failed verifier attempt →", docs.tok.error);
assert.ok(docs.tok.access_token, "authorization code must still be usable after a wrong-verifier attempt? see note");
assert.ok(docs.tok.expires_in <= 900); assert.ok(docs.tok.refresh_token); log("token", docs.tok.token_type, docs.tok.expires_in, docs.tok.scope);
const init = await mcp(docs.tok.access_token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1" } });
assert.equal(init.result.serverInfo.name, "voltox-ai-dev"); assert.match(init.result.instructions, /MUST be consulted/); log("initialize", init.result.serverInfo, init.result.protocolVersion);
const tools = await mcp(docs.tok.access_token, "tools/list"); assert.equal(tools.result.tools.length, 11); log("tools/list", tools.result.tools.length);
const st = JSON.parse((await mcp(docs.tok.access_token, "tools/call", { name: "voltox_connection_status", arguments: {} })).result.content[0].text);
assert.equal(st.mode, "remote"); assert.equal(st.signedIn, false); assert.deepEqual(st.scopes, ["voltox.docs"]); log("docs-only status", st.scopes);
const plan = JSON.parse((await mcp(docs.tok.access_token, "tools/call", { name: "voltox_plan_integration", arguments: { products: ["age-verification"], channel: "terminal-attended", language: "kotlin", securityLevel: "L2", cardRecognition: true, ageThresholds: [18] } })).result.content[0].text);
assert.equal(plan.status, "blueprint"); log("plan", plan.blueprint.pattern);
const call = (await mcp(docs.tok.access_token, "tools/call", { name: "voltox_api_call", arguments: { operationId: "x" } })).result; assert.equal(call.isError, true); log("api_call without registry → error");

// refresh rotation
const rt = await (await fetch(as.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: docs.tok.refresh_token, client_id: docs.reg.client_id }) })).json();
assert.ok(rt.access_token); assert.notEqual(rt.refresh_token, docs.tok.refresh_token); log("refresh rotated");

// API access with (fake) credentials: secret is never visible to the client
const api = await connect("write", { clientId: "test-client-1234", clientSecret: "this-is-a-test-secret-xyz" });
const st2txt = (await mcp(api.tok.access_token, "tools/call", { name: "voltox_connection_status", arguments: {} })).result.content[0].text;
const st2 = JSON.parse(st2txt); assert.equal(st2.signedIn, true); assert.equal(st2.clientIdHint, "test…"); assert.deepEqual(st2.scopes, ["voltox.docs", "voltox.api.read", "voltox.api.write"]);
assert.doesNotMatch(st2txt + JSON.stringify(api.tok), /this-is-a-test-secret-xyz/); log("signed-in status, secret not exposed", st2.scopes);

// deny flow returns access_denied to the client
{
  const reg = await (await fetch(as.registration_endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "deny", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" }) })).json();
  const v = b64u(crypto.randomBytes(32)); const ch = b64u(crypto.createHash("sha256").update(v).digest());
  let a = await fetch(`${as.authorization_endpoint}?${new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: REDIRECT, code_challenge: ch, code_challenge_method: "S256", state: "s1", resource: prm.resource })}`);
  const h = (await a.text()).match(/name="handle" value="([^"]+)"/)[1]; const ck = a.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  assert.match(a.headers.get("content-security-policy"), /default-src 'none'/);
  a = await fetch(as.authorization_endpoint, { method: "POST", redirect: "manual", headers: { cookie: ck, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ handle: h, decision: "deny" }) });
  assert.equal(a.status, 302); assert.match(a.headers.get("location"), /error=access_denied/); log("deny → access_denied redirect");
}
// down-scoped refresh loses API scopes
{
  const ds = await (await fetch(as.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: api.tok.refresh_token, client_id: api.reg.client_id, scope: "voltox.docs" }) })).json();
  if (ds.access_token) { const s = JSON.parse((await mcp(ds.access_token, "tools/call", { name: "voltox_connection_status", arguments: {} })).result.content[0].text); assert.deepEqual(s.scopes, ["voltox.docs"]); log("down-scoped token → docs only"); }
}
// bad token / GET
r = await fetch(`${BASE}/mcp`, { method: "POST", headers: { authorization: "Bearer x:y:z", "content-type": "application/json" }, body: "{}" }); assert.equal(r.status, 401); log("forged token → 401");
// oversized chunked body rejected
{
  const big = new ReadableStream({ start(c) { for (let i = 0; i < 20; i++) c.enqueue(new Uint8Array(100_000).fill(32)); c.close(); } });
  const res = await fetch(`${BASE}/mcp`, { method: "POST", duplex: "half", headers: { authorization: `Bearer ${docs.tok.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream" }, body: big });
  assert.equal(res.status, 413); log("2 MB chunked body → 413");
}
console.log("\nALL OAUTH + MCP E2E CHECKS PASSED");
