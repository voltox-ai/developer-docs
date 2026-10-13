import { DOCS, SKILLS } from "../generated/content.js";

export interface Section { source: string; uri: string; title: string; heading: string; text: string }

function splitSections(uri: string, source: string, title: string, md: string): Section[] {
  const out: Section[] = [];
  let heading = title;
  let buf: string[] = [];
  const flush = () => { if (buf.join("").trim()) out.push({ source, uri, title, heading, text: buf.join("\n").trim() }); buf = []; };
  for (const line of md.split("\n")) {
    const m = line.match(/^#{1,3}\s+(.*)/);
    if (m) { flush(); heading = m[1].trim(); } else buf.push(line);
  }
  flush();
  return out;
}

let INDEX: Section[] | null = null;
export function index(): Section[] {
  if (INDEX) return INDEX;
  const s: Section[] = [];
  for (const d of DOCS) s.push(...splitSections(`docs://voltox/${d.slug}`, "doc", d.title, d.body));
  for (const k of SKILLS) {
    s.push(...splitSections(`skill://voltox/${k.name}`, "skill", k.name, k.body));
    for (const [f, body] of Object.entries(k.references as Record<string, string>)) s.push(...splitSections(`skill://voltox/${k.name}/references/${f}`, "skill-reference", `${k.name}/${f}`, body));
  }
  INDEX = s;
  return s;
}

const tokenize = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüß+#.\- ]/g, " ").split(/\s+/).filter((w) => w.length > 1);

export function search(query: string, limit = 8, filter?: string): Array<Section & { score: number }> {
  const q = tokenize(query);
  if (!q.length) return [];
  const docs = index().filter((s) => !filter || s.uri.includes(filter));
  const N = docs.length;
  const df = new Map<string, number>();
  const toks = docs.map((d) => tokenize(`${d.heading} ${d.heading} ${d.text}`));
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const avg = toks.reduce((a, t) => a + t.length, 0) / Math.max(N, 1);
  const scored = docs.map((d, i) => {
    const t = toks[i];
    let score = 0;
    for (const w of q) {
      const tf = t.filter((x) => x === w || x.startsWith(w)).length;
      if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
      score += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (t.length / avg))));
    }
    if (d.heading.toLowerCase().includes(query.toLowerCase())) score += 3;
    return { ...d, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
