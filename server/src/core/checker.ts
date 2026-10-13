// Automatic best-practice checker: returns best_practice_warnings with references.

export interface Warning { rule: string; severity: "block" | "warn" | "info"; message: string; fix: string; reference: string; line?: number }

interface Rule {
  id: string; severity: Warning["severity"]; test: (text: string) => Array<{ line?: number; detail?: string }>;
  message: string; fix: string; reference: string;
}

function lineHits(re: RegExp): Rule["test"] {
  return (text) => {
    const hits: Array<{ line?: number }> = [];
    text.split("\n").forEach((l, i) => { if (re.test(l)) hits.push({ line: i + 1 }); });
    return hits;
  };
}
const whole = (pred: (t: string) => boolean): Rule["test"] => (t) => (pred(t) ? [{}] : []);

const RULES: Rule[] = [
  { id: "AV-DEFAULT-TRUE", severity: "block", test: lineHits(/(getBooleanExtra\(\s*["']isVerified["']\s*,\s*true\s*\)|isVerified\s*(\?:|\?\?|\|\||\bor\b|,\s*default\s*=?)\s*true|isVerified["']?\s*\]?\s*\?\?\s*true|getOrDefault\(\s*["']isVerified["']\s*,\s*true)/), message: "isVerified defaults to true — a crash or cancel would approve the sale.", fix: "Use getBooleanExtra(\"isVerified\", false) == true and require RESULT_OK.", reference: "skill://voltox/voltox-age-verification › Anti-patterns" },
  { id: "AV-REASON-DECISION", severity: "block", test: lineHits(/\breason\b[^\n]{0,20}(===?|\.equals|\.contains|\.startsWith|\.includes|\.matches)\s*\(?\s*["']/i), message: "Decision based on the localised reason text.", fix: "Decide on isVerified only; use reason for logs.", reference: "skill://voltox/voltox-age-verification/references/sdk-android.md › Result contract" },
  { id: "AV-COMPLETED-PHONE", severity: "block", test: lineHits(/["']Completed["'][^\n]{0,60}(approve|isVerified|allow|unlock|deliver|dispense|release|vend)/i), message: "'Completed' on the customer's phone is treated as approval.", fix: "Wait for the SDK/API result on the originating device.", reference: "skill://voltox/voltox-age-verification › Anti-patterns" },
  { id: "AV-REQUIRED-AGE-ZERO", severity: "block", test: lineHits(/requiredAge\s*[:=]\s*(0|-\d+)\b/), message: "requiredAge must be a positive integer.", fix: "Set the legal threshold per product (16, 18, 21…) or skip the flow for unrestricted goods.", reference: "skill://voltox/voltox-age-verification/references/sdk-android.md › requiredAge validation" },
  { id: "DEV-MODE", severity: "block", test: lineHits(/developerMode(Enabled)?["']?\s*(=|:|to)\s*true/), message: "Developer mode enabled.", fix: "Set developerModeEnabled / developerMode to false for production builds (use a build flag).", reference: "VX-05" },
  { id: "SECRET-HARDCODED", severity: "block", test: lineHits(/(clientSecret|client_secret|authenticationKey|authentication_key|apiKey|api_key|secretKey)\s*[:=]\s*["'][A-Za-z0-9+/=_\-]{12,}["']/i), message: "Credential hard-coded in source.", fix: "Load from secure configuration/vault at runtime; rotate the exposed secret now.", reference: "skill://voltox/integration-security › Decision workflow 4" },
  { id: "SECRET-LOGGED", severity: "block", test: lineHits(/(Log\.[a-z]\(|println|console\.(log|info|debug)|logger\.\w+\(|print\(|_logger\.\w+\()[^\n]{0,100}(clientSecret|client_secret|authenticationKey|secret|Authorization)/i), message: "A secret or Authorization header may be logged.", fix: "Never log credentials; use redacting structured logging.", reference: "API-OBS-01" },
  { id: "TLS-DISABLED", severity: "block", test: lineHits(/(verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|[Tt]rust[Aa]ll|ALLOW_ALL_HOSTNAME_VERIFIER|setHostnameVerifier\s*\(\s*\{?[^\n]{0,30}true|checkServerTrusted\s*\([^)]*\)\s*\{\s*\}|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|ServerCertificateValidationCallback[^\n]*=>\s*true|hostnameVerifier\s*=?\s*\{\s*_\s*,\s*_\s*->\s*true|verify_ssl\s*=\s*False|ssl\s*=\s*False)/), message: "TLS certificate validation disabled.", fix: "Always validate certificates; fix the trust store instead.", reference: "API-TLS-01" },
  { id: "PLAIN-HTTP", severity: "warn", test: lineHits(/["']http:\/\/(?!localhost|127\.0\.0\.1|10\.|192\.168\.|schemas\.android\.com|www\.w3\.org|schemas\.)/), message: "Plain HTTP URL.", fix: "Use HTTPS (LTI on a protected LAN segment is the only local exception).", reference: "API-TLS-01" },
  { id: "WALLEE-V1", severity: "block", test: lineHits(/app-wallee\.com\/api\/(?!v2\.0|client)[a-z]/i), message: "wallee API path without /api/v2.0 (v1 is deprecated).", fix: "Use https://app-wallee.com/api/v2.0/…", reference: "skill://voltox/wallee-ecommerce › Decision workflow 1" },
  { id: "WALLEE-MAC-AUTH", severity: "warn", test: lineHits(/x-mac-(userid|value|version|timestamp)/i), message: "Legacy MAC header authentication.", fix: "Use the per-request JWT (Authorization: Bearer) of API v2.0.", reference: "API-AUTH-01" },
  { id: "PAN-TOKEN-DEPRECATED", severity: "warn", test: lineHits(/generatePanToken/), message: "generatePanToken is deprecated.", fix: "Use PanHash / panHashVariants (ep2-hmac.v8-3.s1 on ep2 v8 terminals).", reference: "skill://voltox/surrogate-pan" },
  { id: "SURROGATE-AS-CREDENTIAL", severity: "block", test: lineHits(/(surrogate|panHash|panToken|SurrogatePAN)[^\n]{0,60}(charge|refund|capture|chargeFlow|\btoken\s*[:=]|tokenId)/i), message: "Surrogate PAN used like a payment credential.", fix: "Charge wallee tokens; use surrogate PAN only to recognise a card.", reference: "SUR-03" },
  { id: "DEFERRED-ON", severity: "block", test: lineHits(/deferred[A-Za-z]*["']?\s*(=|:)\s*(true|1|["']on["'])/i), message: "Deferred/offline authorisation enabled.", fix: "Keep online authorisation; deferred only with written wallee approval.", reference: "R-080" },
  { id: "SP-MIN-AMOUNT", severity: "block", test: (t) => [...t.matchAll(/amountMinorUnits["']?\s*(?:to|:|=)\s*(\d+)/g)].filter((m) => Number(m[1]) < 500).map((m) => ({ detail: m[1] })), message: "Smile & Pay amount below the 5.00 minimum.", fix: "amountMinorUnits ≥ 500; offer another payment method for smaller amounts.", reference: "skill://voltox/voltox-smile-and-pay › Decision workflow 1" },
  { id: "MANUAL-PAN", severity: "block", test: lineHits(/(cardNumber|card_number|\bpan\b)\s*[:=]\s*["']?\d{12,}/i), message: "Card number handled in your code.", fix: "Use wallee payment page/iframe or certified terminals; never touch PAN.", reference: "API-DATA-01" },
  { id: "WEBHOOK-NO-VERIFY", severity: "warn", test: whole((t) => /webhook/i.test(t) && /(post|router|app\.|@Post|HttpPost|route)/i.test(t) && !/(x-signature|isContentValid|verifySignature|SHA256withECDSA|verify\()/i.test(t)), message: "Webhook handler without visible signature verification.", fix: "Verify x-signature (SHA256withECDSA, key by keyId) with the wallee SDK, then read the entity by entityId.", reference: "API-WH-01" },
  { id: "CTI-NO-543", severity: "warn", test: whole((t) => /performTransaction|perform-transaction/i.test(t) && !/543/.test(t)), message: "Cloud Till long polling without HTTP 543 handling.", fix: "On 543 call again with the same parameters (bounded retries).", reference: "skill://voltox/wallee-terminal-ep2/references/interfaces.md › CTI" },
  { id: "LTI-NO-REFERENCE", severity: "warn", test: whole((t) => /financialTrxRequest/i.test(t) && !/merchantReference/i.test(t)), message: "LTI payment request without merchantReference.", fix: "Send a unique merchantReference and detect duplicates.", reference: "R-083" },
  { id: "RETRY-PAYMENT", severity: "warn", test: lineHits(/(retry|withRetry|backoff)[^\n]{0,60}(createTransaction|transactions\/?create|charge|purchase)/i), message: "Automatic retry around a payment-creating call.", fix: "Read the state first; retry only idempotent operations.", reference: "API-ERR-02" },
];

export function review(text: string): Warning[] {
  const out: Warning[] = [];
  for (const r of RULES) for (const h of r.test(text)) out.push({ rule: r.id, severity: r.severity, message: r.message + (h.detail ? ` (value ${h.detail})` : ""), fix: r.fix, reference: r.reference, line: h.line });
  return out;
}

export const RULE_IDS = RULES.map((r) => r.id);
