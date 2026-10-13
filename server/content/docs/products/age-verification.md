---
title: Age Verification
section: Products
order: 1
summary: How Voltox Age Verification works, outcomes, document fallback, age policy and the KJM evaluation.
source: Voltox Age Verification Technical Overview (Oct 2026), Android SDK guide 1.0.15
---

# Age Verification

Voltox Age Verification helps businesses determine whether a customer meets the minimum age required for a product, transaction or service. The flow starts with **facial age estimation** and continues to **document verification only when additional proof is required**. The restricted transaction is authorised only after a valid approval.

## Key capabilities

- Guided facial capture with automatic capture support
- Facial age estimation with spoof-detection checks
- Document verification and face-to-document comparison in fallback journeys
- Smartphone handoff (QR) for face or document verification
- Configurable minimum-age requirements
- Verification outcomes returned to the integrating application
- Session cancellation, timeout and retry controls
- Multilingual customer journeys (Arabic, German, English, Spanish, French, Italian, Portuguese in the Android SDK)
- Android SDK branding and presentation configuration
- Device registration and status reporting for Android deployments

## Supported documents

| Document type | Coverage |
|---|---|
| Passports | ICAO Doc 9303 compliant passports |
| National ID cards and residence permits | Government-issued documents, front/back where required |
| Driving licences | Common formats from the UK, EU, US, Canada, Australia and APAC |

Exact coverage depends on document format and the agreed deployment scope.

## Customer journey

### 1. Age estimation (camera path)
1. **Start the age check.** The website, app, terminal or vending integration starts a check after an age-restricted product is chosen. The customer uses the device camera or scans a QR code to continue on their phone.
2. **Scan the face.** The customer centres their face; Voltox captures a live image and runs age-estimation and spoof checks.

### 2. Outcomes of the camera step

| Outcome | Meaning |
|---|---|
| **APPROVED** | The estimated age meets the configured safety margin. |
| **RETRY** | The camera could not detect reliably (lighting, pose). The restricted transaction stays blocked. |
| **SPOOF** | A spoof is detected; the check stops. |
| **ADDITIONAL PROOF** | The estimate does not satisfy auto-approval; the journey continues to ID verification. |

### 3. Additional proof of age
- **QR to phone:** the customer scans a QR code and continues the ID flow on their phone.
- **Scan method:** browser-based ID scan, or in supported Android SDK deployments **MRZ + NFC** chip reading.

**ID rule:** the identity document must belong to the person being checked. A parent's or another person's ID cannot be used to qualify a child. For an 18+ service, an ID showing the person is exactly 18 is sufficient.

### ID scan route
The customer presents their own ID. On **SUCCESS** the required age is confirmed; on **RETRY** the customer scans again and the product stays blocked.

### MRZ / NFC route
1. Position the MRZ (machine-readable zone) in the frame.
2. Hold the ID to the NFC reader and keep it steady while the chip is read.
3. **SUCCESS** when the chip data is read and criteria are confirmed. **RETRY** if the MRZ is not detected or the read is interrupted.

## How document ownership is verified

1. **Liveness check:** confirms a real person is present; helps detect printed photos and screen replays.
2. **Document authenticity checks:** analysis for manipulation, copying, screen capture and other alterations.
3. **Face extraction:** a biometric representation from the live image and from the document portrait.
4. **1:1 face matching:** the live face is compared with the document portrait against a verification threshold.
5. **Age and data validation:** date of birth from the document can be cross-checked against the estimated age.

## Age policy

The minimum age for the product and the facial approval threshold serve different purposes. Voltox applies a fixed, **non-configurable five-year safety buffer** to face estimation only.

| Minimum required age | Facial auto-approval | Document requirement |
|---|---|---|
| 16+ | Estimated age ≥ 21 | Age ≥ 16 |
| 18+ | Estimated age ≥ 23 | Age ≥ 18 |
| 21+ | Estimated age ≥ 26 | Age ≥ 21 |

Comparisons are inclusive. Example: for an 18+ product, an estimate of 22 continues to document verification; an estimate of 23 meets the facial threshold (subject to the other checks). A customer who does not clear the facial threshold is **not** treated as underage; they continue to document verification.

> **Fail-safe principle:** an unsuccessful check, cancellation, timeout or technical failure must never authorise the restricted transaction.

## Compliance highlights

- **GDPR:** Voltox runs its GDPR compliance programme through Scytale (continuous compliance oversight, evidence management, expert privacy support).
- **KJM positive evaluation (July 2025):** the German Commission for the Protection of Minors in the Media (KJM) evaluated the Voltox age estimation module, when implemented accordingly, as suitable as a **partial solution at the identification level** for a closed adult user group under the German JMStV. The evaluated approach applies the non-changeable five-year buffer (18+ requires an estimate of at least 23). Where Voltox is used for a closed adult user group, the content provider must add authentication measures so that access stays limited to the identified, age-checked person.

## Performance (indicative)

- Liveness and anti-spoofing: approx. 97 % spoof-detection accuracy across common presentation attacks (printed photos, screen replays, cutouts, 3D masks). Designed in line with ISO/IEC 30107-3 principles.
- Age estimation: typical mean absolute error approx. 2–3 years across benchmark datasets, with safety margins for restricted transactions.
- The published under-three-second figure refers to facial age estimation, not the whole journey (camera start, positioning, upload, document fallback add time).

Benchmark figures vary with dataset, camera, lighting, pose and attack type. Contractual commitments are agreed separately.

## Next

- [Integration options](../integration-options.md)
- [Android Age Verification SDK](../sdk/android-age-verification.md)
- [Security, privacy and compliance](../security-privacy-compliance.md)
