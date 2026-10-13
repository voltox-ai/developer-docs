// Live Voltox API access. Operations come ONLY from content/api/operations.json, which Voltox fills from
// its official API reference. Nothing is guessed. Credentials arrive via OAuth props (remote) or local config.
import { OPERATIONS } from "../generated/content.js";

export interface Credentials { clientId?: string; clientSecret?: string; environment: "test" | "live" }
export interface LiveConfig {
  baseUrls: Record<string, string | undefined>;   // e.g. { "live:api": "https://api.voltox.ai", "test:api": … }
  allowProductionWrites: boolean;
}

export interface Operation {
  id: string; title: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; host: string; path: string;
  description?: string; skill: string; readOnly: boolean; production?: boolean;
  auth?: { type: "header"; header: string; value: "clientId" | "clientSecret" } | { type: "none" };
  params?: Record<string, unknown>;
}

export const operations = (): Operation[] => (OPERATIONS.operations ?? []) as Operation[];

export function describeRegistry() {
  const ops = operations();
  return {
    registryVersion: OPERATIONS.version,
    count: ops.length,
    operations: ops.map((o) => ({ id: o.id, title: o.title, method: o.method, readOnly: o.readOnly, skill: o.skill })),
    note: ops.length ? undefined : "No live operations registered yet. Voltox adds operations to content/api/operations.json from its official API reference (OpenAPI). Until then, use documentation, planning, code and assessment tools.",
  };
}

export async function call(op: Operation, params: Record<string, unknown>, creds: Credentials, cfg: LiveConfig) {
  const base = cfg.baseUrls[`${creds.environment}:${op.host}`];
  if (!base) return { error: `No ${creds.environment} base URL configured for host '${op.host}'.` };
  if (creds.environment === "live" && !op.readOnly && !(cfg.allowProductionWrites && op.production)) {
    return { error: "Production writes are disabled for this server or operation (boundary G3)." };
  }
  let path = op.path;
  const query = new URLSearchParams();
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (path.includes(`{${k}}`)) {
      const s = String(v);
      if (!s || /^\.+$/.test(s) || s.length > 200) return { error: `Invalid value for path parameter '${k}'.` };
      path = path.replace(`{${k}}`, encodeURIComponent(s));
    }
    else if (op.method === "GET" || op.method === "DELETE") query.set(k, String(v));
    else body[k] = v;
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (op.auth?.type === "header") {
    const value = op.auth.value === "clientId" ? creds.clientId : creds.clientSecret;
    if (!value) return { error: "Not signed in to Voltox for this environment (use the OAuth login or local configuration)." };
    headers[op.auth.header] = value;
  }
  if (op.method !== "GET" && op.method !== "DELETE") headers["Content-Type"] = "application/json";
  if (/\{[^}]+\}/.test(path)) return { error: "Missing path parameter(s)." };
  const url = `${base.replace(/\/$/, "")}${path}${query.size ? `?${query}` : ""}`;
  // the resolved path must still be the operation's template (no dot-segment or encoding tricks)
  const tpl = new RegExp("^" + new URL(base).pathname.replace(/\/$/, "").replace(/[.*+?^$()|[\]\\]/g, "\\$&") + op.path.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{[^}]+\\?\}|\{[^}]+\}/g, "[^/]+") + "$");
  if (!tpl.test(new URL(url).pathname)) return { error: "Resolved path does not match the operation." };
  const started = Date.now();
  const res = await fetch(url, { method: op.method, headers, body: op.method === "GET" || op.method === "DELETE" ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, ms: Date.now() - started, data };
}
