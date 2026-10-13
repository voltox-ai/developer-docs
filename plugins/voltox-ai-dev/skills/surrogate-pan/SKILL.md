---
name: surrogate-pan
description: Recognise a payment card without storing card data using the ep2 surrogate PAN (HMAC-based, ep2 8.x) and wallee PanHash / panHashVariants, plus the Payment Account Reference (PAR). Use when a solution needs to recognise returning cards, bind an age check or loyalty to a card, run deny lists, or link terminal and online payments of the same card.
---

# Surrogate PAN (card recognition)

**TRIGGER WHEN:** a design needs to know "is this the same card as before?" — returning-customer recognition, "age verified once per card", loyalty, deny lists, transit-style fare capping, linking Smile & Pay enrolment to a card.

**SYMPTOMS:** "PAN hash", "PAN token", "card fingerprint", `panHashVariants`, `PanHash`, `generatePanToken`, `wallee.v1-0.s1`, `ep2-hmac.v8-3.s1`, `SurrogatePANPrim`, "PAR", "recognise card", "tap to identify".

## What it is (ep2 8.3, Security Specification ch. 8.9)
- An **irreversible** value derived from card data, "used by third party systems to uniquely but anonymously identify a cardholder".
- **HMAC-based surrogate PAN** (ch. 8.9.2): two values, *Primary* and *Secondary*, each HMAC-SHA-256 over the card data selected by a **Surrogate DOL**, with keys derived (HKDF, ch. 8.14) from **merchant-specific** keys delivered by the service center. Mandatory for ep2 ≥ 8.0; the older SHA-256 + pepper variant had to be migrated by 31.03.2025.
- The values are sent to the POS/ECR (EI-ECR) and in the submission. In card-present use cases the terminal "may" send them today; ep2 9.0 is expected to make sending mandatory (wallee change list CRN-190).
- The ep2 virtual terminal (e-commerce) "may calculate" the surrogate PAN as well — the basis for recognising the same card online and offline.

## What it is not
- **Not a payment credential.** You cannot charge it, refund it or reverse it. Payments use a wallee token.
- **Not universal.** The value is only equal across terminals that share the same key and DOL (the *surrogate domain*). Different merchants/domains → different values.
- **Not permanent.** If the DOL includes the expiry date or PAN sequence number, a replacement card gives a new value.

## wallee implementation (public LTI documentation)
- `PanHash` request (stand-alone, no payment) or `panHashVariants` on `FinancialTrx` (with a payment). Response: map of variant → value; `cardId` for non-EMV cards.
- Variants: `wallee.v1-0.s1` (legacy, equals the old GeneratePanToken value, deprecated) and `ep2-hmac.v8-3.s1` / `.s2` (ep2 HMAC, **only on terminals migrated to ep2 v8**).
- `generatePanToken` is deprecated → use `panHashVariants`.

## Decision workflow
1. **Define the purpose** and legal basis of recognising the card (e.g. age binding, loyalty). Document it.
2. **Agree the surrogate domain with wallee** (service center): which key set and DOL, across which merchants/terminals. For Voltox cross-merchant recognition the domain must span all participating merchants. *Confirm with wallee.*
3. **Choose the variant:** `ep2-hmac.v8-3.*` on ep2 v8 terminals; `wallee.v1-0.s1` only for migration.
4. **Request it with the payment** (`panHashVariants`) to avoid an extra tap; use stand-alone `PanHash` for "tap to identify".
5. **Store** only the surrogate value + purpose-bound attributes (e.g. `ageVerifiedUntil`, `requiredAgeLevel`), with retention and deletion. Never with face images.
6. **Handle card replacement:** re-verification flow when an unknown value appears.
7. **Combine with PAR** where available (data element `<Payment Account Reference>`, present only if the card provides it) — never rely on PAR alone.

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Charging or refunding by surrogate PAN | Use a wallee token | Irreversible identifier |
| Assuming the value is the same "everywhere in ep2" | Same only within one surrogate domain | Merchant-specific keys |
| Using `generatePanToken` in new code | `panHashVariants` / `PanHash` | Deprecated |
| Storing surrogate PAN next to face templates in one profile | Separate stores, purpose limitation | Data protection |
| Treating "card known" as "age verified" forever | Expiry (`ageVerifiedUntil`), re-check rules per market | Card can change hands; law |
| Relying on PAR only | PAR is optional per card | Not always present |
| Logging surrogate PAN together with names | Log only technical ids | Re-identification risk |

## References
- ep2 Specification 8.3.0: Security ch. 8.9 (Surrogate PAN), 8.14 (key derivation); Data Dictionary (Surrogate DOL, Surrogate PAN Primary/Secondary, Payment Account Reference). Licensed; read the original.
- wallee LTI documentation: PanHash (6.23), GeneratePanToken (6.22, deprecated).
