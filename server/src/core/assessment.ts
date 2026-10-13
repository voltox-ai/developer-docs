import { ASSESSMENTS } from "../generated/content.js";

export type Result = "passed" | "failed" | "not run" | "waived" | "waiver req." | "check" | "n/a";
export interface ItemResult { id: string; result: Result; evidence?: string; remarks?: string; applicable?: boolean }

const LEVEL_RANK: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

export function catalogue(kind: "terminal" | "api") { return ASSESSMENTS[kind]; }

export function applicableItems(kind: "terminal" | "api", opts: { environment?: "AT" | "UAT"; level?: string; products?: string[] }) {
  const c = catalogue(kind);
  const items = [...c.requirements.map((r: any) => ({ ...r, type: "requirement" })), ...c.tests.map((t: any) => ({ ...t, type: "test" }))];
  return items.filter((i: any) => {
    if (kind === "terminal" && opts.environment && i.env && !String(i.env).split("/").includes(opts.environment)) return false;
    if (i.product && i.product !== "all" && opts.products?.length && !opts.products.includes(i.product)) return false;
    return true;
  }).map((i: any) => (kind === "api" && i.minLevel && LEVEL_RANK[i.minLevel] > LEVEL_RANK[opts.level ?? "L2"] && i.obligation === "mandatory" ? { ...i, obligation: "optional", note: `mandatory from ${i.minLevel}` } : i));
}

export function evaluate(kind: "terminal" | "api", opts: { environment?: "AT" | "UAT"; level?: string; products?: string[] }, results: ItemResult[]) {
  const items = applicableItems(kind, opts);
  const byId = new Map(results.map((r) => [r.id, r]));
  const rows = items.map((i: any) => {
    const r = byId.get(i.id);
    let result: Result = r?.result ?? "not run";
    const conditionalNA = i.obligation === "conditional" && r?.applicable === false;
    if (conditionalNA) result = "n/a";
    const required = i.obligation === "mandatory" || (i.obligation === "conditional" && r?.applicable !== false);
    // evidence rule: a passed required item without evidence counts as not run
    const evidenceMissing = required && result === "passed" && !r?.evidence;
    const effective: Result = evidenceMissing ? "not run" : result;
    return { id: i.id, title: i.title, obligation: i.obligation, required, result: effective, evidenceMissing, remarks: r?.remarks ?? "" };
  });
  const req = rows.filter((r) => r.required);
  const failed = req.filter((r) => r.result === "failed");
  const open = req.filter((r) => ["not run", "check", "waiver req."].includes(r.result));
  const passed = req.filter((r) => r.result === "passed" || r.result === "waived");
  const status = failed.length ? "NOT ACCEPTABLE (failed)" : open.length ? "NOT ACCEPTABLE (open)" : "ACCEPTABLE";
  const unknown = results.filter((r) => !items.some((i: any) => i.id === r.id)).map((r) => r.id);
  const report = [
    `# ${catalogue(kind).title}`,
    `Status: **${status}** · required ${req.length} · passed/waived ${passed.length} · failed ${failed.length} · open ${open.length}`,
    `Scope: kind=${kind}${opts.environment ? `, environment=${opts.environment}` : ""}${opts.level ? `, level=${opts.level}` : ""}${opts.products?.length ? `, products=${opts.products.join("+")}` : ""}`,
    "",
    failed.length ? "## Failed (blocking)\n" + failed.map((r) => `- ${r.id} ${r.title}${r.remarks ? ` — ${r.remarks}` : ""}`).join("\n") : "",
    open.length ? "## Open (blocking)\n" + open.map((r) => `- ${r.id} ${r.title} — ${r.evidenceMissing ? "passed without evidence → counts as not run" : r.result}`).join("\n") : "",
    unknown.length ? `## Unknown ids ignored\n${unknown.join(", ")}` : "",
    "",
    "This assessment prepares acceptance. wallee (terminal integration), the ep2 bodies and vending-approval engineers decide.",
  ].filter((x) => x !== "").join("\n");
  return { status, counts: { required: req.length, passed: passed.length, failed: failed.length, open: open.length }, rows, report };
}
