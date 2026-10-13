---
title: Voltox Developer Documentation
section: Start
order: 1
summary: Everything you need to integrate Voltox Age Verification and Smile & Pay into web shops, POS terminals, kiosks and vending machines.
---

# Voltox Developer Documentation

Voltox develops AI-powered solutions for **age assurance, identity verification, facial authentication and liveness detection**. The products work online and in physical environments: retail checkouts, payment terminals, kiosks and vending machines.

This site is the single place for merchants, customers and partners to read up, choose an integration path and go live following best practice. Every page is also available to AI coding assistants through the **Voltox AI Dev MCP** (see [Voltox AI Dev MCP](mcp-in-claude.md)).

## Products

| Product | What it does | Integration options |
|---|---|---|
| [Age Verification](products/age-verification.md) | Determines whether a customer meets the minimum age for a product, transaction or service. Facial age estimation first, document verification (ID scan or MRZ/NFC) only when more proof is needed. | Web iframe, Android SDK, server-to-server API (QR), POS terminals, kiosks, vending machines, MDB |
| [Smile & Pay](products/smile-and-pay.md) | Registered customers pay by looking at a camera. Face recognition with liveness checks, optional 4-digit PIN, optional age check, then the saved card is charged. | Web iframe, Android SDK, Flutter SDK, Checkout API, POS terminals, kiosks, vending |
| Face Recognition, KYC | Additional Voltox products available in the dashboard. Documentation follows. | Dashboard |

## Choose your path

| You are building… | Start here |
|---|---|
| An Android POS, kiosk or terminal app with an age check | [Android Age Verification SDK](sdk/android-age-verification.md) |
| An Android POS or kiosk app that takes payments by face | [Android Smile & Pay SDK](sdk/android-smile-and-pay.md) |
| A Flutter app | [Flutter Smile & Pay](sdk/flutter-smile-and-pay.md) |
| A web shop or browser-based kiosk | [Integration options → Web iframe](integration-options.md#web-iframe) |
| A backend that hands verification to the customer's phone | [Integration options → Server-to-server API](integration-options.md#server-to-server-api-qr-based-verification) |
| A vending machine or MDB integration | [Vending and MDB](guides/vending-and-mdb.md) |
| A solution for payment terminals in an ep2 market | [Payment terminals and ep2](guides/payment-terminals-and-ep2.md) |

## Five-minute quick start

1. Sign in at [dashboard.voltox.ai](https://dashboard.voltox.ai) and copy your **Client ID** (and, where needed, the **Client Secret**) from **Developer → API Credentials**.
2. Download the SDK, demo app and documentation from **Developer → Mobile Integrations**.
3. Run the demo app on your target device to check camera, network and layout.
4. Integrate the SDK following the product guide.
5. Work through the [Go-live checklist](guides/testing-and-go-live.md) before your first production transaction.

## Golden rules

- **Fail closed.** Only an explicit success from the SDK or API (`isVerified = true`, `onPaid`) may unlock a restricted product or complete an order. Missing, cancelled or malformed results are denials.
- **Never trust intermediate screens.** A "Completed" message on the customer's phone is not an approval.
- **Protect your Client Secret.** Store it with your approved secure-configuration process, never log it, never ship it in a web page.
- **Keep developer mode off in production.**

## Contact

- Technical support: support@voltox.ch
- Commercial enquiries: sales@voltox.ch
- VOLTOX GmbH, An der Hessenhalle 1–3, 35398 Gießen, Germany · HRB 12213, Amtsgericht Gießen
