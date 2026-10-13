// Builds the Claude plugin (Claude Code / Claude Desktop / claude.ai) into dist/plugin/voltox-ai-dev.
// The plugin connects to the REMOTE server (OAuth, no secrets stored in Claude config) and ships the
// same best-practice skills, so they also work offline inside Claude Code.
// Usage: node scripts/package-plugin.mjs --url https://mcp.voltox.ai/mcp
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const url = arg("--url") ?? process.env.MCP_PUBLIC_URL;
if (!url || !/^https:\/\/[^/]+\/mcp$/.test(url)) { console.error("Pass --url https://<host>/mcp (https, path /mcp)."); process.exit(1); }
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const out = process.env.PLUGIN_OUT ?? join(root, "..", "plugins", "voltox-ai-dev");
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, ".claude-plugin"), { recursive: true });

const site = arg("--site") ?? "https://developers.voltox.ai";
writeFileSync(join(out, ".claude-plugin", "plugin.json"), JSON.stringify({
  name: "voltox-ai-dev",
  displayName: "Voltox AI Dev",
  version: pkg.version,
  description: "Build Voltox Age Verification, Smile & Pay, Face Recognition and KYC integrations on wallee terminals, SoftPOS and e-commerce — docs, guardrails, secure code, automatic review and ep2-grade self-assessments.",
  author: { name: "Voltox", url: "https://voltox.ai" },
  homepage: site,
  repository: arg("--repo") ?? "https://github.com/voltox-ai/developer-docs",
  license: arg("--license") ?? "Apache-2.0",
  keywords: ["voltox", "wallee", "ep2", "age-verification", "payments", "softpos", "vending", "mcp"],
  icon: "./assets/icon.svg",
  documentationUrl: `${site}/ai/`,
  supportUrl: `${site}/support/`,
  privacyPolicyUrl: `${site}/privacy/`,
}, null, 2) + "\n");

writeFileSync(join(out, ".mcp.json"), JSON.stringify({ mcpServers: { "voltox-ai-dev": { type: "http", url } } }, null, 2) + "\n");

// skills: content/skills/<name>/{SKILL.md,references/*.md}
const skillsSrc = join(root, "content", "skills");
for (const name of readdirSync(skillsSrc)) cpSync(join(skillsSrc, name), join(out, "skills", name), { recursive: true });

mkdirSync(join(out, "assets"), { recursive: true });
cpSync(join(root, "plugin-src", "icon.svg"), join(out, "assets", "icon.svg"));
for (const f of ["README.md", "PRIVACY.md", "LICENSE"]) cpSync(join(root, "plugin-src", f), join(out, f));

// checks: size < 256 KiB per file, no binaries, README length
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let total = 0;
for (const f of walk(out)) {
  const s = statSync(f).size; total += s;
  if (s >= 256 * 1024) throw new Error(`file too large: ${f}`);
  if (!/\.(md|json|svg)$/.test(f) && !f.endsWith("LICENSE")) throw new Error(`unexpected file type: ${f}`);
  if (/\.(md|json)$/.test(f) && /\u0000/.test(readFileSync(f, "utf8"))) throw new Error(`binary content: ${f}`);
}
const words = readFileSync(join(out, "README.md"), "utf8").split(/\s+/).length;
if (words < 40) throw new Error("README must have at least 40 words");
console.log(`plugin: ${out}\n  files ${walk(out).length}, ${(total / 1024).toFixed(0)} KiB, README ${words} words, server ${url}`);
