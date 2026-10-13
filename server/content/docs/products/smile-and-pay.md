---
title: Smile & Pay
section: Products
order: 2
summary: Facial authentication and payment in the merchant checkout — enrolment, checkout journey, outcomes, amounts and currencies.
source: Voltox Smile & Pay Technical Overview (Oct 2026), Android SDK guide
---

# Smile & Pay

Voltox Smile & Pay lets **registered customers pay by looking at a camera**. Customers first enrol their face and save a payment card. At checkout they review the amount and start the payment. Customers who set a PIN enter it before their card is charged.

Voltox provides the payment interface and supporting services. **The merchant application links each payment to an order and completes the purchase only once payment is confirmed.**

## Key capabilities

- Guided face capture and recognition of enrolled customers
- Image-quality and spoof-detection checks during facial authentication
- Payments using saved cards through the connected payment provider (today: **Stripe**)
- Optional four-digit customer PIN, verified server-side before charging
- Amount and currency set by the merchant application for each transaction
- QR code directing new customers to registration
- Payment reference, amount and currency returned to the merchant application
- Multilingual checkout screens and configurable SDK inactivity timeout
- Dashboard for merchant payment setup and for customers to manage face, card and PIN
- Optional age verification for transactions that require an age check

## Account setup (customer)

1. **Create account:** the customer registers through the Voltox dashboard, accepts terms and privacy policy, and adds a payment card through the payment provider's card-entry form.
2. **Enrol face:** after consenting to biometric processing, the customer follows the guided face capture. The enrolled reference is used to recognise them at future checkouts.
3. **Optional PIN:** a four-digit PIN can be set or skipped. Once set, it is required at every checkout.

## Checkout journey

1. **Choose Smile & Pay.** The merchant presents the amount and requests authentication.
2. **Face scan.** The customer positions their face; a live image is captured for liveness and matching.
3. **Live face authentication.** Liveness controls and comparison with the enrolled profile. If the match is uncertain, fails or is interrupted, **no payment request is triggered**. If the customer is not enrolled, a registration screen with QR code and *Register* button opens the dashboard.
4. **Optional age check.** When enabled, payment proceeds only after the required age checks pass.
5. **PIN**, if the customer configured one.
6. **Payment authorisation.** Smile & Pay submits the payment request; the merchant completes the order only after successful payment is confirmed.

## Outcomes

| Outcome | Meaning |
|---|---|
| **SUCCESS** | Payment processed, transaction complete. |
| **FAILED** | Payment could not be processed. The customer retries or uses another payment method. |

## Amounts and currencies

- The merchant application sets the amount for each payment (fixed amount for single-service kiosks, basket total for retail).
- **Minimum amount: 5.00** in the selected currency.
- SDK currencies: **EUR, CHF, USD**. Web currency availability depends on the merchant account and payment provider.
- A checkout session is created for exactly that amount. **If the basket changes, start a new session.** Receipts must use the amount and currency confirmed by the backend.

## Sessions

- Checkout sessions contain merchant, amount and currency, **expire after five minutes** and are removed after a successful charge.
- Each retry starts a new face search; a payment session can be used once.

## Data handling (summary)

- Images used for one-time authentication are deleted after authentication.
- An enrolled biometric template is retained until the customer removes it or deletes the account; customers can withdraw consent.
- Card-entry and saved-card services are provided by the payment provider; Voltox stores payment-method references, not card numbers.

See [Security, privacy and compliance](../security-privacy-compliance.md).

## Next

- [Android Smile & Pay SDK](../sdk/android-smile-and-pay.md)
- [Flutter Smile & Pay](../sdk/flutter-smile-and-pay.md)
- [Payment terminals and ep2](../guides/payment-terminals-and-ep2.md)
