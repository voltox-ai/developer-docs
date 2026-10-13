// Generates the Starlight content from the single source in ../voltox-mcp/content
// (docs, skills, assessments) plus llms.txt / llms-full.txt. Run before every build.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.env.VOLTOX_CONTENT ?? join(site, "..", "server", "content");
const out = join(site, "src", "content", "docs");
const BASE = (process.env.SITE_BASE ?? "/").replace(/\/?$/, "/");
const SITE_URL = process.env.SITE_URL ?? "https://developers.voltox.ai";
const MCP_URL = process.env.MCP_PUBLIC_URL ?? "https://mcp.voltox.ai/mcp";

for (const d of readdirSync(out, { withFileTypes: true })) if (d.name !== "index.mdx") rmSync(join(out, d.name), { recursive: true, force: true });

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
function fm(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/); const meta = {};
  if (m) for (const l of m[1].split("\n")) { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  return { meta, body: m ? md.slice(m[0].length) : md };
}
const q = (s) => JSON.stringify(String(s ?? ""));
const stripH1 = (b) => b.replace(/^\s*# .*\n+/, "");
const write = (rel, meta, body) => { const p = join(out, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, `---\n${Object.entries(meta).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : q(v)}`).join("\n")}\n---\n\n${body.trim()}\n`); };

// URL of a docs slug on the site (docs/index.md → /introduction/)
const docUrl = (slug) => `${BASE}${slug === "index" ? "introduction" : slug}/`;
const fix = (body, fromSlug) => body
  .replace(/\]\(((?!https?:|#|mailto:)[^)\s]+?)\.md(#[^)]*)?\)/g, (a, href, hash) => `](${docUrl(posix.normalize(posix.join(posix.dirname(fromSlug), href)))}${hash ?? ""})`)
  .replaceAll("https://<voltox-mcp-host>/mcp", MCP_URL)
  .replaceAll("<server URL>", MCP_URL);

// 1. docs
const docs = walk(join(src, "docs")).filter((f) => f.endsWith(".md")).map((f) => {
  const { meta, body } = fm(readFileSync(f, "utf8"));
  const slug = relative(join(src, "docs"), f).replace(/\.md$/, "").split("\\").join("/");
  return { slug, meta, body };
});
for (const d of docs) {
  const rel = (d.slug === "index" ? "introduction" : d.slug) + ".md";
  const note = d.meta.source ? `\n\n---\n\n<small>Source: ${d.meta.source}${d.meta.version ? ` · version ${d.meta.version}` : ""}</small>\n` : "";
  write(rel, { title: d.meta.title, description: d.meta.summary, sidebar: { order: Number(d.meta.order ?? 99) } }, fix(stripH1(d.body), d.slug) + note);
}

// 2. skills → /guardrails/
const docLinks = JSON.parse(readFileSync(join(src, "skill-doc-links.json"), "utf8"));
const skills = readdirSync(join(src, "skills")).sort((a, b) => (a === "voltox-integration-guide" ? -1 : b === "voltox-integration-guide" ? 1 : a.localeCompare(b)));
const skillTitle = {};
skills.forEach((name, i) => {
  const { meta, body } = fm(readFileSync(join(src, "skills", name, "SKILL.md"), "utf8"));
  const title = (body.match(/^# (.+)$/m)?.[1] ?? name).trim(); skillTitle[name] = title;
  const backed = docLinks[name] ?? {};
  let b = stripH1(body)
    .replace(/\]\(\.\.\/([a-z0-9-]+)\/SKILL\.md\)/g, (a, s) => `](${BASE}guardrails/${s}/)`)
    .replace(/\]\(references\/([a-z0-9-]+)\.md\)/g, (a, f) => backed[`${f}.md`] ? `](${docUrl(backed[`${f}.md`].replace(/\.md$/, ""))})` : `](${BASE}guardrails/${name}/${f}/)`);
  b = `:::note[AI skill]\nThis page is the **${name}** skill of the Voltox AI Dev MCP. AI assistants read it before acting on a matching task (\`skill://voltox/${name}\`).\n:::\n\n` + fix(b, "guardrails/x");
  write(`guardrails/${name}/index.md`, { title, description: meta.description, sidebar: { order: i, label: title } }, b);
  const refDir = join(src, "skills", name, "references");
  if (existsSync(refDir)) for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md") && !backed[x])) {
    const rb = readFileSync(join(refDir, f), "utf8");
    const rt = (rb.match(/^# (.+)$/m)?.[1] ?? f.replace(/\.md$/, "")).trim();
    write(`guardrails/${name}/${f.replace(/\.md$/, "")}.md`, { title: rt, description: `${title} — reference`, sidebar: { hidden: true } },
      fix(stripH1(rb).replace(/\]\(\.\.\/([a-z0-9-]+)\/SKILL\.md\)/g, (a, s) => `](${BASE}guardrails/${s}/)`).replace(/\]\(([a-z0-9-]+)\.md\)/g, (a, x) => `](${BASE}guardrails/${name}/${x}/)`), "guardrails/x"));
  }
});

// 3. self-assessment catalogues → /self-assessment/
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const badge = (o) => ({ mandatory: "**M**", conditional: "C", optional: "O", recommended: "R" }[o] ?? o);
for (const [i, kind] of ["terminal", "api"].entries()) {
  const c = JSON.parse(readFileSync(join(src, "assessments", `${kind}.json`), "utf8"));
  const lvl = kind === "api" ? " | Level" : " | Env";
  const col = (x) => (kind === "api" ? x.minLevel ?? "" : x.env ?? "");
  const groups = {};
  for (const r of c.requirements) (groups[r.area ?? (r.product && r.product !== "all" ? `Voltox · ${r.product}` : r.id.replace(/-\d+.*$/, ""))] ??= []).push(r);
  let body = `${esc(c.basis ?? "")}\n\n**Version ${c.version}.** Obligation: **M** mandatory · C conditional (n/a if not used) · O optional. ${kind === "api" ? "Level = lowest security level at which a mandatory item applies; below it the item is optional." : "Env: AT attended, UAT unattended."}\n\n`;
  body += `:::caution[Hard rules]\n- Mandatory items must be *passed with evidence* or *waived in writing*.\n- A passed item without evidence counts as **not run**.\n- Any failed mandatory item → **NOT ACCEPTABLE (failed)**; any open one → **NOT ACCEPTABLE (open)**.\n:::\n\nRun it with your AI assistant: \`voltox_self_assessment_get kind=${kind}\` → \`voltox_self_assessment_evaluate\`.\n\n`;
  if (c.characteristics?.length) body += `## Integration characteristics\n\n${c.characteristics.map((x) => `- ${esc(x)}`).join("\n")}\n\n`;
  body += `## Requirements\n\n`;
  for (const [g, items] of Object.entries(groups)) {
    body += `### ${g}\n\n| ID | Requirement | Obl.${lvl} |\n|---|---|---|---|\n`;
    body += items.map((r) => `| ${r.id} | **${esc(r.title)}** — ${esc(r.text)}${r.guidance ? `<br/><small>${esc(r.guidance)}</small>` : ""} | ${badge(r.obligation)} | ${col(r)} |`).join("\n") + "\n\n";
  }
  body += `## Tests\n\n| ID | Test | Expected | Obl.${lvl} |\n|---|---|---|---|---|\n`;
  body += c.tests.map((t) => `| ${t.id} | **${esc(t.title)}**${t.pre ? `<br/><small>Pre: ${esc(t.pre)}</small>` : ""}<br/>${esc(t.steps)} | ${esc(t.expected)} | ${badge(t.obligation)} | ${col(t)} |`).join("\n") + "\n";
  write(`self-assessment/${kind}.md`, { title: kind === "api" ? "API, cloud & e-commerce" : "Terminal & unattended", description: c.title, sidebar: { order: i + 1 } }, body);
}

// 4. llms.txt (index) and llms-full.txt (all docs + skills)
const order = (d) => ["Start", "Products", "SDKs", "Guides", "Reference"].indexOf(d.meta.section) * 100 + Number(d.meta.order ?? 99);
const sorted = [...docs].sort((a, b) => order(a) - order(b));
const abs = (u) => SITE_URL.replace(/\/$/, "") + u;
writeFileSync(join(site, "public", "llms.txt"), `# Voltox Developer Documentation

> Integrate Voltox Age Verification, Smile & Pay, Face Recognition and KYC with wallee terminals, SoftPOS and e-commerce, built along ep2. AI assistants: connect the Voltox AI Dev MCP server at ${MCP_URL} for docs, guardrails, code, review and self-assessments.

## Docs
${sorted.map((d) => `- [${d.meta.title}](${abs(docUrl(d.slug))}): ${d.meta.summary ?? ""}`).join("\n")}

## Guardrails (AI skills)
${skills.map((s) => `- [${skillTitle[s]}](${abs(`${BASE}guardrails/${s}/`)})`).join("\n")}

## Self-assessment
- [Terminal & unattended](${abs(`${BASE}self-assessment/terminal/`)})
- [API, cloud & e-commerce](${abs(`${BASE}self-assessment/api/`)})

## Optional
- [Full text](${abs(`${BASE}llms-full.txt`)})
`);
writeFileSync(join(site, "public", "llms-full.txt"), sorted.map((d) => `# ${d.meta.title}\nURL: ${abs(docUrl(d.slug))}\n\n${stripH1(d.body).trim()}\n`).join("\n\n") + "\n\n" +
  skills.map((s) => `# Skill: ${s}\n\n${fm(readFileSync(join(src, "skills", s, "SKILL.md"), "utf8")).body.trim()}\n`).join("\n\n"));
console.log(`site content: ${docs.length} docs, ${skills.length} guardrails, 2 catalogues, llms.txt`);
