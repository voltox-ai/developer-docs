// Input/output guard: refuses secrets, card numbers and image payloads (boundaries G5, G6).

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(client[_-]?secret|authentication[_-]?key|api[_-]?key|secret[_-]?key|password)\s*[:=]\s*["']?[A-Za-z0-9+/=_\-]{16,}/i, "credential assignment"],
  [/\bAKIA[0-9A-Z]{16}\b/, "cloud access key"],
  [/data:image\/(png|jpe?g|webp);base64,/i, "embedded image"],
];

function luhn(digits: string): boolean {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

const TEST_PANS = new Set(["4111111111111111", "4242424242424242", "5555555555554444", "5454545454545454", "4000000000000002"]);

export function findPan(text: string): string | null {
  const re = /\b(?:\d[ -]?){13,19}\b/g;
  for (const m of text.matchAll(re)) {
    const d = m[0].replace(/[ -]/g, "");
    if (d.length >= 13 && d.length <= 19 && luhn(d) && !TEST_PANS.has(d) && !/^(\d)\1+$/.test(d)) return d.slice(0, 6) + "…" + d.slice(-4);
  }
  return null;
}

export interface GuardResult { ok: boolean; reason?: string }

const MAX_GUARD_INPUT = 400_000;
const JWT_TOKEN = /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;
// linear: split into candidate tokens first, then test each anchored (no quadratic backtracking)
const hasJwt = (t: string) => t.split(/[^A-Za-z0-9_.-]+/).some((w) => w.startsWith("eyJ") && JWT_TOKEN.test(w));

export function guardInput(value: unknown): GuardResult {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  if (text.length > MAX_GUARD_INPUT) return { ok: false, reason: "Input too large." };
  if (hasJwt(text)) return { ok: false, reason: "Input looks like it contains a JWT/bearer token. Never paste secrets, tokens or images into the chat; credentials are configured through the OAuth login or local settings." };
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) return { ok: false, reason: `Input looks like it contains a ${label}. Never paste secrets, tokens or images into the chat; credentials are configured through the OAuth login or local settings.` };
  const pan = findPan(text);
  if (pan) return { ok: false, reason: `Input contains a number that looks like a real card number (${pan}). Card numbers must never be shared; use public test cards only.` };
  return { ok: true };
}
