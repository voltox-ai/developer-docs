---
title: Voltox AI Dev MCP (Claude, ChatGPT)
section: Start
order: 4
summary: Connect Claude, Claude Code or ChatGPT to the Voltox AI Dev MCP server — sign-in, access levels, tools, skills and the safety model.
---

# Voltox AI Dev MCP

The **Voltox AI Dev MCP** server brings this whole documentation, the best-practice skills, an integration assistant, code generation, automatic code review and the hard self-assessments into your AI assistant. It follows the Model Context Protocol (MCP).

## Connect

Server URL: `https://<voltox-mcp-host>/mcp` (shown on the Voltox developer site).

| Client | How |
|---|---|
| **Claude** (web, desktop) | Settings → Connectors → *Add custom connector* → paste the server URL → *Connect* |
| **Claude Code** | `claude mcp add --transport http voltox-ai-dev <server URL>` — or install the plugin: `/plugin marketplace add voltox-ai/developer-docs` then `/plugin install voltox-ai-dev@voltox-ai-dev` |
| **ChatGPT** | Settings → Apps & Connectors → Advanced → *Developer mode* → *Create* → paste the server URL, authentication OAuth |

## Sign in and access levels

The first connection opens the Voltox consent page:

| Access | What you get | Needs |
|---|---|---|
| **Documentation** (recommended to start) | Docs, skills, planning, code, review, self-assessments | Nothing |
| **+ API read** | Read operations of the Voltox API | Voltox Client ID + Secret (test first) |
| **+ API write** | Write operations — each needs the skill's BestPracticeKey and your confirmation | Voltox Client ID + Secret |

Your credentials are stored encrypted inside your OAuth grant only and are never shown to the AI. Access tokens live 15 minutes; refresh tokens rotate. Disconnect in your AI client at any time.

Get Voltox credentials in the dashboard — see [Getting started](getting-started.md).

## Tools

| Tool | Purpose |
|---|---|
| `voltox_get_skill_guide` | Read a best-practice skill (returns its BestPracticeKey) |
| `voltox_search_docs`, `voltox_get_doc` | Search and read this documentation |
| `voltox_plan_integration` | Asks for product, integration type, method, language and security level, then returns a blueprint |
| `voltox_generate_code` | Fail-closed, secret-free code skeletons |
| `voltox_review_integration` | Automatic checker with `best_practice_warnings` |
| `voltox_reference` | Decline codes, age thresholds, timeouts, performance budget |
| `voltox_self_assessment_get` / `_evaluate` | Terminal and API acceptance catalogues and the hard evaluation |
| `voltox_connection_status` | Mode, sign-in state, scopes, API registry |
| `voltox_api_call` | Registered Voltox API operations (guarded) |

Prompts: `build-integration` (end to end: study your app → gap and security analysis → plan → implement → review → self-assessment), `start-integration`, `review-my-code`, `run-self-assessment`.

## Skills (must be consulted)

`voltox-integration-guide` (entry) · `voltox-age-verification` · `voltox-smile-and-pay` · `voltox-face-recognition` · `voltox-kyc` · `wallee-terminal-ep2` · `wallee-softpos` · `wallee-ecommerce` · `vending-mdb-uvm` · `surrogate-pan` · `integration-security` · `integration-self-assessment`

Each skill has **TRIGGER WHEN** and **SYMPTOMS**, a decision workflow, anti-patterns and references loaded on demand.

## Safety model

- Read-only by default; production writes disabled by default.
- Writes require the BestPracticeKey of the matching skill (rotates hourly) **and** your confirmation.
- Card numbers, secrets, tokens and images are rejected.
- Generated code fails closed; statements about wallee/ep2 are marked *Available* or *Confirm with wallee*; nothing is ever "certified" by the tool.

## Example

> "I want to sell age-restricted drinks from a vending machine with a wallee terminal, Kotlin, production."

The assistant reads the integration guide, asks the missing questions (card recognition? age thresholds?), returns pattern P2 with LTI, the double-commit money flow, the surrogate-PAN tap-first option, timeouts and the performance budget, generates the code skeletons, reviews your code and finally runs the terminal self-assessment for UAT.
