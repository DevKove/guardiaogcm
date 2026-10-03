# Security audit — Guardião GCM

Audit date: 2026-10-03. Scope: GitHub source tree, deployed Supabase database metadata/policies, security advisors, and the historical tracked `.env` file available for review. This is a source/configuration audit, not a penetration test or operational certification.

## Changes applied

- Removed the public sign-up option from the login screen and made login errors generic.
- Changed the Auth user trigger so new accounts receive an application role only when the trusted, admin-managed `app_metadata.cad_provisioned=true` flag is present. Public self-signups can no longer automatically become CAD operators. Existing roles were intentionally left unchanged.
- Updated the admin user creation function to set that trusted marker, validate UUIDs, use a corrected email validator, require 12-character passwords for password changes/new users, limit request size, restrict browser origins, avoid caching administrative responses, and avoid returning raw backend errors.
- Pinned `search_path` for `public.touch_equipe_updated_at()` to `pg_catalog`.
- Added a dependency update policy through Dependabot.

## Findings by requested control

| # | Control | Status / finding |
|---|---|---|
| 1 | Exposed environment variables | The current tree contains `.env.example`, not a live `.env`. The historical tracked `.env` version reviewed contained project identifiers/URL and publishable keys, not a service-role key. A full all-commit secret scan has not been run. |
| 2 | Frontend validation | Frontend constraints exist but are not a security boundary. Server/database validation remains necessary for every field and operation. |
| 3 | Backend validation | Partial. The admin Edge Function validates key inputs; database guards protect occurrence lifecycle fields. Comprehensive schema-level length/range validation and negative tests remain. |
| 4 | SQL injection | No dynamic SQL construction was identified in the reviewed database functions. Supabase query-builder filters use parameterized API calls. This is not a substitute for a full code scan. |
| 5 | Weak authentication | Supabase Auth is used. Public signup was removed from the UI and untrusted new users no longer receive a role automatically. Disable public signups in Supabase Auth settings as defense in depth. |
| 6 | IDOR/BOLA | RLS is enabled on the reviewed public tables and role-specific policies exist. Several tables intentionally allow all authorized staff to read operational records; verify this matches municipal policy. Automated cross-user authorization tests are still needed. |
| 7 | Plaintext passwords | Application tables do not store passwords; Supabase Auth manages credentials. Admin-managed password changes now require at least 12 characters in the UI/Edge Function. Configure the same minimum in Supabase Auth. |
| 8 | Brute force | Supabase Auth has platform rate controls, but the live rate-limit configuration was not available through this audit. No custom per-account/application throttling was verified. |
| 9 | Duplicate submission | Login and key operational forms disable submission while busy. A complete review of every form and server-side idempotency behavior remains. |
| 10 | CSRF | The browser uses bearer access tokens rather than an app-managed cookie session, which reduces conventional CSRF exposure. XSS/token theft remains a concern; no cookie-based server session was identified in the reviewed files. |
| 11 | Upload validation | No user-file upload path was identified in the reviewed application flows. Recheck before adding attachments/storage uploads. |
| 12 | Information disclosure/XSS | Login errors are generic. The admin function source now avoids returning raw backend exceptions, but its new version still requires successful deployment verification. A full XSS sink scan and review of external error reporting remain. |
| 13 | Vulnerable dependencies | Lockfile is committed, but a complete package vulnerability audit has not run in this environment. Dependabot configuration was added; review alerts and keep updates current. |
| 14 | Token handling | Supabase sessions persist in browser storage with auto-refresh. This is compatible with the static SPA but tokens are not HttpOnly; minimize XSS, use short access-token lifetime where operationally appropriate, and protect administrator accounts with MFA. |
| 15 | Rate limiting | No custom rate limiter was confirmed for administrative actions. Configure Auth rate limits and consider server-side throttling for sensitive endpoints. |
| 16 | Sensitive data exposure | Occurrence records include caller identity/contact details, addresses, narratives, and involved-person data. RLS currently permits staff-wide reads for operational continuity; formally approve that access model and restrict exports/logs. |
| 17 | SSRF | No user-controlled server-side URL fetch path was identified in the reviewed functions. Reassess if external integrations or URL import features are introduced. |
| 18 | Insecure cookies | The reviewed SPA does not implement its own authentication cookies; Supabase tokens use browser storage. Cookie flags are therefore not applicable to this client flow. |
| 19 | CORS | The admin function source now uses an explicit origin allowlist instead of `*`. Deployment of that Edge Function must be confirmed separately; repository changes alone do not update a deployed Supabase function. |

## Required dashboard actions

1. Supabase Dashboard → Authentication → Settings: disable public signups for this internal CAD, unless there is a documented reason to permit them.
2. Enable leaked-password protection. The Supabase security advisor reported it disabled.
3. Set the minimum password length to 12 or higher and review password policy/MFA for administrators.
4. Review Auth rate limits, session lifetime, email confirmation and recovery settings.
5. Verify the new `admin-users` Edge Function version is deployed before relying on its CORS/error-handling changes.
6. Review historical Git commits and rotate any credential if a service-role/secret key is ever found. The historical `.env` file reviewed here contained publishable keys only.
7. Run a clean dependency audit, build/lint, and authorization tests using separate admin, supervisor, operator, and unprivileged accounts before operational use.

Do not treat this audit as proof that the system is fully secure or certified for live emergency/public-safety operations.
