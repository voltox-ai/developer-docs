---
name: wallee-softpos
description: Accept contactless card payments on an Android phone or tablet with wallee SoftPOS (tap on phone, MPoC) combined with Voltox age or face flows. Use when a solution turns a phone or tablet into the payment terminal, for pop-up sales, delivery, events, table service or kiosks without dedicated terminal hardware.
---

# wallee SoftPOS

**TRIGGER WHEN:** the payment device is a commercial off-the-shelf Android phone or tablet using NFC (tap on phone).

**SYMPTOMS:** "SoftPOS", "Tap to Pay", "tap on phone", "MPoC", "CPoC", "COTS device", "phone as terminal".

## Status
- ep2 8.3 integrates MPoC/CPoC terminal classes (CR-528).
- wallee offers SoftPOS. Availability per country, the certification status of the build you deploy, supported card brands and the SDK/app integration path must be **confirmed with wallee** before you build.

## Decision workflow
1. **Device policy:** supported Android versions/devices, attestation, no rooted devices, MDM recommended.
2. **App architecture:** your app (Voltox SDK + business logic) and the wallee SoftPOS component; follow wallee's integration path for your market. *Confirm with wallee.*
3. **Sequence, never overlap:** camera (Voltox) and NFC tap (payment) are sequential steps. Age gate before payment; face flows before the tap prompt.
4. **CVM:** above the contactless limit a PIN on glass or CDCVM may be required; plan UX for it.
5. **Card recognition:** if needed, request surrogate PAN values with the payment (ep2 HMAC variants only where supported).
6. **Security:** device integrity, app hardening, no secrets in the APK (fetch short-lived credentials from your backend), secure configuration.

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Camera open while the NFC tap runs | Sequential steps | Performance, UX, NFC field disturbance |
| Hard-coded API keys in the app | Short-lived credentials from backend | APKs are easy to decompile |
| Promising "ep2-certified SoftPOS" without checking | Confirm the exact certified build with wallee | Certification is per build/class |
| Running on rooted/unsupported devices | Device policy + attestation | Security requirements of MPoC |
