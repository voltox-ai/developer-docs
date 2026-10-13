# Smile & Pay — production checklist

## Configuration
- [ ] Production Merchant Client ID; `developerMode = false`.
- [ ] Flutter engine created once in `Application.onCreate` and cached as `smile_and_pay`.
- [ ] `FlutterActivity` declared; compileSdk 36; Java 17; Flutter repository added.
- [ ] `clientSecret` only through secure configuration (if device registration is used).
- [ ] Currency fixed per merchant (CHF/EUR/USD); amounts in minor units; minimum 500.

## Payment handling
- [ ] Order fulfilled only on `onPaid`, exactly once per `paymentIntentId`/`appPaymentId`.
- [ ] Receipt uses `amountMinorUnits` and `currency` from `onPaid`.
- [ ] Basket change → new session.
- [ ] Interrupted flows (app kill, network loss) reconciled with the provider before retrying.
- [ ] Refund/void procedure agreed and tested.

## Tests
| Test | Expected |
|---|---|
| Enrolled face, card on file | `onPaid`, fulfil once |
| Enrolled face, PIN set, wrong then right PIN | retry on same session, then `onPaid` |
| Unknown face | registration QR, nothing reported |
| Photo/screen spoof | DR09/DR10, never a charge, never registration |
| No card on file | "No payment method", nothing reported |
| Amount 4.99 | "Amount must be at least 5.00." |
| Offline during charge | "Payment failed" (connection) — reconcile before retry |
| Double tap on Pay | one charge |
| `checkAge = true`, minor | DR14 |
| Camera permission denied | "Camera problem" |

## Performance
- [ ] Face → `onPaid` p95 ≤ 5 s on the target device.
