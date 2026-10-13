import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOCS, SKILLS, CONTENT_VERSION } from "../generated/content.js";
import { bestPracticeKey, verifyBestPracticeKey } from "./attestation.js";
import { guardInput } from "./guard.js";
import { search } from "./search.js";
import { review } from "./checker.js";
import { blueprint, missingQuestions, PLAN_OPTIONS, type PlanInput } from "./planner.js";
import { generate, CODE_TARGETS } from "./codegen.js";
import { catalogue, applicableItems, evaluate } from "./assessment.js";
import { operations, describeRegistry, call, type Credentials, type LiveConfig } from "./live.js";

export const SERVER_NAME = "voltox-ai-dev";
export const SERVER_VERSION = "1.0.0";

export const INSTRUCTIONS = `Voltox AI Dev — documentation, guardrails and tools for integrating Voltox Age Verification, Smile & Pay, Face Recognition and KYC with wallee terminals, wallee SoftPOS and wallee e-commerce, built along ep2.

This server provides best-practice skills that MUST be consulted before performing matching actions.
- Start every integration task with voltox_get_skill_guide(skill="voltox-integration-guide"), then read each skill it routes to.
- TRIGGER WHEN: code, configuration, architecture, tests or reviews touch Voltox SDKs/APIs, age checks, pay-by-face, card recognition (surrogate PAN), wallee terminals (ATI/LTI/CTI), SoftPOS, wallee API v2.0, webhooks, vending/MDB, security, or acceptance/ep2.
- SYMPTOMS: VoltoxAgeVerification, isVerified, requiredAge, ai.voltox.smile_and_pay, onPaid, amountMinorUnits, panHashVariants, generatePanToken, financialTrxRequest, performTransaction, x-signature, /api/v2.0, "age gate", "Smile & Pay", "ep2", "vending", "go-live".
- Do NOT load every reference up front; load only the reference files the skill names for the current task.
- Before ANY write tool call, pass the current BestPracticeKey of the matching skill (returned by voltox_get_skill_guide). Without it, writes are rejected.
- Ask the developer for missing integration facts (product, type, method, language, security level) instead of guessing; voltox_plan_integration returns the questions.
- Rules: fail closed; one product per skill; payments on wallee; no card data, no biometrics, no secrets in chat or code; surrogate PAN is an identifier, never a payment credential; speed budget is mandatory.
Content version ${CONTENT_VERSION}.`;

export interface ServerContext {
  mode: "local" | "remote";
  credentials?: Credentials;            // from OAuth props (remote) or local config
  live: LiveConfig;
  scopes?: string[];                    // remote: OAuth scopes granted at consent; local: undefined = all
}

export const SCOPES = { docs: "voltox.docs", read: "voltox.api.read", write: "voltox.api.write" } as const;
const hasScope = (ctx: ServerContext, s: string) => !ctx.scopes || ctx.scopes.includes(s);

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });
const fail = (msg: string) => ({ ...text(msg), isError: true });

function guarded<T extends Record<string, unknown>>(args: T): string | null {
  for (const v of Object.values(args)) { const g = guardInput(v); if (!g.ok) return g.reason!; }
  return null;
}

const skillNames = SKILLS.map((s) => s.name) as unknown as [string, ...string[]];

export function createServer(ctx: ServerContext): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS, capabilities: { logging: {} } });

  // ---------- Resources ----------
  server.registerResource("skills-index", "skill://voltox/index", { title: "Voltox skills index", mimeType: "text/markdown" }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: SKILLS.map((s) => `- skill://voltox/${s.name} — ${s.description}`).join("\n") }],
  }));
  server.registerResource("skill", new ResourceTemplate("skill://voltox/{name}", { list: async () => ({ resources: SKILLS.map((s) => ({ uri: `skill://voltox/${s.name}`, name: s.name, description: s.description, mimeType: "text/markdown" })) }) }),
    { title: "Voltox skill", mimeType: "text/markdown" }, async (uri, { name }) => {
      const s = SKILLS.find((x) => x.name === name);
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: s ? s.body : `Unknown skill ${name}` }] };
    });
  server.registerResource("skill-reference", new ResourceTemplate("skill://voltox/{name}/references/{file}", { list: undefined }),
    { title: "Voltox skill reference", mimeType: "text/markdown" }, async (uri, { name, file }) => {
      const s = SKILLS.find((x) => x.name === name);
      const body = s ? (s.references as Record<string, string>)[String(file)] : undefined;
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: body ?? `Unknown reference ${name}/${file}` }] };
    });
  server.registerResource("doc", new ResourceTemplate("docs://voltox/{+slug}", { list: async () => ({ resources: DOCS.map((d) => ({ uri: `docs://voltox/${d.slug}`, name: d.title, description: d.summary, mimeType: "text/markdown" })) }) }),
    { title: "Voltox developer documentation page", mimeType: "text/markdown" }, async (uri, { slug }) => {
      const d = DOCS.find((x) => x.slug === slug);
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: d ? d.body : `Unknown page ${slug}` }] };
    });

  // ---------- Read-only tools ----------
  server.registerTool("voltox_get_skill_guide", {
    title: "Read a Voltox best-practice skill",
    description: "Returns a skill (decision workflow, anti-patterns, reference index) or one of its reference files, plus the skill's current BestPracticeKey required by write tools. Call without arguments for the index. MUST be called before acting on a matching task.",
    inputSchema: { skill: z.enum(skillNames).optional(), file: z.string().max(120).optional().describe("Reference file name, e.g. sdk-android.md") },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Read a Voltox best-practice skill" },
  }, async ({ skill, file }) => {
    if (!skill) return text({ instructions: "Start with voltox-integration-guide. Read only the references needed for the current task.", skills: SKILLS.map((s) => ({ name: s.name, description: s.description, references: Object.keys(s.references) })) });
    const s = SKILLS.find((x) => x.name === skill)!;
    if (file) {
      const body = (s.references as Record<string, string>)[file];
      return body ? text(`# ${skill} › ${file}\n\n${body}`) : fail(`Unknown reference. Available: ${Object.keys(s.references).join(", ") || "none"}`);
    }
    return text(`${s.body}\n\n---\nBestPracticeKey (valid this hour and the next): ${bestPracticeKey(skill)}`);
  });

  server.registerTool("voltox_search_docs", {
    title: "Search Voltox documentation and skills",
    description: "Full-text search over the complete Voltox developer documentation, SDK guides and best-practice skills. Returns ranked sections with resource URIs.",
    inputSchema: { query: z.string().min(2).max(300), scope: z.enum(["all", "docs", "skills"]).default("all"), limit: z.number().int().min(1).max(20).default(8) },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Search Voltox documentation and skills" },
  }, async ({ query, scope, limit }) => {
    const g = guarded({ query }); if (g) return fail(g);
    const hits = search(query, limit, scope === "docs" ? "docs://" : scope === "skills" ? "skill://" : undefined);
    return text(hits.map((h) => ({ uri: h.uri, title: h.title, section: h.heading, score: Number(h.score.toFixed(2)), excerpt: h.text.slice(0, 600) })));
  });

  server.registerTool("voltox_get_doc", {
    title: "Read a Voltox documentation page",
    description: "Returns a full documentation page by slug, or the list of pages when no slug is given.",
    inputSchema: { slug: z.string().max(120).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Read a Voltox documentation page" },
  }, async ({ slug }) => {
    if (!slug) return text(DOCS.map((d) => ({ slug: d.slug, title: d.title, section: d.section, summary: d.summary })));
    const d = DOCS.find((x) => x.slug === slug);
    return d ? text(`# ${d.title}\n\n${d.body}`) : fail(`Unknown slug. Use voltox_get_doc without arguments for the list.`);
  });

  server.registerTool("voltox_plan_integration", {
    title: "Plan a Voltox × wallee integration",
    description: "Integration assistant. Asks for missing facts (products, integration type/channel, method, language, security level, card recognition, age thresholds) and, once complete, returns a blueprint: architecture pattern, interfaces, skills to read, gates, auth per hop, timeouts, surrogate PAN design, performance budget, code targets, self-assessments and items to confirm with wallee/Voltox.",
    inputSchema: {
      products: z.array(z.enum(["age-verification", "smile-and-pay", "face-recognition", "kyc"])).optional(),
      channel: z.enum(PLAN_OPTIONS.channel as [string, ...string[]]).optional(),
      method: z.string().max(60).optional(),
      language: z.enum(PLAN_OPTIONS.language as [string, ...string[]]).optional(),
      securityLevel: z.enum(["L1", "L2", "L3"]).optional(),
      environment: z.enum(["test", "live"]).optional(),
      country: z.string().max(40).optional(),
      cardRecognition: z.boolean().optional(),
      ageThresholds: z.array(z.number().int().min(1).max(99)).optional(),
      currency: z.string().length(3).optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Plan a Voltox × wallee integration" },
  }, async (args) => {
    const q = missingQuestions(args as PlanInput);
    if (q.length) return text({ status: "needs-input", ask: "Ask the developer these questions (do not guess), then call again with the answers.", questions: q });
    return text({ status: "blueprint", blueprint: blueprint(args as PlanInput) });
  });

  server.registerTool("voltox_generate_code", {
    title: "Generate a secure code skeleton",
    description: `Returns a fail-closed, secret-free code skeleton for a target in the requested language. Targets: ${CODE_TARGETS.join(", ")}.`,
    inputSchema: { target: z.enum(CODE_TARGETS as [string, ...string[]]), language: z.enum(["kotlin", "java", "dart", "typescript", "python", "csharp", "go"]).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Generate a secure code skeleton" },
  }, async ({ target, language }) => text(generate(target, language)));

  server.registerTool("voltox_review_integration", {
    title: "Review code or configuration against Voltox best practice",
    description: "Automatic checker. Scans source code, configuration or a design description for anti-patterns (fail-open results, secrets, disabled TLS, deprecated APIs, surrogate PAN misuse, deferred mode, amount rules, missing webhook verification…) and returns best_practice_warnings with fixes and references. The submitted text is not stored or echoed.",
    inputSchema: { content: z.string().min(1).max(200_000), context: z.string().max(200).optional().describe("e.g. file name or component") },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Review code or configuration against Voltox best practice" },
  }, async ({ content, context }) => {
    const warnings = review(content);
    const blocking = warnings.filter((w) => w.severity === "block").length;
    return text({ context, verdict: blocking ? "BLOCKED — fix blocking findings before merge" : warnings.length ? "PASS WITH WARNINGS" : "PASS", best_practice_warnings: warnings, note: "Automatic checks cover known anti-patterns only; they do not replace the self-assessment or a human review." });
  });

  server.registerTool("voltox_reference", {
    title: "Look up Voltox reference values",
    description: "Quick lookups: decline code meaning, age thresholds for a required age, SDK timeouts, performance budget.",
    inputSchema: { kind: z.enum(["decline-code", "age-threshold", "timeouts", "performance-budget"]), key: z.string().max(20).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Look up Voltox reference values" },
  }, async ({ kind, key }) => {
    if (kind === "age-threshold") {
      const a = Number(key);
      if (!Number.isInteger(a) || a <= 0) return fail("key must be the legal minimum age, e.g. 18");
      return text({ requiredAge: a, faceEstimatePasses: `≥ ${a + 5}`, documentPasses: `≥ ${a}`, nfcPasses: `documented age ≥ ${a} (date of birth from chip)`, note: "Comparisons inclusive; face below threshold → document verification, not 'underage'." });
    }
    const map: Record<string, [string, string]> = {
      "decline-code": ["voltox-smile-and-pay", "decline-codes.md"],
      timeouts: ["voltox-age-verification", "sdk-android.md"],
      "performance-budget": ["voltox-integration-guide", "performance-budget.md"],
    };
    const [skill, file] = map[kind];
    const body = (SKILLS.find((s) => s.name === skill)!.references as Record<string, string>)[file] ?? "";
    if (kind === "decline-code" && key) {
      const line = body.split("\n").find((l) => l.startsWith(`| ${key.toUpperCase()} `));
      return line ? text(line) : fail(`Unknown decline code ${key}`);
    }
    if (kind === "timeouts") return text(body.slice(body.indexOf("## Timeouts at a glance"), body.indexOf("## Camera face scan")));
    return text(body);
  });

  server.registerTool("voltox_self_assessment_get", {
    title: "Get a self-assessment catalogue",
    description: "Returns the hard acceptance catalogue: kind 'terminal' (wallee ep2 Integration Self-Assessment + Voltox, surrogate PAN and device security items) or 'api' (OAuth 2.1/FAPI 2.0, wallee JWT v2.0, webhooks, idempotency, data protection, PCI, stored credentials, performance, observability, supply chain, network/SCION). Filter by environment (AT/UAT), security level and products.",
    inputSchema: { kind: z.enum(["terminal", "api"]), environment: z.enum(["AT", "UAT"]).optional(), level: z.enum(["L1", "L2", "L3"]).optional(), products: z.array(z.string()).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Get a self-assessment catalogue" },
  }, async ({ kind, environment, level, products }) => {
    const c = catalogue(kind);
    return text({ title: c.title, version: c.version, basis: c.basis, characteristics: c.characteristics, rules: "mandatory items must be passed (with evidence) or waived in writing; any failed/open mandatory item = NOT ACCEPTABLE", items: applicableItems(kind, { environment, level, products }) });
  });

  server.registerTool("voltox_self_assessment_evaluate", {
    title: "Evaluate self-assessment results",
    description: "Computes the hard acceptance status from item results. Passed mandatory items without evidence count as 'not run'. Returns status, counts, per-item rows and a Markdown report.",
    inputSchema: {
      kind: z.enum(["terminal", "api"]), environment: z.enum(["AT", "UAT"]).optional(), level: z.enum(["L1", "L2", "L3"]).optional(), products: z.array(z.string()).optional(),
      results: z.array(z.object({ id: z.string().max(20), result: z.enum(["passed", "failed", "not run", "waived", "waiver req.", "check", "n/a"]), evidence: z.string().max(500).optional(), remarks: z.string().max(500).optional(), applicable: z.boolean().optional() })).max(300),
    },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Evaluate self-assessment results" },
  }, async ({ kind, environment, level, products, results }) => {
    const g = guarded({ results }); if (g) return fail(g);
    return text(evaluate(kind, { environment, level, products }, results));
  });

  server.registerTool("voltox_connection_status", {
    title: "Show Voltox connection status",
    description: "Shows server mode, whether a Voltox login is present (never the secret), environment, production-write policy and the live API registry.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Show Voltox connection status" },
  }, async () => text({
    server: `${SERVER_NAME} ${SERVER_VERSION}`, contentVersion: CONTENT_VERSION, mode: ctx.mode,
    signedIn: Boolean(ctx.credentials?.clientId), environment: ctx.credentials?.environment ?? "test",
    clientIdHint: ctx.credentials?.clientId ? `${ctx.credentials.clientId.slice(0, 4)}…` : null,
    scopes: ctx.scopes ?? "local (all)", productionWritesEnabled: ctx.live.allowProductionWrites, registry: describeRegistry(),
  }));

  // ---------- Live API ----------
  server.registerTool("voltox_api_call", {
    title: "Call a registered Voltox API operation",
    description: "Executes one operation from the official Voltox API registry with the signed-in credentials. Read operations run directly. Operations that change state require the BestPracticeKey of the operation's skill AND confirm=true (human confirmation). Production writes are disabled unless the server operator enables them.",
    inputSchema: {
      operationId: z.string().max(80), params: z.record(z.string(), z.unknown()).default({}).refine((v) => JSON.stringify(v).length <= 8_192, "params too large (max 8 KB)"),
      bestPracticeKey: z.string().max(80).optional(), confirm: z.boolean().default(false),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true, title: "Call a registered Voltox API operation" },
  }, async ({ operationId, params, bestPracticeKey: key, confirm }) => {
    const op = operations().find((o) => o.id === operationId);
    if (!op) return fail(`Unknown operation. ${describeRegistry().note ?? "See voltox_connection_status for the registry."}`);
    if (!hasScope(ctx, op.readOnly ? SCOPES.read : SCOPES.write)) return fail(`Not authorised: this connection was granted without '${op.readOnly ? SCOPES.read : SCOPES.write}'. Reconnect and approve it on the Voltox consent page.`);
    const g = guarded({ params }); if (g) return fail(g);
    if (!op.readOnly) {
      if (!verifyBestPracticeKey(op.skill, key)) return fail(`Write rejected: read skill '${op.skill}' with voltox_get_skill_guide and pass its BestPracticeKey.`);
      if (!confirm) return fail("Write rejected: ask the user to confirm this exact call, then repeat it with confirm=true.");
    }
    if (!ctx.credentials) return fail("Not signed in to Voltox.");
    try { return text(await call(op, params, ctx.credentials, ctx.live)); }
    catch (e) { return fail(`Call failed: ${(e as Error).name}`); }
  });

  // ---------- Prompts ----------
  server.registerPrompt("build-integration", {
    title: "Build the Voltox integration into my application (end to end)",
    description: "Studies your application, reads the docs and skills, runs a gap and security analysis, plans, implements with your approval, reviews the code and runs the self-assessment with every applicable item and test.",
    argsSchema: { goal: z.string().max(500).optional().describe("What the integration should do, e.g. 'age gate for tobacco at our vending machines'") },
  }, ({ goal }) => ({
    messages: [{ role: "user", content: { type: "text", text: `Build the Voltox integration into my application${goal ? ` — goal: ${goal}` : ""}. Work in these phases and show me a short result after each phase:

1. STUDY: read my repository (structure, languages, build, payment and device code, config, tests). Read skill voltox-integration-guide with voltox_get_skill_guide, then search the docs (voltox_search_docs) for everything my code touches.
2. ASK: call voltox_plan_integration with what you found; ask me only the questions it still returns (never guess product, channel, language, security level, card recognition, age thresholds).
3. GAP ANALYSIS: compare my application with the blueprint — table of requirement, current state (file:line), gap, severity. Read every skill in skillsToRead first.
4. SECURITY REVIEW: run voltox_review_integration on all relevant files and check the integration-security baseline for the chosen level (auth per hop, secrets, TLS, data minimisation, webhooks, idempotency, mobile hardening). List blocking findings first.
5. PLAN: a step-by-step implementation plan with files to change, tests to add, performance budget targets and the items to confirm with wallee/Voltox. Wait for my approval before changing code.
6. IMPLEMENT: make the changes in small commits using voltox_generate_code skeletons as a base; keep everything fail-closed and secret-free; add automated tests.
7. VERIFY: run my build and tests; run voltox_review_integration again until there are no blocking findings; measure what can be measured against the performance budget.
8. SELF-ASSESSMENT: fetch every applicable catalogue (voltox_self_assessment_get for my environment, level and products). For each item, decide: verified automatically (cite test/file/log as evidence), needs a manual or device test (give me exact steps), or not applicable (with reason). Then call voltox_self_assessment_evaluate with all results and show the report. Never mark an item passed without evidence.` } }],
  }));

  server.registerPrompt("start-integration", { title: "Start a Voltox integration", description: "Guided start: questions, blueprint, skills, code, review, assessment." }, () => ({
    messages: [{ role: "user", content: { type: "text", text: "I want to integrate Voltox. Read voltox-integration-guide, ask me the missing questions with voltox_plan_integration (product, integration type, method, language, security level, card recognition, age thresholds), then give me the blueprint, read the routed skills, and generate the code skeletons." } }],
  }));
  server.registerPrompt("review-my-code", { title: "Review my integration code", description: "Runs the automatic checker and explains fixes." }, () => ({
    messages: [{ role: "user", content: { type: "text", text: "Review my integration code with voltox_review_integration, explain every blocking finding with the referenced skill, and propose the corrected code." } }],
  }));
  server.registerPrompt("run-self-assessment", { title: "Run the acceptance self-assessment", description: "Walks through the terminal or API catalogue and evaluates the results." }, () => ({
    messages: [{ role: "user", content: { type: "text", text: "Run the self-assessment for my integration: read integration-self-assessment, fetch the right catalogue(s) with voltox_self_assessment_get for my environment, level and products, collect my results and evidence item by item, then evaluate with voltox_self_assessment_evaluate and give me the report." } }],
  }));

  return server;
}
