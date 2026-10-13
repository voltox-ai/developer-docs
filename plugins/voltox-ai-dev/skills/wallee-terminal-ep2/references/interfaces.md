# wallee till interfaces (public documentation summary)

Sources: wallee LTI documentation (lti.docs.wallee.com, version 2.54), wallee Android Till SDK (github.com/wallee-payment/android-till-sdk), wallee terminal documentation (app-wallee.com/doc/payment/terminal). Always check the current version before you build.

## ATI — Android Till SDK
- Library for an app running **on** the wallee Android terminal. Dependency `com.wallee.android.till:sdk:{version}` from the wallee package repository (snapshot `sdk-dev` exists).
- `ApiClient` with a `ResponseHandler`; call `bind()` to connect to the terminal service.
- Operations: authorise transactions (purchase, credit, reservation, reservation adjustment), complete or void reservations, cancel last transaction, submission, transmission, final balance, generate card PAN token, pinpad information, configuration and initialisation, custom configuration, reprint last receipt.
- Optional: kiosk mode, transaction interception activities, ProGuard rules, log forwarding to Paydroid VSD, overlay permission (Android 10+) to return to your app after a transaction.
- wallee Paydroid should remain the home app. Testing and publication of ATI apps: contact wallee.

## LTI — Local Till Interface
- TCP/IP; **the till is always the client**; terminal listens on a configurable port (default **50000**).
- Framing: 4-byte big-endian unsigned length, then the XML payload. Namespaces `vcs-pos` (PoS messages), `vcs-device` (device messages).
- Message types by root suffix: `Request`, `Response`, `Notification`. A use case ends with its response or an `errorNotification`. The terminal may send `confirmationRequest` (with `timeout`, optional `timeoutReminder`).
- Message families:
  - Transactions: FinancialTrx, Reversal, CancelReservation, CommitAuthorisationPurchase, AdaptAmount (vending only)
  - Maintenance: Activation, SiConfig, Deactivation, SIInit, ConfigData, Ping
  - Day-end: BEFinalBalance, MISubmission, BETransmission, IntermediateEodReceipt
  - Receipts: ReprintReceipt, PrinterNotification, PrintCurrencyRateTicket
  - Interaction: DisplayNotification, Confirmation, CheckCouponId, PinpadInformation
  - Card identifiers: **PanHash** (current), GeneratePanToken (deprecated)
  - Status: TransactionStatusNotification (CardEntry, CardRemoval, TransactionStart, TransactionEnd, TransactionAbort, QrCodeScan), selected by the `trxInfo` bitmask; trxUpdateNotification; ErrorNotification; AbortCardEntryNotification
  - Power: Sleep / low-power messages
- References: `merchantReference` (your value, echoed back), `trxSyncNumber` (out-of-sync detection, updated after each successful transaction), `transactionRefNumber` (for reservation adjustment/purchase reservation), `origTrxSeqCnt` (reversal target).
- AbortCardEntryNotification has no response; the transaction continues if the card was already read, otherwise ends with `errorNotification`. `silentAbort` suppresses the abort screen.
- trxUpdateNotification changes amount/text before a card technology is chosen; any content extends the present-card timeout.
- AdaptAmount (vending only) adapts the last transaction's amount; fails if declined/reversed, other currency, or above the authorised amount.
- ReprintReceipt `TRX`/`EOD` returns last transaction / reversal / cancel-reservation data.

## CTI — Cloud Till Interface
- Public API through the wallee cloud; works from any network; higher latency.
- Flow: terminal online → create transaction (Transaction Service `create`) → process via long polling or WebSocket.
- Long polling: `performTransaction` keeps the request open up to ~80 s; HTTP **543** means "call again with the same parameters" (sample retries up to 10 times). Terminal by id or by identifier (pattern `3xxx xxxx`).
- WebSocket: STOMP, `wss://app-wallee.com/terminal-websocket`, notification/question/error messages, resume after a dropped connection until timeout.
