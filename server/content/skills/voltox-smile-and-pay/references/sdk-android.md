---
title: Android Smile & Pay SDK
section: SDKs
order: 2
summary: Take a payment with the customer's face in an Android POS or kiosk app — install, engine start, method channel, start arguments, onPaid payload, decline codes, troubleshooting.
source: Voltox Smile & Pay SDK — Android Integration Guide, Merchant edition (13 Oct 2026)
version: 1.0.0 (guide text states 0.0.3)
---

# Android Smile & Pay SDK

The Voltox Smile & Pay SDK lets an Android point-of-sale or kiosk application take a payment with the customer's face. The SDK shows the complete customer experience (amount, camera, recognition, PIN, result) and **returns one thing to your application: a successful payment**. Your application only supplies the amount and fulfils the order.

> **Use the SDK result.** Fulfil the order only when the SDK reports a successful payment (`onPaid`). Declines, customers who are not enrolled, a missing card and network errors are handled and explained on screen by the SDK; they are never reported to your application as a payment.

## Quick-start checklist

1. Sign in at https://dashboard.voltox.ai and copy your **Merchant Client ID** (and optionally the Client Secret).
2. Add the downloaded AAR to `app/libs`.
3. Add the Flutter repository and the required dependencies.
4. Declare `FlutterActivity` in your manifest.
5. Start the SDK engine once in your `Application`.
6. Send `start` with the amount, open the screen and handle `onPaid`.

## Platform requirements

| Item | Requirement |
|---|---|
| minSdk | 24 |
| compileSdk | 36 (CameraX and ML Kit pull in androidx.core 1.17) |
| Java / Kotlin | Java 17 source and target compatibility |
| Connectivity | Internet access required |
| Hardware | Device with a front camera |
| Account | Voltox merchant account with a connected payment account (today: Stripe) and a Merchant Client ID |
| ABIs | arm64-v8a, armeabi-v7a, x86_64 |

## How the payment works

1. **Default view.** The customer sees the amount and taps **Pay**.
2. **Smile.** The front camera opens. The SDK guides the customer ("Move closer", "Move left"…) and takes one photo as soon as the face is centred and steady — in the customer's language.
3. **Recognizing you…** Photo and amount are sent to Voltox. The amount is bound to this payment session.
4. **PIN** (only if the customer set one). 4-digit PIN screen; a wrong PIN can be retried on the same session.
5. **Charge.** The saved card is charged for exactly the amount you sent.
6. **Success.** The SDK shows the amount charged and calls your application.

## What the customer sees

| Situation | Screen | Reported to your app |
|---|---|---|
| Face recognised, card on file | Charge, then Success with the amount | `onPaid` |
| Face recognised, PIN set | Enter PIN, then charge | `onPaid` after the charge |
| Face not enrolled | *New to Smile & Pay?* with QR code and Register button | nothing |
| Spoof attempt, no face, poor light or pose, other decline codes | Red failure screen *Face verification failed* with reason and *Try again* | nothing |
| Enrolled but no saved card | Failure screen *No payment method* | nothing |
| Backend refuses or fails the payment | Failure screen *Payment failed* with the backend's message | nothing |
| Offline or timeout | Failure screen *Payment failed* with a connection message | nothing |
| Camera permission denied or camera unavailable | Failure screen *Camera problem* | nothing |

Every retry starts a new face search: **payment sessions last 5 minutes and can be used once**. The header back arrow, *Go back* and *Done* return to the first screen.

## Install

### 1. Add the AAR
Place the file at `app/libs/smile-and-pay-sdk.aar` (rename the downloaded `smile-and-pay-sdk_v….aar`).

### 2. Repositories (`settings.gradle.kts`)
```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://storage.googleapis.com/download.flutter.io") }
    }
}
```

### 3. Dependencies — Kotlin DSL
```kotlin
dependencies {
    implementation(files("libs/smile-and-pay-sdk.aar"))
    // Flutter engine (the SDK UI runs on it)
    val engine = "1.0.0-e4b8dca3f1b4ede4c30371002441c88c12187ed6"
    implementation("io.flutter:flutter_embedding_release:$engine")
    implementation("io.flutter:arm64_v8a_release:$engine")
    implementation("io.flutter:armeabi_v7a_release:$engine")
    implementation("io.flutter:x86_64_release:$engine")   // emulators
    // Camera and face detection
    implementation("androidx.camera:camera-core:1.6.0")
    implementation("androidx.camera:camera-camera2:1.6.0")
    implementation("androidx.camera:camera-lifecycle:1.6.0")
    implementation("androidx.camera:camera-video:1.6.0")
    implementation("com.google.guava:guava:33.5.0-android")
    implementation("com.google.mlkit:face-detection:16.1.7")
    implementation("androidx.browser:browser:1.9.0")
    implementation("androidx.core:core:1.17.0")
}
```

### Groovy DSL
```groovy
dependencies {
    implementation files('libs/smile-and-pay-sdk.aar')
    def engine = '1.0.0-e4b8dca3f1b4ede4c30371002441c88c12187ed6'
    implementation "io.flutter:flutter_embedding_release:$engine"
    implementation "io.flutter:arm64_v8a_release:$engine"
    implementation "io.flutter:armeabi_v7a_release:$engine"
    implementation "io.flutter:x86_64_release:$engine"
    implementation 'androidx.camera:camera-core:1.6.0'
    implementation 'androidx.camera:camera-camera2:1.6.0'
    implementation 'androidx.camera:camera-lifecycle:1.6.0'
    implementation 'androidx.camera:camera-video:1.6.0'
    implementation 'com.google.guava:guava:33.5.0-android'
    implementation 'com.google.mlkit:face-detection:16.1.7'
    implementation 'androidx.browser:browser:1.9.0'
    implementation 'androidx.core:core:1.17.0'
}
```
If your app already uses CameraX, ML Kit, guava or androidx, Gradle selects one compatible version — check the dependency report.

### 4. Android configuration
```kotlin
android {
    compileSdk = 36
    defaultConfig { minSdk = 24 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
```

### 5. Manifest
The AAR contributes camera and internet permissions and its own components through manifest merging. Add the activity that hosts the SDK screen:
```xml
<application ...>
    <activity
        android:name="io.flutter.embedding.android.FlutterActivity"
        android:exported="false"
        android:theme="@android:style/Theme.DeviceDefault.Light.NoActionBar"
        android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
        android:hardwareAccelerated="true"
        android:windowSoftInputMode="adjustResize" />
</application>
```
The SDK requests the camera permission the first time the camera opens.

## Start the SDK engine

Create the engine once in your `Application` class and keep it in the engine cache — the payment screen then opens instantly.

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val engine = FlutterEngine(this)
        engine.dartExecutor.executeDartEntrypoint(DartExecutor.DartEntrypoint.createDefault())
        FlutterEngineCache.getInstance().put("smile_and_pay", engine)
    }
}
```
Register it with `android:name=".App"` on `<application>`.

## Start a payment and receive the result

The application talks to the SDK over **one method channel, `ai.voltox.smile_and_pay`**.

```kotlin
class CheckoutActivity : AppCompatActivity() {
    private val channel by lazy {
        val engine = FlutterEngineCache.getInstance().get("smile_and_pay")!!
        MethodChannel(engine.dartExecutor.binaryMessenger, "ai.voltox.smile_and_pay")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The SDK reports a successful payment here.
        channel.setMethodCallHandler { call, result ->
            if (call.method == "onPaid") {
                val paymentIntentId = call.argument<String>("paymentIntentId")
                val amountMinorUnits = call.argument<Int>("amountMinorUnits")
                val currency = call.argument<String>("currency")
                val appPaymentId = call.argument<String?>("appPaymentId")
                // 1. Fulfil the order.
                // 2. Come back to this screen (closes the SDK screen).
                startActivity(Intent(this, CheckoutActivity::class.java).addFlags(
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
                result.success(null)
            } else {
                result.notImplemented()
            }
        }
    }

    fun payBySmile(amountMinorUnits: Int) {
        channel.invokeMethod("start", mapOf(
            "clientId" to "<your Merchant Client ID>",
            "amountMinorUnits" to amountMinorUnits, // 1560 = 15.60
            "currency" to "EUR"                      // CHF, EUR or USD
        ))
        startActivity(FlutterActivity.withCachedEngine("smile_and_pay").build(this))
    }
}
```

Call `start` again for each customer — every `start` opens a fresh payment, even with the same amount. **The configuration of the first call is kept for the lifetime of the process.**

### `start` arguments

| Argument | Type | Purpose |
|---|---|---|
| `clientId` | String | **Required.** Merchant Client ID from the dashboard |
| `amountMinorUnits` | Int | **Required.** Amount in minor units (cents). **Minimum 500 (5.00)** |
| `currency` | String | `CHF`, `EUR` (default) or `USD` |
| `clientSecret` | String? | Optional. Registers the device with Voltox (see Device registration) |
| `baseUrl` | String? | Optional. Defaults to `https://backend.voltox.ai` |
| `checkAge` | Boolean? | Default `false`. When `true`, minors are declined (DR14) |
| `developerMode` | Boolean? | Default `false`. Shows a testing gear icon. Keep `false` in production |
| `inactivityTimeoutSeconds` | Int? | Default `0` (off). After N seconds without a touch the SDK asks "Are you still there?" and returns to the first screen after a 10-second countdown |

### `onPaid` payload

| Field | Type | Meaning |
|---|---|---|
| `paymentIntentId` | String | The payment-provider payment intent that was charged (Stripe today) |
| `amountMinorUnits` | Int | Amount actually charged, in minor units |
| `currency` | String | ISO code, upper-case |
| `appPaymentId` | String? | Voltox payment id, when present |

**Closing the SDK screen:** `onPaid` is sent as soon as the charge succeeds. Bringing your own activity to the front (as above) closes the SDK screen. If you do nothing, the Success screen stays until the customer taps *Done*.

## Languages

Starts in the device language if English, German, Portuguese, Italian, Spanish or French (English otherwise) and shows a flag picker. The choice resets for the next customer. Messages from the Voltox backend are shown as received and are not translated.

## Device registration

When you pass `clientSecret`, the SDK registers the terminal with Voltox at start and every 60 seconds while the app runs. Registration failures never interrupt a payment. Store the Client Secret with your approved secure-configuration process and never log it.

## Decline codes

See the full table in [Decline codes](docs://voltox/reference/decline-codes). **Spoof protection:** a spoof attempt (DR09) or evasion (DR10) is always declined with its reason, even when the face is unknown to Voltox. It is never sent to the registration screen and never reaches a charge.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Build asks for compileSdk 36 or later | CameraX and ML Kit depend on androidx.core 1.17. Raise `compileSdk` to 36 (does not change `targetSdk`) |
| Gradle cannot find `io.flutter:*` | Add `https://storage.googleapis.com/download.flutter.io` to repositories |
| `start` throws `MissingPluginException` | Engine not started or not cached under `smile_and_pay`. Create it in `Application.onCreate` |
| "Invalid merchant client id." | `clientId` wrong or from another environment |
| "Amount must be at least 5.00." | Send `amountMinorUnits` ≥ 500 |
| Camera does not open | Permission denied; customer sees *Camera problem*; allow camera in system settings |
| Black screen, nothing after Pay | Check network connection and that the camera is connected |

Support: support@voltox.ch
