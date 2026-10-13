// BestPracticeKey: proof that a skill was read before a write tool is used.
// Rotates every hour, deterministic per skill and hour, NOT a secret (as in the ha-mcp pattern).
const WORDS = [
  "amber", "basalt", "cobalt", "delta", "ember", "fjord", "glacier", "harbor", "indigo", "juniper",
  "kestrel", "lagoon", "meadow", "nimbus", "orbit", "prairie", "quartz", "ridge", "summit", "tundra",
  "umber", "vertex", "willow", "xenon", "yarrow", "zephyr", "alpine", "beacon", "cedar", "dune",
];

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function hourStamp(date: Date): string {
  return date.toISOString().slice(0, 13).replace(/[-T]/g, ""); // YYYYMMDDHH (UTC)
}

export function bestPracticeKey(skill: string, date = new Date()): string {
  const stamp = hourStamp(date);
  const h = fnv1a(`${skill}|${stamp}`);
  return `vx-${WORDS[h % WORDS.length]}-${WORDS[(h >>> 8) % WORDS.length]}-${stamp}`;
}

/** Accepts the key of the current or the previous hour. */
export function verifyBestPracticeKey(skill: string, key: string | undefined, now = new Date()): boolean {
  if (!key) return false;
  const prev = new Date(now.getTime() - 3600_000);
  return key === bestPracticeKey(skill, now) || key === bestPracticeKey(skill, prev);
}
