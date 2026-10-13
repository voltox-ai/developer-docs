# Performance budget

Speed is a hard requirement. The budgets below are **acceptance targets** for Voltox × wallee integrations (measured at the 95th percentile on the production device, production network, real customers or realistic test runs). They are not marketing claims; measure and report them in the self-assessment (API-PERF-*, VX-PERF-*).

| Step | Target p95 | Notes |
|---|---|---|
| App/kiosk ready after boot | ≤ 30 s | Auto-start, SDK initialised, terminal activated, no manual step |
| Voltox SDK screen open after trigger | ≤ 500 ms | Initialise at app start; Smile & Pay: cached Flutter engine |
| Face capture → age decision (no document) | ≤ 3 s | Voltox publishes "under three seconds" for facial age estimation only |
| Face capture → Smile & Pay `onPaid` | ≤ 5 s | Includes recognition, optional PIN excluded, charge |
| Card tap → surrogate PAN available | ≤ 1 s | LTI `PanHash` / `panHashVariants` on the transaction |
| Card tap → payment result (online, CTLS, no PIN) | ≤ 3 s | Depends on acquirer; measure end to end |
| Server API call (wallee API v2.0, Voltox API) | ≤ 800 ms | Excluding long polling |
| Webhook received → order state final | ≤ 2 s | Process asynchronously, idempotent |

## How to hit the budget

1. **Warm everything early.** Initialise the Voltox SDK and bind the wallee Till SDK at application start. Smile & Pay: create the Flutter engine once in `Application.onCreate` and cache it.
2. **Use the shortest network path.** For terminals in the same network use **LTI** (direct TCP socket; wallee documents it as faster than the cloud interface). Use **CTI** only when no local path exists; it long-polls up to ~80 s and answers HTTP `543` when you must call again.
3. **Keep connections open.** Reuse HTTP/2 connections and TCP sockets; no new TLS handshake per request.
4. **Tap first, camera second (unattended).** Recognise returning, already-verified cards via surrogate PAN and skip the camera when policy allows.
5. **Parallel, but safe (optional, L2+).** You may start a *reservation* on the terminal while the age check runs, **only** if you cancel the reservation immediately when the age check fails or times out. Never start a *purchase* in parallel with an age gate.
6. **No synchronous work in the result path.** Fulfil first, then write analytics/logs asynchronously (without personal data).
7. **Measure every step.** Record timings per step (start, capture, decision, authorisation, fulfilment) as numbers only — no images, no PAN, no names.
8. **Wired beats wireless.** Prefer LAN; for 4G watch the data volume and schedule updates on LAN/WLAN.

## Things that look fast but are wrong

| Shortcut | Why it is forbidden |
|---|---|
| Deferred/offline authorisation | Declined deferred transactions are the merchant's loss; requires written wallee approval |
| Skipping the result check ("approve on timeout") | Violates fail-closed |
| Caching an age decision on the device by face image | Biometric data must not be stored outside the agreed Voltox process |
| Re-using one Voltox session for several customers | Sessions are single-use (Smile & Pay: 5 minutes, one charge) |
