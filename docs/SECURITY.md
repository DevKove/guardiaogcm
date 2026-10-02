# Security hardening and deployment checklist

This patch adds database protections, transactional occurrence operations, and safer environment-file handling. It does not automatically change project-level Supabase Auth settings or execute SQL against the hosted database.

## Before deploying

1. Back up the database and test this migration in a staging project first:
   `supabase/migrations/20261002120000_security_hardening.sql`.
2. Apply the migration through the project's normal Supabase migration workflow. Confirm all statements succeed.
3. In Supabase Dashboard → Authentication → Settings (the exact menu may vary), disable public sign-ups if this is an internal municipal CAD. Create/invite accounts only through the controlled administrator workflow. The database trigger now assigns new accounts the `operador` role; it no longer grants admin based on signup order.
4. Verify at least one trusted administrator already exists before deploying. If no admin exists after applying the migration, use a controlled, authenticated administrative procedure to bootstrap one; do not re-enable first-user-is-admin behavior.
5. Configure the deployment's environment variables from `.env.example`. Keep `SUPABASE_SERVICE_ROLE_KEY` and cron secrets only in server-side secret storage. Never prefix secrets with `VITE_`.
6. The tracked `.env` was removed from the repository and ignored going forward. If any secret key was ever committed, rotate it in the provider dashboard; deleting the file does not remove earlier Git history. The reviewed file contained a project URL and publishable key, not a service-role key, but verify your own environment and commit history.
7. Confirm the intended admin, supervisor and operator access with test accounts before returning to operational use.

## What the migration changes

- New auth users receive the least-privileged `operador` role, not administrator based on registration order.
- Only admins and supervisors may update vehicle rows directly.
- Operators cannot directly modify protected occurrence fields such as status, assigned vehicle, dispatch/arrival/finalization timestamps, outcome, or plantão association.
- Dispatch, arrival and finalization use database functions so occurrence and vehicle updates commit or roll back together.
- Occurrence updates create an audit entry with the changed field names. The entry intentionally avoids copying sensitive field values into the audit log.
- Cancellation requires a reason, and only active occurrences can be finalized through the transactional function.

## Required validation

- Admin can manage users and all intended operational records.
- Supervisor can manage the fleet and edit permitted occurrences.
- Operator can create/edit permitted fields on their own occurrences, but direct REST updates to protected fields fail.
- Two concurrent dispatch attempts cannot assign the same available vehicle to different active occurrences.
- A failed dispatch/finalization leaves both occurrence and vehicle state unchanged.
- Cancel without a reason fails; cancel with a reason succeeds.
- Database audit entries are generated for occurrence updates and new records.
- Test backup restoration and ensure example fleet data is not confused with production records.

## Known follow-up work

- Run `bun run lint` and `bun run build` in a clean checkout and fix any project-specific failures.
- Add automated authorization and transaction tests against a disposable Supabase project.
- Review RLS policies for every table, particularly plantões, records, involved persons and profile/role administration.
- Implement a transactional administrative user-management workflow with compensation for Auth API failures.
- Configure and test backups, restoration, security headers, dependency scanning, monitoring and log retention.
- Audit the full Git history for secrets and rotate any credentials found.
