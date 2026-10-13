---
name: voltox-kyc
description: Boundaries for Voltox KYC Verification (identity verification with document and face). Use when someone needs to verify a person's identity for onboarding, account opening, regulated sign-up or AML/KYC purposes with Voltox.
---

# Voltox KYC Verification

**TRIGGER WHEN:** onboarding needs a verified identity (name, date of birth, document, face-to-document match), e.g. account opening, regulated services, merchant or customer due diligence.

**SYMPTOMS:** "KYC", "identity verification", "ID check for onboarding", "AML", "due diligence", dashboard section *KYC Verification*.

**This skill covers KYC only.** An age check is not a KYC; a KYC result is not a payment authorisation.

## Status of documentation
KYC is a separate Voltox product visible in the dashboard. A public integration guide is **not yet published**. Until it is:
- Do **not** invent endpoints, SDK methods or response fields.
- Request the KYC documentation and API reference from Voltox (support@voltox.ch).
- Building blocks that exist in Age Verification (document scan, MRZ/NFC, face-to-document matching) show the capabilities, but their **result contract is age-only** (`isVerified`, `reason`) and must not be used as KYC evidence.

## Decision workflow
1. **Regulatory requirement:** which law and which level of assurance apply (e.g. AML due diligence, eIDAS level, sector rules). The integrator's compliance team decides; this toolset does not.
2. **Evidence needed:** which identity attributes and which audit trail must be kept, and where (merchant vs. Voltox).
3. **Document coverage:** passports (ICAO 9303), national IDs and residence permits, driving licences — confirm coverage for your countries.
4. **Data minimisation:** keep only what the regulation requires; define retention and deletion.
5. **Fail closed:** any incomplete verification = not verified.

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Using Age Verification `isVerified` as KYC proof | KYC product with its own evidence | Age-only result contract |
| Copying document images into your own storage | Keep in the agreed KYC process | Data protection, security |
| Accepting expired or someone else's document | Reject (DR08, ownership rule) | Fraud |
| Deciding regulatory sufficiency in code comments | Compliance sign-off | Legal responsibility |
