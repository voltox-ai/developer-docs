---
title: Integration options
section: Start
order: 3
summary: Web iframe, Android SDK, Flutter SDK, Checkout API, server-to-server QR API, POS terminals, kiosks, vending and MDB — what each option does and who owns what.
---

# Integration options

## Overview

| Option | Age Verification | Smile & Pay | Best for |
|---|---|---|---|
| [Web iframe](#web-iframe) | ✓ (incl. document verification) | ✓ (incl. document check when an age check needs more evidence) | Web shops, browser-based kiosks |
| [Android SDK](#android-sdk) | ✓ native screens | ✓ (Flutter engine inside an AAR) | POS terminals, kiosks, Android vending controllers |
| [Flutter SDK](#flutter-sdk) | – | ✓ `smile_and_pay` package | Flutter POS/kiosk apps, iOS ≥ 15.5 |
| [Checkout API](#checkout-api) | – | ✓ custom UI | Merchants building their own checkout screens |
| [Server-to-server API](#server-to-server-api-qr-based-verification) | ✓ QR on the originating device, flow on the phone | – | Devices without camera or SDK |
| [POS / payment terminals](#pos-and-payment-terminals) | ✓ SDK or API/QR | ✓ compatible terminals with camera access | Attended checkouts |
| [Kiosks](#kiosks) | ✓ iframe or SDK | ✓ | Self-service |
| [Vending / MDB](guides/vending-and-mdb.md) | ✓ MDB event can trigger the flow | ✓ controller-specific | Vending machines, micro markets |

## Web iframe

**Age Verification:** embeds the hosted Voltox verification journey into an approved website. Verification is completed inside the embedded experience and the outcome is returned to the parent application.

**Smile & Pay:** embeds Smile & Pay in an approved merchant website or kiosk application. The merchant application supplies the **amount, currency and optional age-verification setting** and receives the payment result.

Requirements:
- Production camera access needs **HTTPS** and browser permission.
- The parent site's **permissions policy must allow camera use** by the embedded frame.
- Voltox checks the **parent origin / approved domains** — register your domains with Voltox during onboarding.

Settings accepted by the iframe include minimum required age, language and supported verification and document-scanning modes (Age Verification) or merchant identifier, amount, currency and age-verification flag (Smile & Pay).

## Android SDK

The host application initialises the SDK, starts a flow and receives the result. Local capture guidance runs on the device; verification services run in the Voltox cloud over HTTPS.

- [Android Age Verification SDK 1.0.15](sdk/android-age-verification.md)
- [Android Smile & Pay SDK](sdk/android-smile-and-pay.md)

## Flutter SDK

Flutter host applications use the `smile_and_pay` package and embed the flow as a widget. See [Flutter Smile & Pay](sdk/flutter-smile-and-pay.md).

## Checkout API

Allows merchants to build a **custom checkout interface** using facial recognition, PIN verification and payment endpoints. The integration captures the customer's face and must follow the required session and payment-confirmation process (5-minute single-use sessions, server-side PIN, fulfil only after confirmed payment). The API reference is provided during onboarding — contact support@voltox.ch.

## Server-to-server API (QR-based verification)

1. The merchant **backend creates a verification session** and receives a **verification link and QR code**.
2. The originating device displays the QR code.
3. The customer completes verification in their **smartphone browser**, including document verification where required.
4. The merchant backend **retrieves the session status and final verdict** through the authenticated API.

No local camera, embedded iframe or Android SDK is needed on the originating device. The S2S API accepts a **target age per session**. Security: authenticated session creation and result retrieval, client-ownership checks for session results, single-use launch tokens in QR journeys.

## POS and payment terminals

Compatible Android terminals can integrate the SDK or start a smartphone verification through API/QR. For Smile & Pay the terminal needs camera access and permission to run the checkout application; device compatibility and payment-account requirements are verified during onboarding. For terminals in ep2 markets read [Payment terminals and ep2](guides/payment-terminals-and-ep2.md).

## Kiosks

Use the web iframe or the Android SDK depending on operating system and architecture. Screen layout, camera placement and handling of interrupted payments are validated on the selected hardware.

## Responsibilities

| Party | Responsible for |
|---|---|
| Merchant application | Product selection, pricing, order references, receipts, fulfilment, idle/restart logic of the host app |
| Vending controller | Dispensing, recovery if a paid product cannot be delivered |
| Voltox | Capture guidance, liveness, recognition, age estimation, document checks, session management, result delivery |
| Payment provider | Card entry, saved payment methods, charge processing, payment records |

Refund and reconciliation procedures are agreed during payment integration.
