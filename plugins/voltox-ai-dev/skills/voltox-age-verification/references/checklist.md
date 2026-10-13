# Age Verification — production checklist and boundary tests

## Configuration
- [ ] Production Client ID and Client Secret from the dashboard, stored in secure configuration, never logged.
- [ ] `developerModeEnabled = false`.
- [ ] `requiredAge` set for each product before every flow (initialize default and/or `start()` override).
- [ ] `deviceType` matches the hardware (`Terminal`, `Kiosk`, `VendingMachine`).
- [ ] Inactivity timeout decided and documented (0 = QR never closes on idle).
- [ ] Theme and display mode published in the dashboard and tested (Fullscreen/Modal/Bottom Sheet) with every screen used (ID capture, NFC).
- [ ] Merged Android manifest verified in the release build; dependencies aligned.

## Decision handling
- [ ] Only `RESULT_OK` + `isVerified == true` continues; all other results deny (incl. `RESULT_CANCELED`, missing data).
- [ ] `reason` used only for logs/operator messages.
- [ ] No sale is released before the age gate; payment reservation cancelled on denial.
- [ ] Outcome and minimal identifiers recorded per compliance policy; no images, no document data.

## Boundary tests (run on the target device)
| Test | Expected |
|---|---|
| 16+: face estimate 20 / 21 | 20 → document step; 21 → pass |
| 18+: face estimate 22 / 23 | 22 → document step; 23 → pass |
| 21+: face estimate 25 / 26 | 25 → document step; 26 → pass |
| Document exactly `requiredAge` | pass |
| Document `requiredAge` − 1 day | deny |
| Cancel on every screen | `isVerified = false`, "Session cancelled by user." |
| System back on first screen | `RESULT_CANCELED` → deny |
| Face-scan window runs out (60 s) | deny, "Session closed due to inactivity." |
| QR scanned, phone idle 60 s | expiry notice, fresh QR, no approval |
| Phone shows Completed, terminal offline | no approval |
| NFC lifted during read | "Reading Interrupted", retry |
| Three NFC key rejections | deny |
| Device without NFC | chip option not offered |
| Subscription inactive | support message visible in every layout |
| Spoof (photo/screen) | deny |

## Performance
- [ ] Face → decision p95 ≤ 3 s measured on the target device and network.
- [ ] SDK screen opens ≤ 500 ms after trigger (SDK initialised at app start).
