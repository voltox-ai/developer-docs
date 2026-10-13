---
title: SoftPOS (tap on phone)
section: Guides
order: 3
summary: Turn an Android phone or tablet into the payment terminal with wallee SoftPOS and combine it with Voltox age and face flows.
source: ep2 8.3 (MPoC/CPoC, referenced), wallee product information
---

# SoftPOS — the phone is the terminal

With **wallee SoftPOS** a commercial Android phone or tablet accepts contactless cards via NFC. Together with the Voltox Android or Flutter SDK one device handles the age check or face authentication **and** the payment — ideal for pop-up sales, delivery, events, table service and small kiosks.

> Availability per country, the certification status of the build you deploy, supported card brands and the integration path must be **confirmed with wallee** before you build. ep2 8.3 integrates the MPoC/CPoC terminal classes.

## Flow

1. **Voltox first:** age gate or Smile & Pay flow with the camera.
2. **Close the camera**, then show the tap prompt. Camera and NFC never run at the same time.
3. **Payment** via wallee SoftPOS; above the contactless limit plan for PIN on glass or device verification (CDCVM).
4. Optional: request surrogate PAN values with the payment for [card recognition](surrogate-pan.md) where supported.

## Device and app security

- Supported Android versions and devices only; no rooted devices; device attestation; MDM recommended.
- No secrets in the APK — fetch short-lived credentials from your backend.
- Release builds without debug flags, obfuscated, with certificate validation.

## Don'ts

| Don't | Do |
|---|---|
| Camera open while the NFC tap runs | Sequential steps |
| Hard-coded API keys in the app | Short-lived credentials from the backend |
| Promise "ep2-certified SoftPOS" | Confirm the exact certified build with wallee |
| Run on rooted or unsupported devices | Device policy + attestation |
