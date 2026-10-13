# Smile & Pay payments on wallee (target design)

**Status:** target design. The public Smile & Pay SDK charges through Stripe today. Items marked *Confirm with wallee* must be confirmed for your contract, devices and markets before you build.

## Why wallee
- One platform for terminals (attended and unattended), SoftPOS and e-commerce; certified ep2 terminals; Swiss acquiring and EU PSP coverage.
- ep2 already describes the business use case "Perform a CIT Stored Credential Payment" (ep2 8.3, Book 16, BUC 40) — exactly what Smile & Pay does.

## The ep2 BUC 40 pattern (in our words; read the specification for the normative text)

| Phase | Where | What happens | ep2 data |
|---|---|---|---|
| 1. Establish | wallee terminal, card present, or e-commerce | Customer agrees to store the card for future face payments. Transaction type *Purchase* or *Account Verification*. Cardholder verification required (PIN/CDCVM on POS, 3-D Secure online). | Transaction Reason Code **2** (unscheduled credential on file); POS entry mode by technology (POS) or 95 (e-commerce) |
| 2. Store | wallee | Store the credential reference (wallee token) and the scheme transaction identifier. Never in Voltox, never in the merchant app. | Scheme Transaction Identifier |
| 3. Transfer (POS only) | wallee | Moving the credential from the terminal transaction to the e-payment system is **not defined by ep2**; it must be a proprietary, secure, PCI-approved solution. | — *Confirm with wallee* |
| 4. Pay | Voltox backend → wallee Web Service API v2.0 | After face match (+PIN, +age), charge the token as a subsequent cardholder-initiated transaction. | POS Entry Mode **10** (credential on file), Transaction Reason Code **90** (subsequent CIT), no original scheme transaction id — *flag mapping: Confirm with wallee* |

BUC 40 covers the card schemes Visa and Mastercard. Other brands need their own clarification.

## Card recognition
Add the ep2 surrogate PAN at enrolment to recognise the same card at any terminal of the same surrogate domain (see surrogate-pan). The surrogate PAN never replaces the token.

## Scheme and regulatory consequences
- Subsequent payments are **card-absent**. Card-not-present rules apply: authentication requirements for EU-issued cards (exemptions, merchant-initiated vs. cardholder-initiated), liability and interchange differ from card-present.
- The Voltox face match is not an issuer-recognised strong customer authentication factor. Design exemptions and limits with wallee.
- Keep the consent (stored credential agreement) with timestamp and terms version.

## wallee Web Service API v2.0 essentials for the charge
- Auth: JWT Bearer per request (HS256, claims `sub` = application user id, `iat`, `requestPath`, `requestMethod`), signed with the application user's key. Generate `iat` right before each call.
- Use `/api/v2.0/…` (v1 is deprecated).
- Many endpoints need the `space` header.
- Tokens: Token Service; transaction created with the token `id`; charge flow if the token cannot be charged directly.
- Results: listen to webhooks (`x-signature`, SHA256withECDSA, public key by `keyId`), then **read the entity**; never trust the webhook payload alone.

## Migration path from Stripe
1. Keep the SDK contract (`onPaid` payload) stable; add a provider field in `appPaymentId` mapping on the Voltox side.
2. Introduce the wallee provider in the Voltox backend behind a feature flag per merchant.
3. Run both providers in test; compare success rates and latency.
4. Switch merchants one by one; never mix providers inside one checkout session.
