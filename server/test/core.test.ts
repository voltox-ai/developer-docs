// End-to-end tests of every tool, resource and prompt through a real MCP client (in-memory transport).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, SCOPES } from "../src/core/server.js";
import { bestPracticeKey, verifyBestPracticeKey } from "../src/core/attestation.js";
import { guardInput } from "../src/core/guard.js";
import { review } from "../src/core/checker.js";
import { evaluate, applicableItems } from "../src/core/assessment.js";
import { CODE_TARGETS, generate } from "../src/core/codegen.js";
import { SKILLS, DOCS } from "../src/generated/content.js";

async function connect(ctx: Parameters<typeof createServer>[0] = { mode: "local", live: { baseUrls: {}, allowProductionWrites: false } }) {
  const server = createServer(ctx);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}
const body = (r: any) => r.content[0].text as string;
const json = (r: any) => JSON.parse(body(r));

test("server advertises instructions, 11 tools with annotations, 4 prompts", async () => {
  const c = await connect();
  assert.match(c.getInstructions() ?? "", /MUST be consulted/);
  const { tools } = await c.listTools();
  assert.equal(tools.length, 11);
  for (const t of tools) {
    assert.ok(t.title && t.annotations?.title, `${t.name} title`);
    assert.equal(typeof t.annotations?.readOnlyHint, "boolean", `${t.name} readOnlyHint`);
    assert.ok(t.name.length <= 64 && /^[a-z_]+$/.test(t.name));
  }
  assert.equal(tools.find((t) => t.name === "voltox_api_call")!.annotations!.destructiveHint, true);
  assert.equal((await c.listPrompts()).prompts.length, 4);
});

test("resources: skills index, each skill, references, docs", async () => {
  const c = await connect();
  const { resources } = await c.listResources();
  assert.ok(resources.length >= SKILLS.length + DOCS.length);
  for (const s of SKILLS) {
    const r = await c.readResource({ uri: `skill://voltox/${s.name}` });
    assert.ok((r.contents[0] as any).text.length > 200, s.name);
    for (const f of Object.keys(s.references)) {
      const rr = await c.readResource({ uri: `skill://voltox/${s.name}/references/${f}` });
      assert.doesNotMatch((rr.contents[0] as any).text, /^Unknown reference/, `${s.name}/${f}`);
    }
  }
  for (const d of DOCS) {
    const r = await c.readResource({ uri: `docs://voltox/${d.slug}` });
    assert.doesNotMatch((r.contents[0] as any).text, /^Unknown page/, d.slug);
  }
});

test("skill files: frontmatter has TRIGGER WHEN and SYMPTOMS, body small", () => {
  for (const s of SKILLS) {
    assert.match(s.description, /\bUse (when|before)\b/, `${s.name} description says when to use it`);
    assert.match(s.body, /TRIGGER WHEN/, `${s.name} TRIGGER WHEN`);
    assert.match(s.body, /SYMPTOMS/, `${s.name} SYMPTOMS`);
    assert.ok(s.body.length < 20_000, `${s.name} SKILL.md must stay small (${s.body.length})`);
  }
});

test("skill guide returns a valid BestPracticeKey; key rotates hourly", async () => {
  const c = await connect();
  const r = body(await c.callTool({ name: "voltox_get_skill_guide", arguments: { skill: "voltox-age-verification" } }));
  const key = r.match(/vx-[a-z]+-[a-z]+-\d{10}/)![0];
  assert.ok(verifyBestPracticeKey("voltox-age-verification", key));
  assert.ok(!verifyBestPracticeKey("voltox-smile-and-pay", key), "key is skill-bound");
  const t0 = new Date("2026-10-13T10:15:00Z");
  assert.ok(verifyBestPracticeKey("x", bestPracticeKey("x", new Date("2026-10-13T09:59:00Z")), t0), "previous hour accepted");
  assert.ok(!verifyBestPracticeKey("x", bestPracticeKey("x", new Date("2026-10-13T08:59:00Z")), t0), "two hours old rejected");
  const idx = json(await c.callTool({ name: "voltox_get_skill_guide", arguments: {} }));
  assert.equal(idx.skills.length, SKILLS.length);
});

test("search finds the right material", async () => {
  const c = await connect();
  for (const [q, expect] of [["isVerified reason", "age-verification"], ["onPaid amountMinorUnits", "smile"], ["panHashVariants surrogate", "surrogate"], ["HTTP 543 performTransaction", "wallee"], ["SCION SSFN", "security"]] as const) {
    const hits = json(await c.callTool({ name: "voltox_search_docs", arguments: { query: q } }));
    assert.ok(hits.length > 0, q);
    assert.ok(hits.slice(0, 3).some((h: any) => h.uri.includes(expect)), `${q} → ${hits.slice(0, 3).map((h: any) => h.uri)}`);
  }
});

test("guard blocks real PANs and secrets, allows test PANs", async () => {
  assert.equal(guardInput("card 4111 1111 1111 1111").ok, true);
  assert.equal(guardInput("card 4012888888881881").ok, false);
  assert.equal(guardInput("client_secret = 'abcdefghijklmnopqrstuvwx'").ok, false);
  assert.equal(guardInput("-----BEGIN RSA PRIVATE KEY-----").ok, false);
  const c = await connect();
  const r: any = await c.callTool({ name: "voltox_search_docs", arguments: { query: "pay with 4012888888881881" } });
  assert.equal(r.isError, true);
  assert.doesNotMatch(body(r), /4012888888881881/, "PAN never echoed");
});

test("planner asks before it builds, then returns a complete blueprint", async () => {
  const c = await connect();
  const q = json(await c.callTool({ name: "voltox_plan_integration", arguments: {} }));
  assert.equal(q.status, "needs-input");
  assert.deepEqual(q.questions.map((x: any) => x.field), ["products", "channel", "language", "securityLevel"]);
  const bp = json(await c.callTool({ name: "voltox_plan_integration", arguments: { products: ["age-verification", "smile-and-pay"], channel: "terminal-unattended", language: "kotlin", securityLevel: "L3", cardRecognition: true, ageThresholds: [16, 18] } }));
  assert.equal(bp.status, "blueprint");
  const b = bp.blueprint;
  assert.match(b.pattern, /P2/);
  for (const s of ["vending-mdb-uvm", "surrogate-pan", "wallee-terminal-ep2", "voltox-smile-and-pay", "integration-security"]) assert.ok(b.skillsToRead.includes(s), s);
  assert.match(b.auth.join(" "), /DPoP/);
  assert.deepEqual(b.selfAssessment, ["terminal", "api"]);
  for (const s of b.skillsToRead) assert.ok(SKILLS.some((k) => k.name === s), `routed skill ${s} exists`);
  for (const t of b.codeTargets) assert.ok(CODE_TARGETS.includes(t), `code target ${t} exists`);
});

test("every code target generates, and generated code passes the checker without blocking findings", async () => {
  const c = await connect();
  for (const t of CODE_TARGETS) {
    const r: any = await c.callTool({ name: "voltox_generate_code", arguments: { target: t } });
    assert.ok(!r.isError, t);
    const out = json(r);
    assert.equal(out.error, undefined, t);
    const code = out.code as string;
    assert.ok(code.length > 200, t);
    const blocking = review(code).filter((w) => w.severity === "block");
    assert.deepEqual(blocking.map((w) => `${w.rule}: ${w.message}`), [], `${t} must be clean`);
  }
  assert.ok((generate("wallee-jwt", "python") as any).code.length > 200);
  assert.ok((generate("wallee-jwt", "csharp") as any).code.length > 200);
  assert.ok((generate("android-age-gate", "java") as any).code.length > 200);
});

test("checker catches the classic anti-patterns", async () => {
  const bad = `
    val ok = result?.isVerified ?: true
    if (result.reason == "Completed") deliver()
    requiredAge = 0
    developerMode = true
    val clientSecret = "sk_live_abcdefghijklmnop1234"
    Log.d("vx", "secret=" + clientSecret)
    trustAllCerts(); hostnameVerifier = { _, _ -> true }
    fetch("http://api.example.com/pay")
    POST /api/transaction/create
    generatePanToken()
    smile.startPayment(amountMinorUnits = 100)
  `;
  const ids = new Set(review(bad).map((w) => w.rule));
  for (const id of ["AV-DEFAULT-TRUE", "AV-REASON-DECISION", "AV-REQUIRED-AGE-ZERO", "DEV-MODE", "SECRET-HARDCODED", "TLS-DISABLED", "PLAIN-HTTP", "PAN-TOKEN-DEPRECATED", "SP-MIN-AMOUNT"]) assert.ok(ids.has(id), `missing ${id}; got ${[...ids]}`);
  const c = await connect();
  const r = json(await c.callTool({ name: "voltox_review_integration", arguments: { content: bad } }));
  assert.match(r.verdict, /BLOCKED/);
  assert.doesNotMatch(JSON.stringify(r), /sk_live_abcdefghijklmnop1234/, "secret not echoed");
});

test("reference lookups", async () => {
  const c = await connect();
  assert.match(body(await c.callTool({ name: "voltox_reference", arguments: { kind: "decline-code", key: "DR01" } })), /DR01/);
  assert.equal(json(await c.callTool({ name: "voltox_reference", arguments: { kind: "age-threshold", key: "18" } })).faceEstimatePasses, "≥ 23");
  assert.match(body(await c.callTool({ name: "voltox_reference", arguments: { kind: "timeouts" } })), /60/);
  assert.match(body(await c.callTool({ name: "voltox_reference", arguments: { kind: "performance-budget" } })), /p95/i);
});

test("self-assessment is hard: open, failed, evidence rule, waivers, levels", async () => {
  for (const kind of ["terminal", "api"] as const) {
    const items = applicableItems(kind, { environment: "AT", level: "L2" });
    assert.ok(items.length > 20, kind);
    const ids = new Set<string>(); for (const i of items) { assert.ok(!ids.has(i.id), `duplicate ${i.id}`); ids.add(i.id); }
    const mandatory = items.filter((i: any) => i.obligation === "mandatory");
    // nothing reported → open
    assert.equal(evaluate(kind, { environment: "AT", level: "L2" }, []).status, "NOT ACCEPTABLE (open)");
    // all passed WITHOUT evidence → still open
    assert.equal(evaluate(kind, { environment: "AT", level: "L2" }, mandatory.map((i: any) => ({ id: i.id, result: "passed" as const }))).status, "NOT ACCEPTABLE (open)");
    // all required passed with evidence, conditionals declared n/a → acceptable
    const all = items.filter((i: any) => i.obligation !== "optional" && i.obligation !== "recommended").map((i: any) => i.obligation === "conditional" ? { id: i.id, result: "n/a" as const, applicable: false } : { id: i.id, result: "passed" as const, evidence: "log://run-42" });
    assert.equal(evaluate(kind, { environment: "AT", level: "L2" }, all).status, "ACCEPTABLE", kind);
    // one failure → failed
    const oneFail = all.map((r, n) => n === 0 && r.result === "passed" ? { ...r, result: "failed" as const } : r);
    assert.equal(evaluate(kind, { environment: "AT", level: "L2" }, oneFail).status, "NOT ACCEPTABLE (failed)");
  }
  const l2 = applicableItems("api", { level: "L2" }).filter((i: any) => i.obligation === "mandatory").length;
  const l3 = applicableItems("api", { level: "L3" }).filter((i: any) => i.obligation === "mandatory").length;
  assert.ok(l3 > l2, "L3 is stricter than L2");
  const c = await connect();
  const r = json(await c.callTool({ name: "voltox_self_assessment_evaluate", arguments: { kind: "api", level: "L2", results: [{ id: "API-AUTH-01", result: "passed" }] } }));
  assert.match(r.report, /passed without evidence/);
});

test("live API: empty registry, scopes, key + confirm, production writes blocked", async () => {
  const c = await connect();
  const st = json(await c.callTool({ name: "voltox_connection_status", arguments: {} }));
  assert.equal(st.signedIn, false);
  assert.equal(st.registry.count, 0);
  const r: any = await c.callTool({ name: "voltox_api_call", arguments: { operationId: "nope" } });
  assert.equal(r.isError, true);
  const remote = await connect({ mode: "remote", live: { baseUrls: {}, allowProductionWrites: false }, scopes: [SCOPES.docs], credentials: { clientId: "abcd1234", clientSecret: "s3cr3t-value", environment: "test" } });
  const st2 = json(await remote.callTool({ name: "voltox_connection_status", arguments: {} }));
  assert.equal(st2.clientIdHint, "abcd…");
  assert.doesNotMatch(JSON.stringify(st2), /s3cr3t-value/, "secret never returned");
});

test("live.call enforces base URL, production-write policy and auth", async () => {
  const { call } = await import("../src/core/live.js");
  const op: any = { id: "x", title: "x", method: "POST", host: "api", path: "/v1/x/{id}", skill: "voltox-integration-guide", readOnly: false, auth: { type: "header", header: "X-Client-Id", value: "clientId" } };
  assert.match((await call(op, {}, { environment: "test" }, { baseUrls: {}, allowProductionWrites: false }) as any).error, /No test base URL/);
  assert.match((await call(op, {}, { environment: "live", clientId: "a" }, { baseUrls: { "live:api": "https://x.invalid" }, allowProductionWrites: false }) as any).error, /Production writes are disabled/);
  assert.match((await call(op, {}, { environment: "test" }, { baseUrls: { "test:api": "https://x.invalid" }, allowProductionWrites: false }) as any).error, /Not signed in/);
});

test("security regressions: guard is linear, path traversal blocked, scopes enforced before guard", async () => {
  const t0 = Date.now();
  assert.equal(guardInput("eyJ-".repeat(50_000)).ok, true);
  assert.ok(Date.now() - t0 < 500, `guard too slow: ${Date.now() - t0} ms`);
  assert.equal(guardInput("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop").ok, false);
  assert.equal(guardInput("x".repeat(400_001)).ok, false);
  const { call } = await import("../src/core/live.js");
  const op: any = { id: "x", title: "x", method: "GET", host: "api", path: "/v1/merchants/{id}/orders", skill: "s", readOnly: true, auth: { type: "none" } };
  const cfg = { baseUrls: { "test:api": "https://x.invalid/base" }, allowProductionWrites: false };
  for (const id of ["..", ".", "...", ""]) assert.match((await call(op, { id }, { environment: "test" }, cfg) as any).error, /Invalid value/, id);
  assert.match((await call(op, {}, { environment: "test" }, cfg) as any).error, /Missing path parameter/);
  const docsOnly = await connect({ mode: "remote", live: { baseUrls: {}, allowProductionWrites: false }, scopes: [SCOPES.docs] });
  const r: any = await docsOnly.callTool({ name: "voltox_api_call", arguments: { operationId: "nope", params: { a: "eyJ-".repeat(1000) } } });
  assert.equal(r.isError, true);
  const big: any = await docsOnly.callTool({ name: "voltox_api_call", arguments: { operationId: "nope", params: { a: "x".repeat(9000) } } });
  assert.equal(big.isError, true);
});
