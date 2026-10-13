// Integration assistant: asks for language, type, method and security, then builds a blueprint.

export interface PlanInput {
  products?: string[];            // age-verification | smile-and-pay | face-recognition | kyc
  channel?: string;               // terminal-attended | terminal-unattended | softpos | ecommerce | app | backend
  method?: string;                // voltox-android-sdk | voltox-flutter-sdk | voltox-web-iframe | voltox-s2s-qr | wallee-ati | wallee-lti | wallee-cti | wallee-api-v2 | mdb
  language?: string;              // kotlin | java | dart | typescript | csharp | python | go | other
  securityLevel?: "L1" | "L2" | "L3";
  environment?: "test" | "live";
  country?: string;
  cardRecognition?: boolean;
  ageThresholds?: number[];
  currency?: string;
}

const OPTIONS = {
  products: ["age-verification", "smile-and-pay", "face-recognition", "kyc"],
  channel: ["terminal-attended", "terminal-unattended", "softpos", "ecommerce", "app", "backend"],
  method: ["voltox-android-sdk", "voltox-flutter-sdk", "voltox-web-iframe", "voltox-s2s-qr", "wallee-ati", "wallee-lti", "wallee-cti", "wallee-api-v2", "mdb"],
  language: ["kotlin", "java", "dart", "typescript", "csharp", "python", "go", "other"],
  securityLevel: ["L1", "L2", "L3"],
};

export function missingQuestions(p: PlanInput) {
  const q: Array<{ field: string; question: string; options?: string[]; why: string }> = [];
  if (!p.products?.length) q.push({ field: "products", question: "Which Voltox product(s) do you integrate?", options: OPTIONS.products, why: "Each product has its own rules and result contract." });
  if (!p.channel) q.push({ field: "channel", question: "Where does the customer interact (integration type)?", options: OPTIONS.channel, why: "Decides wallee interface, ep2 acceptance path and performance budget." });
  if (!p.language) q.push({ field: "language", question: "Which programming language / stack do you build with?", options: OPTIONS.language, why: "Code skeletons are generated for your stack." });
  if (!p.securityLevel) q.push({ field: "securityLevel", question: "Which security level applies? L1 Pilot (test only), L2 Production (live merchants, default), L3 Regulated/high volume (FAPI 2.0-grade).", options: OPTIONS.securityLevel, why: "Selects mandatory controls in the self-assessment." });
  if (p.cardRecognition === undefined && p.channel && p.channel !== "backend") q.push({ field: "cardRecognition", question: "Do you need to recognise returning cards (e.g. 'age verified once per card', loyalty, deny list)? Recommended: yes — via ep2 surrogate PAN.", options: ["true", "false"], why: "Enables the surrogate PAN design." });
  if (p.products?.includes("age-verification") && !p.ageThresholds?.length) q.push({ field: "ageThresholds", question: "Which legal age thresholds apply to your products (e.g. 16, 18, 21)?", why: "requiredAge per product and boundary tests." });
  return q;
}

function defaultMethod(p: PlanInput): string[] {
  const m: string[] = [];
  const prods = p.products ?? [];
  switch (p.channel) {
    case "terminal-attended":
      if (prods.some((x) => x !== "kyc")) m.push("voltox-android-sdk");
      m.push(p.language === "kotlin" || p.language === "java" ? "wallee-ati" : "wallee-lti");
      break;
    case "terminal-unattended":
      m.push("voltox-android-sdk (deviceType = VendingMachine) or voltox-s2s-qr", "wallee-lti", "mdb (if VMC uses MDB)");
      break;
    case "softpos":
      m.push(p.language === "dart" ? "voltox-flutter-sdk" : "voltox-android-sdk", "wallee SoftPOS (confirm integration path with wallee)");
      break;
    case "ecommerce": case "app":
      m.push("voltox-web-iframe or voltox-s2s-qr", "wallee-api-v2 (payment page / iframe, tokens, webhooks)");
      break;
    case "backend":
      m.push("wallee-api-v2", "voltox-s2s-qr (session create + verdict)");
      break;
  }
  return m;
}

function pattern(p: PlanInput): string {
  const sp = p.products?.includes("smile-and-pay");
  if (p.channel === "terminal-unattended") return "P2 · Unattended vending with age gate";
  if (p.channel === "softpos") return "P4 · SoftPOS";
  if (p.channel === "ecommerce" || p.channel === "app") return sp ? "P5 + P3 · E-commerce with Smile & Pay on wallee tokens" : "P5 · E-commerce";
  if (sp) return "P3 · Smile & Pay at a kiosk/POS, payments on wallee (ep2 BUC 40)";
  return "P1 · Attended POS, age-restricted sale";
}

export function blueprint(p: PlanInput) {
  const level = p.securityLevel ?? "L2";
  const prods = p.products ?? [];
  const skills = new Set<string>(["voltox-integration-guide", "integration-security", "integration-self-assessment"]);
  for (const x of prods) skills.add(x === "age-verification" ? "voltox-age-verification" : x === "smile-and-pay" ? "voltox-smile-and-pay" : x === "face-recognition" ? "voltox-face-recognition" : "voltox-kyc");
  if (p.channel?.startsWith("terminal")) skills.add("wallee-terminal-ep2");
  if (p.channel === "terminal-unattended") skills.add("vending-mdb-uvm");
  if (p.channel === "softpos") skills.add("wallee-softpos");
  if (p.channel === "ecommerce" || p.channel === "app" || p.channel === "backend" || prods.includes("smile-and-pay")) skills.add("wallee-ecommerce");
  if (p.cardRecognition) skills.add("surrogate-pan");

  const auth = [
    "Device/app → your backend: OAuth 2.1 (Authorization Code + PKCE for people; client credentials for machines" + (level === "L3" ? " with private_key_jwt or mTLS, DPoP-bound tokens, PAR" : "") + "). Access tokens ≤ 15 min.",
    "Your backend → wallee API v2.0: fresh JWT per request (HS256; sub, iat, requestPath, requestMethod), application-user key in vault/KMS.",
    "Voltox credentials: Client ID in app config; Client Secret only via secure configuration (Android) or server side; never in web pages.",
    "AI tools/MCP: OAuth with audience-bound tokens, read-only by default, human confirmation for writes.",
  ];

  const gates = [
    prods.includes("age-verification") ? "Age gate: RESULT_OK && isVerified == true, else deny (fail closed)." : null,
    "Payment gate: approved wallee transaction / onPaid only.",
    p.channel === "terminal-unattended" ? "Delivery gate: reservation → dispense → complete with effective amount; reverse on vend failure; deliver after card removal." : "Fulfilment exactly once per payment reference.",
  ].filter(Boolean);

  const timeouts = [
    "Terminal flows: ECR/VM timeout > terminal maximum transaction time (card read + PIN + host).",
    "CTI: long poll ~80 s; on HTTP 543 call again with the same parameters (bounded).",
    "Server calls: connect 3 s, read 10–30 s (payment), retries only for idempotent reads, exponential backoff with jitter.",
    "Voltox: face-scan/NFC/QR windows 60 s (fixed); inactivity timeout per deployment (0 = off).",
  ];

  const surrogate = p.cardRecognition ? [
    "Request panHashVariants with the payment (ep2-hmac.v8-3.s1 on ep2 v8 terminals; wallee.v1-0.s1 only for migration).",
    "Agree the surrogate domain (key set + DOL) with wallee; decide whether expiry date is part of the DOL (card replacement behaviour).",
    "Store surrogate value + purpose attributes (e.g. ageVerifiedUntil) separately from biometric data; never charge it.",
  ] : ["Not requested. Consider it for 'tap first' recognition in unattended flows."];

  const confirmations = [
    prods.includes("smile-and-pay") ? "wallee: terminal-to-token transfer for stored credentials and CIT flagging (ep2 BUC 40)." : null,
    p.channel === "softpos" ? "wallee: SoftPOS integration path and certification status for your market." : null,
    p.cardRecognition ? "wallee: surrogate domain configuration (service center)." : null,
    "Voltox: official API reference (OpenAPI) for any server-side Voltox calls.",
  ].filter(Boolean);

  const codeTargets = [
    prods.includes("age-verification") && (p.language === "kotlin" || p.language === "java") ? "android-age-gate" : null,
    prods.includes("smile-and-pay") && (p.language === "kotlin" || p.language === "java") ? "android-smile-and-pay" : null,
    prods.includes("smile-and-pay") && p.language === "dart" ? "flutter-smile-and-pay" : null,
    ["ecommerce", "app", "backend"].includes(p.channel ?? "") || prods.includes("smile-and-pay") ? "wallee-jwt" : null,
    ["ecommerce", "app", "backend"].includes(p.channel ?? "") ? "wallee-webhook" : null,
    p.channel?.startsWith("terminal") && !(p.language === "kotlin" || p.language === "java") ? "lti-client" : null,
    "idempotent-fulfilment",
  ].filter(Boolean);

  return {
    pattern: pattern(p),
    securityLevel: level,
    environment: p.environment ?? "test",
    methods: p.method ? [p.method] : defaultMethod(p),
    skillsToRead: [...skills],
    gates, auth, timeouts, surrogatePan: surrogate,
    performanceBudget: "See skill://voltox/voltox-integration-guide/references/performance-budget.md (face→decision ≤ 3 s, face→onPaid ≤ 5 s, card tap→result ≤ 3 s, server call ≤ 800 ms, p95).",
    codeTargets,
    selfAssessment: p.channel?.startsWith("terminal") || p.channel === "softpos" ? ["terminal", "api"] : ["api"],
    confirmBeforeBuild: confirmations,
    nextSteps: [
      "Read every skill in skillsToRead (voltox_get_skill_guide) and keep the BestPracticeKeys.",
      "Generate code skeletons with voltox_generate_code for each codeTarget.",
      "Run voltox_review_integration on your code before every merge.",
      "Run the self-assessment(s) and evaluate with voltox_self_assessment_evaluate before the pilot.",
    ],
  };
}

export const PLAN_OPTIONS = OPTIONS;
