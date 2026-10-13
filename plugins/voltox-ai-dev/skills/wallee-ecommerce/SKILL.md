---
name: wallee-ecommerce
description: Build online and in-app payments with the wallee Web Service API v2.0 — JWT authentication, transactions, payment page and iframe, tokens and one-click, charge flow, webhooks with x-signature verification — combined with Voltox web age checks or Smile & Pay. Use when backend code calls app-wallee.com/api, stores tokens, verifies webhooks or designs a checkout.
---

# wallee e-commerce (Web Service API v2.0)

**TRIGGER WHEN:** server or app code calls the wallee API, renders the wallee payment page/iframe, stores or charges tokens, or processes webhooks.

**SYMPTOMS:** `app-wallee.com/api/v2.0`, `Authorization: Bearer` JWT with `requestPath`/`requestMethod`, `space` header, Transaction Service, Token Service, `tokenizationMode`, one-click, `x-signature`, `keyId`, webhook listener, `entityId`.

## Decision workflow
1. **API version:** always `/api/v2.0/…`. v1 is deprecated; removed endpoints return 410.
2. **Authentication:** application user (Account › Users › Application Users). Per request a JWT (`alg HS256`, `typ JWT`, `ver 1`) with `sub` = user id, `iat` = now (seconds), `requestPath` (incl. query), `requestMethod` (uppercase), signed with the application user's key (base64-decode if your library expects raw bytes). Key shown once → vault. Clock in sync (NTP).
3. **Scope header:** set `space` (or `account`) where required.
4. **Card entry:** wallee payment page or iframe (hosted) → card data never touches your servers.
5. **Tokens:** one-click modes Disable / Force Storage / Allow Storage; requires a `customerId` on the transaction and a tokenisation-capable payment method. Charge with token `id`; charge flow as fallback.
6. **Webhooks:** listener per entity; verify `x-signature` (SHA256withECDSA, public key by `keyId` from the Webhook Encryption Service), then **read the entity by `entityId`**; idempotent processing by `eventId`; return 2xx fast and process asynchronously. Allowlist wallee's published webhook IPs if you filter.
7. **Idempotency on your side:** one order → one transaction; store the wallee transaction id before redirecting; recover by reading the transaction, never by creating a second one.
8. **Age:** Voltox web iframe or S2S result verified on the server before creating/fulfilling the order.
9. **Smile & Pay on wallee:** see voltox-smile-and-pay › payments-on-wallee (BUC 40 pattern).

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Calling `/api/` v1 paths | `/api/v2.0/` | Deprecated, no updates |
| Re-using one JWT for many requests | New JWT per request (`iat`, path, method) | Rejected/replay risk |
| Authentication key in frontend/mobile code | Backend only, vault | Full account access |
| Fulfilling on redirect to success URL | Fulfil on verified webhook + entity read (or server-side read) | Redirects can be forged/lost |
| Trusting webhook body state blindly | Verify signature, read entity | Spoofing |
| Creating a new transaction on retry | Read the existing one | Double charge |
| Own card form posting PAN to your server | Payment page / iframe | PCI DSS scope |
| Ignoring clock drift | NTP-synced servers | JWT `iat` window |
