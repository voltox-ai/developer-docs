# Terms introduced by this toolset

Only terms defined here; general payment terms (PAN, TID, ECR, CVM…) are not repeated.

| Term | Meaning |
|---|---|
| **L1 / L2 / L3** | Security levels for an integration. **L1 Pilot**: test environment, limited devices, no production money. **L2 Production** (default): live merchants, all mandatory controls. **L3 Regulated / high volume**: L2 plus stronger client authentication (mTLS or `private_key_jwt`), sender-constrained tokens (DPoP), external penetration test, 24/7 monitoring. |
| **BestPracticeKey** | Short phrase returned when a skill is read through `voltox_get_skill_guide`. It rotates every hour and is required by write tools — proof that the rules were read. Not a secret. |
| **Blueprint** | The integration plan returned by `voltox_plan_integration`: architecture, method, auth, timeouts, error handling, code skeleton, tests. |
| **Gate** | A point in the flow that must return an explicit success before the flow continues (age gate, payment gate, delivery gate). |
| **Fail closed** | Any result other than an explicit success counts as "no". |
| **Surrogate domain** | The set of terminals that compute surrogate PANs with the same key and data list, so the same card gives the same value. |
| **Tap first** | Unattended pattern: read the card (surrogate PAN) before starting the camera, to recognise returning customers. |
| **Parallel reservation** | Optional speed pattern: start a reservation while the age gate runs, cancel it immediately on denial. |
| **Available / Confirm with wallee** | Status of a statement: publicly documented, or to be confirmed for your contract and device before you build on it. |
