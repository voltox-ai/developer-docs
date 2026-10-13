# Security

## Reporting a vulnerability

Please report vulnerabilities privately to Voltox security (see the contact on the developer site) or via GitHub *Security → Report a vulnerability*. Do not open public issues for security problems. We acknowledge within 3 business days.

## Design summary

- **OAuth 2.1** authorization server (Cloudflare `workers-oauth-provider`): PKCE S256 only, dynamic client registration, RFC 8707 resource indicators, RFC 9728 protected-resource metadata, consent page with CSRF-bound one-time handles and `frame-ancestors 'none'`.
- Access tokens 15 min, refresh tokens rotate on use (30 days). Tokens stored hashed; grant props (incl. Voltox credentials) encrypted with token-derived keys.
- **No token passthrough**: AI clients only hold tokens for this server.
- Scopes: `voltox.docs`, `voltox.api.read`, `voltox.api.write` — chosen by the user.
- Writes require the skill's hourly **BestPracticeKey** and explicit `confirm=true`; production writes off by default.
- Input guard rejects private keys, JWTs, credential assignments, cloud keys, embedded images and Luhn-valid card numbers.
- Stateless MCP endpoint, 1 MB body limit, HSTS, `nosniff`, `no-referrer`, strict CSP on HTML.
- Supply chain: lockfiles, pinned versions, CI typecheck + tests; enable Dependabot and secret scanning on the repository.
