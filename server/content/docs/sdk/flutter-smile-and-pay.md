---
title: Flutter Smile & Pay
section: SDKs
order: 3
summary: Embed Smile & Pay in a Flutter app with the smile_and_pay package and the SmileAndPayFlow widget.
source: Voltox Smile & Pay SDK — Android Integration Guide (Flutter section)
---

# Flutter Smile & Pay

Flutter host applications **do not need the AAR**. Use the `smile_and_pay` package and embed the flow as a widget:

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SmileAndPay.initialize(const SmileAndPayConfig(clientId: '<your Merchant Client ID>'));
  runApp(MaterialApp(
    home: Scaffold(
      body: SmileAndPayFlow(
        amount: const Money(minorUnits: 1560, currencyCode: 'EUR'),
        onResult: (result) {
          if (result is SmileAndPayPaid) {
            // fulfil the order: result.paymentIntentId, result.amount
          }
        },
      ),
    ),
  ));
}
```

- iOS host applications need a **deployment target of 15.5 or later**.
- The same rules as the Android SDK apply: minimum amount 5.00, currencies EUR/CHF/USD, fulfil only on a paid result, 5-minute single-use sessions.
- Package access is provided by Voltox during onboarding (support@voltox.ch).
