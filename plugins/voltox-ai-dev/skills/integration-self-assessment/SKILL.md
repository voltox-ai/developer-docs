---
name: integration-self-assessment
description: Run the hard acceptance self-assessments for Voltox × wallee integrations — Terminal/UVM (based on the wallee ep2 Integration Self-Assessment) and API/e-commerce/cloud (security, OAuth, webhooks, idempotency, performance). Use before a pilot, before go-live, after major changes, or when someone asks whether an integration is ready, compliant or acceptable.
---

# Integration self-assessment

**TRIGGER WHEN:** a team wants to know if an integration is ready for pilot or production, prepares wallee acceptance or an ep2/UVM check, or changes a live integration.

**SYMPTOMS:** "are we ready", "go-live", "acceptance", "Abnahme", "self-assessment", "QA", "certification", "pilot", "audit".

## The two catalogues
| Kind | Covers | Basis |
|---|---|---|
| `terminal` | Attended (AT) and unattended (UAT) integrations with wallee terminals: ECR/VM behaviour, power failure, recovery, receipts, brands, MDB, plus Voltox gates (VX-*), surrogate PAN (SUR-*) and device security (SEC-*) | wallee ep2 Integration Self-Assessment V1.0 (41 requirements, 45 tests) + extensions |
| `api` | Server, cloud and e-commerce integrations: auth (OAuth 2.1/FAPI 2.0, wallee JWT v2.0), secrets, TLS, webhooks, idempotency, errors and retries, data protection, PCI scope, stored credentials (BUC 40), performance, observability, supply chain, network (incl. SCION) | Industry standards listed in integration-security |

Get them with `voltox_self_assessment_get` and evaluate results with `voltox_self_assessment_evaluate`.

## Rules (hard)
1. **Obligation:** mandatory · conditional (applies when the function is used; otherwise n/a with reason) · optional.
2. **Results:** passed · failed · not run · waived (approved in writing by wallee or Voltox) · waiver req. · check · n/a.
3. **Status:** **NOT ACCEPTABLE** if any applicable mandatory item is failed, not run, check or waiver requested. **ACCEPTABLE** only when every applicable mandatory item is passed or waived. Optional items never block, but are reported.
4. **Evidence required** for every passed mandatory item (log extract, screenshot, test record, configuration export, photo). No evidence = not run.
5. **Retests** recorded separately (WA-OK / WA-NOK); the final result is the last valid one.
6. **Security level** (L1/L2/L3) selects additional mandatory items in the API catalogue.
7. **Re-run** after every SDK/terminal software update, interface change or new product/channel.
8. The assessment **prepares** acceptance; wallee (terminal integration), the ep2 bodies and the vending-approval engineers decide.

## Workflow
1. Fill in the characteristics (product, channel, interface, devices, ep2 version, TID/space, brands, level).
2. Mark every item's applicability.
3. Run tests on the target hardware and network; attach evidence.
4. Evaluate with `voltox_self_assessment_evaluate`; fix; retest.
5. Send the report to wallee/Voltox for review.
