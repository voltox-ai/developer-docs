---
title: Decline codes
section: Reference
order: 1
summary: Voltox backend decline codes DR01–DR16 with meaning and recommended handling.
source: Voltox Smile & Pay SDK guide
---

# Decline codes

When a face or document cannot be accepted, the SDKs show the reason in the customer's language. These are the codes the Voltox backend can return.

| Code | Meaning | Recommended handling |
|---|---|---|
| DR01 | Face not matched with document face | Deny; offer retry or another method |
| DR02 | Document originality could not be verified | Deny; ask for another document |
| DR03 | Name on the document doesn't match | Deny |
| DR04 | Date of birth on the document doesn't match | Deny |
| DR05 | Nationality on the document doesn't match | Deny |
| DR06 | Country on the document doesn't match | Deny |
| DR07 | Gender on the document doesn't match | Deny |
| DR08 | The document is expired | Deny; ask for a valid document |
| DR09 | Potential spoof attempt detected | Deny; **never** route to registration, never charge |
| DR10 | Evasion behaviour detected | Deny; **never** route to registration, never charge |
| DR11 | Face image under-exposed (poor lighting) | Retry with better light |
| DR12 | Invalid face pose | Retry, face the camera |
| DR13 | No face detected | Retry |
| DR14 | User is a minor (only with `checkAge`) | Deny the restricted sale |
| DR15 | Face enrolment failed due to an error | Retry enrolment; contact support if repeated |
| DR16 | Issue date is not valid | Deny; ask for another document |

Rules:
- Spoof (DR09) and evasion (DR10) are always declined with their reason, even if the face is unknown to Voltox.
- Do not branch business logic on localised text; use the outcome (`isVerified`, `onPaid`). Codes are for logging and operator support.
