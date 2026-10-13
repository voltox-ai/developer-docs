---
title: Getting started
section: Start
order: 2
summary: Dashboard access, credentials, subscriptions, test and live environments, and the resources you can download.
---

# Getting started

## 1. Get dashboard access

Register or sign in at **https://dashboard.voltox.ai**. Dashboard features depend on your role, product access and subscription. The main areas are:

| Area | What you do there |
|---|---|
| Dashboard (Overview) | Verification activity and payments across products, gender and age distribution of verifications for a date range |
| Age Verification / Face Recognition / KYC Verification / Smile and Pay | Product demos and verification history (requires an active subscription for the product) |
| Billing | Active subscriptions, latest invoice, invoice history |
| Payments | Connect the payment provider for Smile & Pay (today: Stripe Connect), choose **Test** or **Live** |
| Product Documentation | Official guides and solution overviews for your enabled products |
| Settings | Profile, trusted devices and sessions, language, configuration profiles |
| Developer | API credentials, secret rotation, Mobile Integrations (SDKs, demo apps, docs) |

## 2. Credentials

**Developer → API Credentials** shows:

- **Client ID** (also called *Merchant Client ID* in the Smile & Pay SDK). Identifies your merchant account. Required by every SDK.
- **Client Secret**. Required by the Age Verification SDK, optional for Smile & Pay (device registration). Use **Reveal** only when you need it, and **Regenerate Key** to rotate it. Regenerating invalidates the current secret immediately.

> Store the Client Secret with your approved secure-configuration process. Never log it, never commit it to source control and never place it in browser code.

A "Invalid merchant client id." error means the Client ID is wrong or belongs to another environment.

## 3. Subscriptions

An **active Voltox subscription** is required. If a subscription is inactive:

- the dashboard product page shows *"Seems like your subscription has expired or has been deactivated"* with **Request Access**;
- the Age Verification SDK disables verification options and shows a support message (test that this message is visible in every layout you support).

## 4. Test and live

- Smile & Pay uses **separate payment configurations** for testing and production (Payments → Test / Live). The live merchant account must be validated before launch.
- Use the **demo apps** from Mobile Integrations to preview flows on a device before you integrate.
- `developerMode` / `developerModeEnabled` shows testing helpers in the SDKs. **Keep it false in production.**

## 5. Downloads (Developer → Mobile Integrations)

| Kit | File | Version | Purpose |
|---|---|---|---|
| Age Verification Integration Kit | `age-verification-documentation.pdf` | 1.0.15 | Android setup and integration guide |
| | `age-verification-app.apk` | 1.0.15 | Demo app to test and preview the flow on a device |
| | `age-verification-sdk.aar` | 1.0.15 | Android SDK |
| Smile & Pay Integration Kit | `smile-and-pay-documentation.pdf` | 1.0.0 | Setup and integration guide |
| | `smile-and-pay-app.apk` | 1.0.0 | Demo app |
| | `smile-and-pay-sdk.aar` | 1.0.0 | Android SDK |

> Version note: the Smile & Pay guide inside the 1.0.0 kit still states "SDK Version 0.0.3" and refers to the file name `smile-and-pay-sdk_v0.0.3.aar`. Use the file name you actually downloaded.

## 6. Pick an integration

Read [Integration options](integration-options.md), then follow the guide for your product and platform.
