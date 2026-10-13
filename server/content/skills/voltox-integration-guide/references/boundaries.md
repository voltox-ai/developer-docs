# Boundaries

Boundaries are the limits this toolset (skills + Voltox AI Dev MCP server) enforces, and the limits it deliberately does **not** set. Good boundaries protect people, money and data without blocking legitimate work. Bad boundaries either fail to protect or push developers to work around the toolset.

## Good boundaries (enforced)

| # | Boundary | How it is enforced |
|---|---|---|
| G1 | **Read-only by default.** Documentation, planning, code generation and review tools never change anything. | Tool annotation `readOnlyHint: true`; no network calls except documentation |
| G2 | **Read before write.** Every tool that changes state requires the current `BestPracticeKey` of the matching skill. | Server rejects calls without a valid key (rotates hourly) |
| G3 | **Sandbox first.** Live API calls default to the test environment. Production writes are disabled unless the server operator enables them and the user confirms each call. | `ALLOW_PRODUCTION_WRITES=false` by default; `confirm: true` required |
| G4 | **No autonomous payments.** The server never initiates a charge, refund or capture on its own; a human confirms each money-moving call. | `destructiveHint: true`, explicit confirmation |
| G5 | **No secrets through the chat.** The server refuses inputs that look like secrets (client secrets, private keys, JWT signing keys, card numbers). Credentials only arrive through the OAuth login or local configuration. | Input scanner; Luhn check for PAN-like numbers |
| G6 | **No card data, no biometrics.** The server never accepts, returns or stores PANs, CVCs, face images or document images. | Input/output scanner |
| G7 | **Fail closed everywhere.** Generated code and reviews always treat unknown results as denials. | Code templates + automatic checker |
| G8 | **Facts, not promises.** Statements about wallee, ep2 or Voltox features are marked *Available* or *Confirm with wallee/Voltox*. The server never claims a certification. | Content rule |
| G9 | **Least privilege.** OAuth scopes per access level (`voltox.docs`, `voltox.api.read`, `voltox.api.write`), chosen by the user on the consent page; access tokens live 15 minutes, refresh tokens rotate. | OAuth 2.1 server configuration |
| G10 | **Auditability without personal data.** Operational logs hold at most endpoint, time, status and duration — no prompts, code, credentials or identifiers of end customers. | Logging policy |

## Bad boundaries (deliberately not set, and why)

| # | Tempting boundary | Why it is harmful | What we do instead |
|---|---|---|---|
| B1 | Block all write operations | Developers bypass the toolset and call APIs unguided | Gate writes with G2–G4 |
| B2 | "Always be secure" without tests | Not verifiable, everyone passes | Hard self-assessment with mandatory items and evidence |
| B3 | Trust the AI to follow rules | Models forget or are prompted around rules | Machine-enforced key + automatic checker |
| B4 | Hide error details completely | Developers cannot fix problems | Precise error codes and references, never secrets or personal data |
| B5 | Freeze the rules | Rules drift away from SDK and API versions | Versioned skills, changelog, review on every SDK release |
| B6 | Claim "ep2 certified" for an integration | The toolset cannot certify; certification is done by the bodies and wallee acceptance | The self-assessment prepares; wallee and the certification bodies decide |
| B7 | One generic "Voltox" skill | Product rules get mixed (age vs. payment vs. KYC) | One skill per product, one per channel |
| B8 | Blocking innovation | Over-restriction kills good ideas (e.g. tap-first, parallel reservation) | Allow innovative patterns with explicit safety conditions |

## Out of scope

- Legal advice. Age-verification law, data-protection law and scheme rules are referenced, not interpreted for a specific case.
- Certification decisions (ep2, PCI, KJM, vending approval).
- Commercial terms and pricing.
