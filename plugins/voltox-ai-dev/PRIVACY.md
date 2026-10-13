# Privacy Policy — Voltox AI Dev MCP server

Controller: Voltox (contact details on the Voltox website). Applicable law: Swiss Federal Act on Data Protection (nDSG/FADP) and, where applicable, the EU GDPR.

## What is processed

| Data | Purpose | Storage |
|---|---|---|
| Tool requests (questions, plan inputs, code submitted for review, self-assessment results) | Answer the request | Processed in memory only; not stored |
| OAuth client registration (client name, redirect URI) | Allow Claude/ChatGPT to connect | Stored until deleted or expired |
| OAuth grant and tokens | Keep you connected | Tokens stored hashed; grant props encrypted; access tokens 15 min, refresh tokens up to 30 days |
| Voltox API Client ID and Client Secret (only if you choose API access) | Call the Voltox API on your behalf | Encrypted inside your grant; never logged, never returned to the AI client |
| Operational metadata (timestamp, endpoint, tool name, status code, duration) | Security and reliability | Cloudflare Workers logs, short retention |

## What is never processed

Card numbers (PAN), card authentication data, biometric data (face images or templates), identity documents. Inputs that look like these, secrets or tokens are rejected before processing.

## Processors

Cloudflare, Inc. (hosting, Workers and KV). The AI client you use (for example Anthropic or OpenAI) processes your conversation under its own terms.

## Your rights

You can disconnect at any time in your AI client, which ends the session; grants expire automatically. To request deletion of a grant or exercise your rights (access, correction, deletion, objection), contact Voltox.

## Changes

Material changes are announced on the Voltox developer site.
