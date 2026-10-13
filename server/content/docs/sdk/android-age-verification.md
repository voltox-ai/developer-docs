---
title: Android Age Verification SDK
section: SDKs
order: 1
summary: Complete Android integration guide for SDK 1.0.15 — install, configure, age thresholds, QR phone flow, NFC, timeouts, result contract, theming, presentation mode.
source: Voltox Age Verification SDK — Android Integration Guide, Merchant edition, SDK 1.0.15 (11 Oct 2026)
version: 1.0.15
---

# Android Age Verification SDK (1.0.15)

The Voltox Age Verification SDK lets an Android application verify whether a customer meets a product age requirement. It supports **face age estimation, ID verification, MRZ/NFC chip verification and phone-based verification through a QR code**.

> **Use the SDK result.** The merchant application must decide from the final SDK callback. A completion message on the customer's phone only means the phone step has finished.

## What's new in 1.0.15

No integration change since 1.0.8: public API, options and result contract are unchanged — replacing the AAR is all that is needed.

- **QR screen:** no timer before the QR is scanned. The 60-second countdown starts when the phone scans the QR and runs for the whole phone session. (1.0.9 started it when the QR appeared; reverted in 1.0.10.)
- **Camera face scan keeps going after a failed attempt.** Rejected scan, spoof detection, missing age or network error no longer end the session; the customer can retry within the 60-second window. The countdown pauses while a capture is processed. **Cancel** ends the session immediately.
- **Face QR screen keeps waiting** when the backend declines a phone scan (e.g. invalid pose); the window is not reset on phone retries.
- **NFC reading is more forgiving:** one 60-second countdown for the whole read; lost connection is distinguished from a rejected key; a read in progress is never cut off.
- **NFC availability detection:** devices without NFC no longer offer the chip option; NFC switched off shows how to enable it with a settings shortcut.
- **Biometric images in memory only;** never written to disk.
- **Countdown placement** directly above the first line of text.
- Carried over from 1.0.8: backing out of a phone verification reliably ends the backend session; presentation mode and branding (incl. white label) are configured in the dashboard.

## Quick-start checklist

1. Sign in at https://dashboard.voltox.ai and obtain your **Client ID and Client Secret**.
2. Add the AAR to `app/libs`.
3. Add the required Android dependencies.
4. Build `VoltoxOptions` with the product's `requiredAge`, or leave it unset and pass it per flow to `start()`.
5. Initialise the SDK with credentials and options.
6. Register an `ActivityResultLauncher` and start verification.
7. Permit or deny the transaction using `isVerified` from the returned Intent.

## Platform requirements

| Item | Requirement |
|---|---|
| minSdk | 24 |
| compileSdk | 35 |
| Java | 11 source and target compatibility |
| Connectivity | Internet access required |
| Hardware | Camera-capable Android device. MRZ/NFC needs NFC hardware exposed through the Android NFC stack |
| Subscription | Active Voltox subscription; otherwise verification options are unavailable and a support message is shown |

## Install — Kotlin DSL

Place the AAR at `app/libs/age-verification-sdk.aar`.

```kotlin
dependencies {
    implementation(files("libs/age-verification-sdk.aar"))
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity:1.10.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.camera:camera-camera2:1.1.0-beta01")
    implementation("androidx.camera:camera-lifecycle:1.1.0-beta01")
    implementation("androidx.camera:camera-view:1.5.0-alpha05")
    implementation("com.squareup.okhttp3:okhttp:4.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.9.3")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.google.code.gson:gson:2.8.8")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("com.google.zxing:core:3.4.1")
    implementation("com.microsoft.signalr:signalr:7.0.5")
    implementation("com.google.mlkit:face-detection:16.1.7")
    implementation("org.tensorflow:tensorflow-lite:2.17.0")
    implementation("org.tensorflow:tensorflow-lite-gpu:2.17.0")
    implementation("com.caverock:androidsvg:1.4")
    // Add when MRZ/NFC verification is enabled
    implementation("org.jmrtd:jmrtd:0.8.6")
    implementation("net.sf.scuba:scuba-sc-android:0.0.26")
}
```

Sync Gradle and resolve version conflicts before continuing. If your app already uses one of these libraries, Gradle may select a different compatible version — check the dependency report.

**androidsvg** is needed to render an SVG header logo uploaded in the dashboard. The AAR does not bundle it. PNG/JPEG logos do not need it; the SDK falls back to the default Voltox mark if it is missing.

## Install — Groovy DSL

```groovy
dependencies {
    implementation files('libs/age-verification-sdk.aar')
    implementation 'androidx.core:core-ktx:1.15.0'
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'androidx.activity:activity:1.10.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.2.0'
    implementation 'androidx.camera:camera-camera2:1.1.0-beta01'
    implementation 'androidx.camera:camera-lifecycle:1.1.0-beta01'
    implementation 'androidx.camera:camera-view:1.5.0-alpha05'
    implementation 'com.squareup.okhttp3:okhttp:4.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.9.3'
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.google.code.gson:gson:2.8.8'
    implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'
    implementation 'com.journeyapps:zxing-android-embedded:4.3.0'
    implementation 'com.google.zxing:core:3.4.1'
    implementation 'com.microsoft.signalr:signalr:7.0.5'
    implementation 'com.google.mlkit:face-detection:16.1.7'
    implementation 'org.tensorflow:tensorflow-lite:2.17.0'
    implementation 'org.tensorflow:tensorflow-lite-gpu:2.17.0'
    implementation 'com.caverock:androidsvg:1.4'
    implementation 'org.jmrtd:jmrtd:0.8.6'
    implementation 'net.sf.scuba:scuba-sc-android:0.0.26'
}
```

## Android configuration

```kotlin
android {
    compileSdk = 35
    defaultConfig { minSdk = 24 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    packaging {
        resources { pickFirsts.add("META-INF/versions/9/OSGI-INF/MANIFEST.MF") }
    }
}
```

The AAR contributes its activities, service, permissions and camera feature through manifest merging. Verify the merged manifest in the release build.

## Configure and initialise

```kotlin
val options = VoltoxOptions.Builder().apply {
    developerModeEnabled = false
    uiMode = UiMode.ScanFaceAndQrCode
    skipResultScreen = false
    startupLanguage = Language.English
    scanIdUiMode = ScanIdUiMode.CaptureIdAndUploadId
    scanIdOption = ScanIdOption.ScanIdAndNfc
    documentQrCodeEnabled = false
    inactivityTimeoutSeconds = 60   // optional; 0 (the default) disables it
    requiredAge = 21
    deviceType = DeviceType.Terminal
}.build()
VoltoxAgeVerification.initialize(clientId, clientSecret, options)
```

```java
VoltoxOptions.Builder builder = new VoltoxOptions.Builder();
builder.setDeveloperModeEnabled(false);
builder.setUiMode(UiMode.ScanFaceAndQrCode);
builder.setSkipResultScreen(false);
builder.setStartupLanguage(Language.English);
builder.setScanIdUiMode(ScanIdUiMode.CaptureIdAndUploadId);
builder.setScanIdOption(ScanIdOption.ScanIdAndNfc);
builder.setDocumentQrCodeEnabled(false);
builder.setInactivityTimeoutSeconds(60);
builder.setRequiredAge(21);
builder.setDeviceType(DeviceType.Terminal);
VoltoxOptions options = builder.build();
VoltoxAgeVerification.INSTANCE.initialize(clientId, clientSecret, options);
```

**Production settings:** keep `developerModeEnabled` false. Store credentials with your approved secure-configuration process and never log the Client Secret.

**`requiredAge` validation:** must be `null` or a positive integer. Zero and negative values are rejected when options are built and when passed to `start()`. The value set on `initialize()` is the process-wide default; override it per verification by passing `requiredAge` to `start()`.

## Configuration reference

| Option | Values | Purpose |
|---|---|---|
| `developerModeEnabled` | `true` / `false` | Developer and demonstration behaviour. `false` in production |
| `skipResultScreen` | `true` / `false` | `true` returns the result immediately without the SDK result screen |
| `startupLanguage` | Arabic, German, English, Spanish, French, Italian, Portuguese | Initial SDK language |
| `requiredAge` | positive int or `null` | Product threshold. `null` uses 18 |
| `deviceType` | `Terminal` (default), `Kiosk`, `VendingMachine` | Device category, reported with device registration |
| `inactivityTimeoutSeconds` | `0` (default, off) or seconds | Closes an abandoned flow after N seconds without a touch, following a 10-second "Are you still there?" warning. Never applies during the phone step or on the camera face-scan screen |
| `uiMode` | `ScanFaceAndQrCode` | Camera verification and phone QR verification |
| | `QRCodeOnly` | Phone QR verification only |
| | `ScanFaceOnly` | On-device face verification only |
| `scanIdUiMode` | `CaptureIdAndUploadId` | Camera capture and image upload |
| | `CaptureIdOnly` | Camera capture only |
| | `UploadIdOnly` | Existing ID image only |
| `scanIdOption` | `ScanIdAndNfc` | Visual ID and MRZ/NFC verification |
| | `ScanIdOnly` | Visual ID verification only |
| | `NfcOnly` | MRZ/NFC verification only |
| `documentQrCodeEnabled` | `false` | Required document check on the original device |
| | `true` | Hand the document check to the customer's phone |

## Configure the product age

Set `requiredAge` to the minimum legal age for the product. The five-year buffer applies **only** to face estimation.

| Method | Passes when |
|---|---|
| Face estimation | estimated age ≥ `requiredAge` + 5 |
| ID or document | documented age ≥ `requiredAge` |
| MRZ/NFC | documented age ≥ `requiredAge`; age is calculated from the date of birth that unlocked the chip (authenticated value) |
| Phone verification | face rule for a face result, document rule for an ID result |

Examples: `requiredAge = 16` → face 21 passes, document 16 passes · `18` → face 23 / document 18 · `21` → face 26 / document 21. Comparisons are inclusive; for a 21+ product a face estimate of 21 does not pass, the customer continues with document verification.

**Multiple product categories** (e.g. beer 16, tobacco 18): pass the appropriate `requiredAge` to each `start()` call instead of re-initialising. A `start()` override sticks for subsequent calls that don't specify their own. **Do not run differently configured flows concurrently.**

## Phone QR verification

1. The terminal shows a QR code — no countdown while it waits.
2. The customer scans it and follows the instructions on the phone. A **60-second session countdown** now runs on phone and terminal.
3. The phone shows **Completed** when the phone step finishes.
4. The customer returns to the original device for the final accepted/denied result.

> **Completed is not approval.** Only `isVerified` returned to the merchant application is authoritative.

- **Timeout:** the phone flow must finish within 60 s of the scan; retries do not reset it. On expiry the SDK shows a notice and generates a fresh QR.
- If the backend declines a phone scan (e.g. invalid pose), the terminal keeps waiting.
- **Merchant cancellation** from the original device is a denied/incomplete verification.
- Keep the original device **running and online** during the phone step.

## Timeouts at a glance

| | QR phone-session window | Camera face-scan window | NFC chip window | Inactivity timeout |
|---|---|---|---|---|
| Starts | When the phone scans the QR (once per session) | When the scan screen opens | When the NFC screen opens with NFC on | After N s without a touch, if enabled |
| Length | 60 s, fixed | 60 s, fixed | 60 s, fixed | `inactivityTimeoutSeconds` + 10 s warning |
| Before it starts | No timer; QR waits indefinitely | – | – | Off by default (`0`) |
| Shown as | "Time remaining to finish" countdown | Countdown above first line | Countdown above first line | "Are you still there?" with 10 s countdown |
| Paused / reset | Not reset by phone retries | Paused while a capture is processed | Keeps running; a read in progress may finish | Any touch resets; paused during phone step; not used on face-scan screen |
| On expiry | Notice + fresh QR | Flow ends, `isVerified = false` | Flow ends, `isVerified = false` | Flow closes, `isVerified = false` |

With `inactivityTimeoutSeconds = 0` an unscanned QR screen stays up indefinitely. The SDK does not control your own app's idle/restart logic.

## Camera face scan

One 60-second window. Failed attempts (rejected or spoof-flagged scan, missing age, network/API error) return the customer to the camera with the remaining time. **Cancel** → `isVerified = false`, reason *Session cancelled by user.* Window runs out → `isVerified = false`, reason *Session closed due to inactivity.* No idle prompt on this screen. An estimate below threshold routes on to document verification.

## MRZ / NFC chip verification

Available with `scanIdOption = ScanIdAndNfc` or `NfcOnly`. After the MRZ is captured, the customer places the document on the NFC reader.

- One 60-second window for the whole read; a read in progress is allowed to finish.
- **Lost connection** (ID moved/lifted): *Reading Interrupted* → hold steady, automatic retry.
- **Rejected keys** (likely MRZ mis-scan): session denied after three rejections.
- **Age check:** age from the date of birth that opened the chip; below `requiredAge` is denied.
- **Denied:** result screen for 3 s, then `isVerified = false`, reason *NFC verification failed*.

| Device state | Customer sees |
|---|---|
| No NFC hardware | Chip option not offered; if reached, the screen asks to go back and choose another option |
| NFC turned off | Option offered; screen explains how to turn NFC on with a settings shortcut; countdown waits |
| NFC on | Normal flow with the 60 s window |

**External NFC readers** (USB, serial, PC/SC) are not used — the SDK uses the Android NFC stack only. On such hardware offer `scanIdOption = ScanIdOnly` or `documentQrCodeEnabled = true`.

## Privacy and data handling

- Face capture and chip photo are held **in memory only**, never written to disk.
- The chip photo is dropped right after the face match; both images are cleared at session start and end.
- The result Intent carries **only `isVerified` and `reason`** — no date of birth, document number or images.

## Start verification

```kotlin
private val ageVerificationLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode != Activity.RESULT_OK) {
            // No completed SDK result was returned.
            return@registerForActivityResult
        }
        val isVerified = result.data?.getBooleanExtra("isVerified", false) == true
        val reason = result.data?.getStringExtra("reason")
        if (isVerified) {
            // Continue the age-restricted transaction.
        } else {
            // Stop the transaction and optionally display reason.
        }
    }

VoltoxAgeVerification.start(
    context = this,
    launcher = ageVerificationLauncher,
    currentLanguage = Language.English,
    inactivityTimeoutSeconds = 60,
    requiredAge = 16 // optional: overrides the initialize() default for this flow
)
```

`currentLanguage`, `inactivityTimeoutSeconds` and `requiredAge` are optional per-launch overrides. A no-launcher overload exists (`start(context, currentLanguage, inactivityTimeoutSeconds, requiredAge)`) — use it only when you don't need the result callback.

### Java

```java
private final ActivityResultLauncher<Intent> ageVerificationLauncher =
    registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
        if (result.getResultCode() != Activity.RESULT_OK) return;
        Intent data = result.getData();
        boolean isVerified = data != null && data.getBooleanExtra("isVerified", false);
        String reason = data != null ? data.getStringExtra("reason") : null;
        if (isVerified) { /* Continue */ } else { /* Stop */ }
    });

VoltoxAgeVerification.INSTANCE.start(this, ageVerificationLauncher, null, null, null);
// last argument: requiredAge — null keeps the initialize() default
```

## Result contract

| Intent extra | Meaning |
|---|---|
| `isVerified` | Boolean. `true` = the SDK accepted the customer's age |
| `reason` | String with context for a denial, error, timeout or cancellation |

| Outcome | `reason` (English) |
|---|---|
| Age verified | Age verified. |
| Customer cancelled (Cancel, back, tap outside, swipe down) | Session cancelled by user. |
| Inactivity timeout, or face-scan / NFC window ran out | Session closed due to inactivity. |
| NFC chip verification failed | NFC verification failed |
| Any other denial (age not met, spoof, document rejected…) | A short message describing the denial |

`reason` is informational — **decide from `isVerified`, never by matching text.**

> **Fail closed.** If the result is missing, malformed, cancelled (`RESULT_CANCELED` or no data) or does not explicitly contain `isVerified = true`, do not permit the transaction. Closing the very first screen with system back can return `RESULT_CANCELED` with no data — the fail-closed rule covers it.

## Complete Kotlin example

```kotlin
fun beginAgeVerification(productMinimumAge: Int) {
    val options = VoltoxOptions.Builder().apply {
        developerModeEnabled = false
        uiMode = UiMode.ScanFaceAndQrCode
        scanIdOption = ScanIdOption.ScanIdAndNfc
        documentQrCodeEnabled = true
        deviceType = DeviceType.Terminal
    }.build()
    VoltoxAgeVerification.initialize(clientId, clientSecret, options)
    VoltoxAgeVerification.start(
        context = this,
        launcher = ageVerificationLauncher,
        requiredAge = productMinimumAge // set per flow instead of re-initialising
    )
}
```

**Recommended merchant handling:** record only the outcome and identifiers your compliance policy requires; don't infer approval from intermediate UI; don't expose developer mode; stop fulfilment immediately when `isVerified` is false or absent.

## Theme configuration (since 1.0.2)

The SDK fetches and applies your **published branding from the dashboard** automatically — no code changes.

- Checked once each time `start()` launches a verification (never mid-flow).
- Last successful theme is cached; on failure or if no theme is published, the cached theme or default Voltox look is used.
- A newly published theme applies to the next verification.
- Fonts: TTF or OTF (WOFF/WOFF2 not supported), downloaded once and cached; fallback to the default typeface. Built-in families: Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, Nunito, Source Sans 3, Work Sans.
- Logo and font size sliders: 50–150 % (100 % = default).

| Theme field | Effect |
|---|---|
| Primary colour | Header background and default primary button background |
| Secondary colour | Accents (language icon, face-scan circle) |
| Button background / text | Independent primary-button colours |
| Language icon colour | Independent language-selector icon colour |
| Icon circle colour | Circle behind option-card icons and QR banner |
| Background / surface | Screen background, cards, QR banner |
| Text colours | Headings / supporting text |
| Border colour | Outlines and dividers |
| Success / error colours | Result-screen status colour |
| Button corner radius | Themed buttons |
| Logo upload | PNG/JPEG/SVG (SVG needs androidsvg) |
| Show "Powered by Voltox" | Footer credit on/off |
| White label | Hides the footer credit regardless of the toggle |
| Show header / language selector | Hide header bar / language switcher |

Rolling out: some secondary screens (individual ID/MRZ/NFC steps) still use the default palette; header, footer and font apply everywhere.

## Presentation mode (updated in 1.0.7)

Set **Display Mode** in the dashboard: **Fullscreen** (default), **Modal** (centred floating card, dimmed background) or **Bottom Sheet** (drag handle; swipe down cancels). Tapping outside a floating card/sheet cancels like the Cancel button. One mode applies to the whole session; fallback is Fullscreen. `VoltoxOptions.presentationMode` was removed in 1.0.7 — delete that line if present. Test your screen mix (ID capture, NFC) in each mode.

## Production checklist

- Production Client ID and Client Secret
- `developerModeEnabled = false`
- `requiredAge` set for the product before every flow
- Inactivity timeout decided (`0` for a QR screen that never closes on idle)
- Dependencies and merged manifest verified
- Missing and false results handled as denied
- Original terminal stays connected during QR verification
- Exact 16+/18+/21+ boundary tested
- NFC document tested on the actual hardware; another method offered for non-Android readers
- Inactive-subscription messaging visible in every supported layout

## Troubleshooting

| Symptom | What to check |
|---|---|
| SDK does not start | `initialize()` called with non-empty credentials |
| Gradle conflict | Inspect the dependency tree and align versions |
| QR expired | Let the SDK generate a new QR and restart the phone step |
| Countdown on QR screen before scan | You are on 1.0.9 — update to ≥ 1.0.10 |
| "Are you still there?" appears | Inactivity timeout enabled — set `inactivityTimeoutSeconds = 0` or omit it, check `start()` |
| Verification disabled | Subscription active? |
| NFC option missing | No NFC hardware exposed to Android |
| NFC read keeps failing | Hold flat and still; repeated key rejections = MRZ mis-scan, re-scan MRZ |
| No callback | Use the `ActivityResultLauncher` overload and keep the host Activity alive |

When contacting support include `VoltoxAgeVerification.SDK_VERSION` (also reported on the device heartbeat). support@voltox.ch
