---
title: E-commerce with wallee
section: Guides
order: 4
summary: Online and in-app checkouts with the wallee API v2.0 — JWT authentication, payment page/iframe, tokens, webhooks — combined with Voltox web age checks and Smile & Pay.
source: wallee Web Service API v2.0 documentation
---

# E-commerce with wallee

Voltox verifies age or the person; **wallee** takes the online payment. Card data never touches your servers.

## Architecture

```
Browser/App ──► Voltox web iframe / S2S QR   (age result verified on YOUR server)
     │
     └──► wallee payment page / iframe       (card entry, 3-D Secure, tokens)
Your backend ──JWT──► wallee API v2.0         (create/read transaction, tokens)
wallee ──webhook (x-signature)──► your backend → read entity → fulfil exactly once
```

## Steps

1. **API v2.0 only** (`https://app-wallee.com/api/v2.0/…`).
2. **Authenticate per request** with a fresh JWT (HS256; claims `sub`, `iat`, `requestPath`, `requestMethod`) signed with the application user key. Keep the key in a vault on the backend; keep clocks NTP-synced.
3. **Age:** run the Voltox web age check and verify the result on the server **before** creating or fulfilling the order.
4. **Card entry** on the wallee payment page or iframe.
5. **Tokens / one-click:** set a `customerId` and the tokenisation mode (Disable / Force Storage / Allow Storage); charge later with the token id.
6. **Webhooks:** verify `x-signature` (SHA256withECDSA, public key by `keyId`), then **read the entity by `entityId`**, process idempotently, answer 2xx fast.
7. **Fulfil exactly once** per payment reference — never on the success redirect alone.

## Don'ts

| Don't | Do |
|---|---|
| `/api/` v1 paths | `/api/v2.0/` |
| Reuse one JWT | New JWT per request |
| Authentication key in frontend/mobile code | Backend vault only |
| Fulfil on redirect | Fulfil on verified webhook + entity read |
| New transaction on retry | Read the existing one |
| Own card form | wallee payment page / iframe |

Code skeletons: `voltox_generate_code` targets `wallee-jwt` (TypeScript, Python, C#), `wallee-webhook` and `idempotent-fulfilment`.
