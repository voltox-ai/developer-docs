---
name: voltox-face-recognition
description: Boundaries for Voltox Face Recognition. Use when someone wants to recognise or re-identify a person by face with Voltox outside of a Smile & Pay payment or an age check — loyalty, access, returning-customer recognition, staff check-in.
---

# Voltox Face Recognition

**TRIGGER WHEN:** a use case needs to recognise a known person by face and it is neither a payment (Smile & Pay) nor an age check (Age Verification).

**SYMPTOMS:** "recognise returning customers", "face login", "face access", "1:N search", "face check-in", dashboard section *Face Recognition*.

**This skill covers Face Recognition only.**

## Status of documentation
Face Recognition is a separate Voltox product visible in the dashboard. A public integration guide is **not yet published**. Until it is:
- Do **not** invent endpoints, SDK methods or parameters.
- Do **not** reuse Smile & Pay or Age Verification calls for recognition purposes.
- Request the product documentation and API reference from Voltox (support@voltox.ch) and the subscription for the product.

## Decision workflow
1. **Purpose and legal basis.** Biometric identification is special-category personal data (GDPR Art. 9, Swiss nDSG). Define purpose, legal basis, explicit consent and retention before any code.
2. **Is recognition really needed?** If the goal is payment → Smile & Pay. If the goal is age → Age Verification. If the goal is identity onboarding → KYC. If the goal is recognising a card → surrogate-pan (no biometrics).
3. **Consent and opt-out** in the customer journey; a way to delete the enrolment.
4. **Liveness** on every recognition (no recognition from stored photos).
5. **Fail closed:** uncertain match = not recognised.

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Building recognition on Smile & Pay face search | Use the Face Recognition product | Different purpose and consent |
| Enrolling faces without explicit consent | Explicit consent, documented | Special-category data |
| Storing face images in the merchant system | Keep biometrics inside Voltox | Data minimisation |
| Recognising people who never enrolled | Only enrolled, consenting users | Surveillance, unlawful |
| Using recognition to make age or payment decisions | Use the dedicated product | Product separation |
