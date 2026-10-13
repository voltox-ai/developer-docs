---
name: voltox-age-verification
description: Rules and workflow for Voltox Age Verification. Use when code or configuration starts an age check (VoltoxAgeVerification, requiredAge, isVerified, web iframe age check, S2S QR session), sells age-restricted goods (alcohol, tobacco, vape, energy drinks, adult content) or sets 16+/18+/21+ thresholds on terminals, kiosks, vending machines or web shops.
---

# Voltox Age Verification

**TRIGGER WHEN:** writing, reviewing or testing anything that decides whether a customer is old enough.

**SYMPTOMS:** `VoltoxAgeVerification.initialize/start`, `VoltoxOptions`, `requiredAge`, `isVerified`, `reason`, `uiMode`, `scanIdOption`, `documentQrCodeEnabled`, `deviceType`, `inactivityTimeoutSeconds`, QR hand-off, MRZ/NFC, "age gate", "Jugendschutz", "KJM".

**This skill covers Age Verification only.** It does not cover paying (Smile & Pay), recognising a person (Face Recognition) or identity onboarding (KYC).

## Decision workflow

1. **Set the legal threshold per product** (`requiredAge` = 16, 18, 21…). Never derive it from a UI default. Multiple categories → pass `requiredAge` on each `start()`.
2. **Choose the method**
   - Android device with camera (terminal, kiosk, vending screen) → Android SDK, `deviceType` = `Terminal` | `Kiosk` | `VendingMachine`.
   - Web shop / browser kiosk → web iframe, HTTPS, camera permission policy, approved domains.
   - Device without camera or SDK → S2S API with QR hand-off; the backend retrieves the verdict.
3. **Choose the fallback.** Face first; document only when needed (`ScanIdAndNfc`, `ScanIdOnly` or `NfcOnly`). External USB/serial NFC readers are not supported → offer `ScanIdOnly` or `documentQrCodeEnabled = true`.
4. **Decide the timeouts.** Unattended: `inactivityTimeoutSeconds = 0` keeps an unscanned QR up; set a value if abandoned flows must close.
5. **Gate the sale.** Continue only on `RESULT_OK` **and** `isVerified == true`. Everything else is a denial.
6. **Bind to payment correctly.** Age gate first, then payment (or a reservation that you cancel on denial). Never release goods before both gates pass.
7. **Optional: card recognition.** If policy allows "verified once per card", combine with the surrogate-pan skill.
8. **Run the checks** in [references/checklist.md](references/checklist.md) and the self-assessment items `VX-AV-*`.

## Anti-patterns

| Wrong | Right | Why | Reference |
|---|---|---|---|
| `getBooleanExtra("isVerified", true)` | default `false`, compare `== true` | Crash or cancel would approve | docs: Android SDK › Result contract |
| Matching `reason` text to decide | Decide on `isVerified` only | `reason` is informational and localised | Result contract |
| Approving when the phone shows **Completed** | Wait for the SDK result on the original device | Phone step ≠ decision | QR verification |
| `requiredAge = 0` or negative "to disable" | Don't start the flow for unrestricted goods | Rejected by the SDK; ambiguous intent | Configure the product age |
| Re-initialising the SDK per product | `start(requiredAge = …)` per flow | Avoids races, faster | Multiple product categories |
| Running two differently configured flows at once | One flow at a time | Undefined behaviour | Multiple product categories |
| `developerModeEnabled = true` in production | `false` | Exposes test behaviour | Production checklist |
| Logging `clientSecret` or verification images | Secure config; images stay in the SDK | Credential leak, biometric data | Privacy and data handling |
| Treating a face estimate of exactly `requiredAge` as pass | Face needs ≥ `requiredAge` + 5; documents need ≥ `requiredAge` | Fixed five-year buffer | Age policy |
| Accepting a parent's ID for a child | Document must belong to the person checked | ID rule | Product: Age Verification |
| Releasing goods, then checking age | Gate before release | Irreversible | Global rule |

## References

- [references/sdk-android.md](references/sdk-android.md) — full Android SDK 1.0.15 guide (install, options, timeouts, NFC, results, theming).
- [references/product.md](references/product.md) — product behaviour, outcomes, age policy, KJM evaluation, performance.
- [references/checklist.md](references/checklist.md) — production checklist and boundary tests.
