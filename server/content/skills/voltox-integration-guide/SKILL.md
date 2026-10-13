---
name: voltox-integration-guide
description: Entry point for every Voltox integration. Use when someone wants to integrate, design, build, review, test or certify a solution with Voltox Age Verification, Smile & Pay, Face Recognition or KYC on wallee terminals, wallee SoftPOS or wallee e-commerce, or asks which SDK, API, interface or language to use.
---

# Voltox integration guide (entry skill)

**TRIGGER WHEN:** a user plans, writes, reviews or tests code or configuration that uses any Voltox product, or connects a Voltox flow to payments (wallee terminal, wallee SoftPOS, wallee e-commerce, Stripe), vending machines, kiosks or POS systems.

**SYMPTOMS:** mentions of `VoltoxAgeVerification`, `smile_and_pay`, `ai.voltox.*`, `dashboard.voltox.ai`, `backend.voltox.ai`, "age check", "pay by face", "Smile & Pay", "surrogate PAN", "ep2", "LTI", "Till SDK", "vending", "MDB", "kiosk", "SoftPOS", "card on file", "token"; questions such as "how do I integrate Voltox", "which SDK", "is this secure", "how do we pass ep2 acceptance".

## Non-negotiable rules (apply to every product and channel)

1. **Fail closed.** Only an explicit success (`isVerified == true`, `onPaid`, an approved wallee transaction) unlocks a product or completes an order. Missing, cancelled, late, malformed or unknown results are denials.
2. **One product, one skill.** Age Verification, Smile & Pay, Face Recognition and KYC are separate products with separate contracts, results and rules. Never reuse the result of one product as the result of another (a Smile & Pay face match is not an age verification; an age verification is not a KYC).
3. **Payments run on wallee.** Card acceptance on terminals, SoftPOS and e-commerce is designed with wallee and certified ep2 terminals. Voltox decides *who* and *how old*; wallee and the acquirer decide *paid*.
4. **No card data, no secrets in the wrong place.** Never store or log a PAN, never put a Client Secret, wallee authentication key or OAuth token in chat, source control, client-side code or logs.
5. **Surrogate PAN is an identifier, not money.** Use ep2 surrogate PANs to recognise a card; never try to charge one.
6. **Speed is a requirement, not a nice-to-have.** Every design is checked against the performance budget in [references/performance-budget.md](references/performance-budget.md).
7. **Read before you write.** Before any write tool of the Voltox AI Dev server, read the matching skill and pass its current `BestPracticeKey` (returned by `voltox_get_skill_guide`).

## Decision workflow

Answer these in order. If the user hasn't said, **ask** — don't guess. The tool `voltox_plan_integration` asks the same questions and returns the blueprint.

1. **Product(s):** Age Verification · Smile & Pay · Face Recognition · KYC. → load the product skill(s).
2. **Channel:** wallee terminal (attended POS) · wallee terminal in a machine (unattended: vending, kiosk, EV, self-checkout) · wallee SoftPOS (phone/tablet) · e-commerce/web · app.
3. **Method:** Voltox Android SDK · Voltox Flutter SDK · Voltox web iframe · Voltox S2S QR API · wallee Android Till SDK (ATI) · wallee Local Till Interface (LTI) · wallee Cloud Till Interface (CTI) · wallee Web Service API v2.0 (payment page, iframe, tokens).
4. **Language/stack:** Kotlin · Java · Dart/Flutter · TypeScript/Node · C#/.NET · Python · Go · other.
5. **Security level:** see [integration-security](../integration-security/SKILL.md) — L1 Pilot, L2 Production, L3 Regulated/high-volume. Default **L2**.
6. **Market and scheme rules:** country, currencies, ep2 market (CH/LI, DE/AT girocard via ep2), age thresholds (16/18/21), PSD2/SCA.
7. **Card recognition needed?** If yes → [surrogate-pan](../surrogate-pan/SKILL.md).
8. **Unattended?** If yes → [vending-mdb-uvm](../vending-mdb-uvm/SKILL.md).
9. **Acceptance:** run [integration-self-assessment](../integration-self-assessment/SKILL.md) before any pilot.

## Routing table

| Situation | Skills to read |
|---|---|
| Age-restricted sale at an attended wallee terminal | voltox-age-verification, wallee-terminal-ep2, integration-security |
| Age-restricted vending machine | voltox-age-verification, vending-mdb-uvm, wallee-terminal-ep2, surrogate-pan |
| Pay by face at a kiosk/POS | voltox-smile-and-pay, wallee-terminal-ep2 or wallee-softpos, surrogate-pan, integration-security |
| Pay by face online | voltox-smile-and-pay, wallee-ecommerce, integration-security |
| Age check in a web shop | voltox-age-verification, wallee-ecommerce |
| Phone as terminal (tap on phone) | wallee-softpos + product skill |
| Identity onboarding | voltox-kyc |
| Any acceptance / certification question | integration-self-assessment |

## Anti-patterns (global)

| Wrong | Right | Why | Reference |
|---|---|---|---|
| `val ok = result.data?.getBooleanExtra("isVerified", true)` | default `false`, then `== true` | Default-true turns every crash into an approval | voltox-age-verification › result contract |
| Treat "Completed" on the customer's phone as approval | Wait for the SDK/API result on the originating device | The phone step is not the decision | voltox-age-verification › QR flow |
| Charge a surrogate PAN | Use a wallee token for payments, surrogate PAN only to recognise | Surrogate PAN is irreversible by design | surrogate-pan |
| Use one face match for age **and** payment **and** KYC | Run each product with its own result | Different products, different legal meaning | this skill, rule 2 |
| Hard-code Client Secret / wallee key in the app | Secure configuration / vault, rotation | Leaked secrets compromise every merchant device | integration-security |
| Release the product, then try to pay | Reserve/authorise → deliver → complete with effective amount | No product without payment, no payment without product | vending-mdb-uvm |
| Retry a payment without an idempotency/unique reference | Unique reference per payment, recover before retry | Double charges | wallee-terminal-ep2, wallee-ecommerce |
| Enable deferred/offline authorisation to "be faster" | Online authorisation; deferred only with written wallee approval | Declined deferred transactions are the merchant's loss | wallee-terminal-ep2 |

## References

- [references/architecture-patterns.md](references/architecture-patterns.md) — reference architectures per channel (terminal, unattended, SoftPOS, e-commerce, omnichannel) with sequence diagrams.
- [references/performance-budget.md](references/performance-budget.md) — speed targets and how to hit them.
- [references/boundaries.md](references/boundaries.md) — what this toolset will and will not do (good and bad boundaries).
- [references/glossary.md](references/glossary.md) — terms introduced by this toolset (L1–L3, BestPracticeKey, blueprint, gates).
