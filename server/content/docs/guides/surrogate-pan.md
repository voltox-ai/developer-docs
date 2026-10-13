---
title: Surrogate PAN (card recognition)
section: Guides
order: 2
summary: Recognise returning cards without storing card data — ep2 HMAC surrogate PAN via wallee panHashVariants, use cases, surrogate domain, data protection.
source: ep2 8.3 Security Specification ch. 8.9/8.14 (referenced), wallee LTI documentation (PanHash)
---

# Surrogate PAN — recognise a card without storing it

Many Voltox use cases need to know **"is this the same card as before?"** — without ever touching card data. ep2 solves this with the **surrogate PAN**: an irreversible value derived from the card, calculated by the terminal. Voltox integrations should **use and offer** it whenever card recognition is needed.

## Use cases

| Use case | How the surrogate PAN helps |
|---|---|
| **Age verified once per card** | First visit: Voltox age check + payment → store `surrogate → ageVerifiedUntil`. Next visit: tap first, known card → skip or shorten the age flow (within your legal rules). |
| **Tap first at vending machines** | Recognise the card before the vend; start the age gate only for unknown cards. |
| **Loyalty and receipts** | Link purchases of the same card without a customer account. |
| **Deny lists** | Block cards involved in abuse — by surrogate value, not by PAN. |
| **Smile & Pay enrolment** | Link the enrolment payment to the card that was used. |

## How it works

- ep2 8.x terminals calculate two **HMAC-SHA-256** values (*Primary* and *Secondary*) over card data selected by a **Surrogate DOL**, with **merchant-specific keys** delivered by the service center.
- wallee returns them with a payment (`panHashVariants` on the transaction) or stand-alone (`PanHash`, "tap to identify").
- Variants: `ep2-hmac.v8-3.s1` / `.s2` on terminals migrated to ep2 v8; `wallee.v1-0.s1` only for migration. `generatePanToken` is deprecated.

## Rules

1. **It is an identifier, never a payment credential.** You cannot charge, refund or reverse with it — payments use wallee tokens.
2. **Same value only within one surrogate domain** (same key set and DOL). For recognition across several merchants, the domain must span them — **confirm with wallee**.
3. **Card replacement changes the value** if the DOL includes the expiry date or sequence number. Plan a re-verification path.
4. **Store only the value and purpose-bound attributes** (e.g. `ageVerifiedUntil`, `requiredAgeLevel`), with retention and deletion — never next to face data.
5. **Payment Account Reference (PAR)** can complement it, but is present only if the card provides it.

## Data protection

A surrogate PAN is pseudonymous personal data. Document the purpose and legal basis, keep separate stores for card recognition and biometric results, set retention periods and never log the value together with names.

## Checklist

- [ ] Purpose and legal basis documented
- [ ] Surrogate domain agreed with wallee
- [ ] `panHashVariants` requested with the payment (no extra tap)
- [ ] Only surrogate value + purpose attributes stored, with retention
- [ ] Re-verification for unknown/replaced cards
- [ ] Never used to charge
