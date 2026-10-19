# HITAM Student Mental Wellbeing Event

Responsive event landing page with separate student registration and anonymous thought submission.

## PostgreSQL provider and deployment setup

For this small Prisma/PostgreSQL application, Neon is the simplest fit to evaluate first: it offers standard PostgreSQL URLs and an optional PgBouncer endpoint for short-lived Next.js/serverless connections. Its Free tier is useful for development and the first integration test, but it should not be treated as the only backup for event data. Current Free limits are 100 projects, 1 GB of PostgreSQL storage per project, 100 CU-hours per project per month, autoscaling up to 2 CU, 10 branches, and 5 GB monthly public transfer. Idle compute suspends after five minutes; a cold first request can therefore incur startup delay. Exceeding usage/storage limits can suspend compute or reject writes.

Free provides a six-hour instant-restore window capped at 1 GB of changes and one manual snapshot; it is not a daily off-site backup. Launch currently charges by usage, including $0.106/CU-hour, $0.35/GB-month, and $0.20/GB-month for retained restore history; Launch provides up to seven days of restore history and 500 GB monthly public transfer. That means no predictable fixed monthly database bill: actual cost depends on active compute, storage, branches, and restore history. Confirm current pricing and limits before launch. For production, schedule encrypted `pg_dump` backups to storage outside the database provider and periodically verify a restore.

Neon's pooled host is the connection string whose hostname contains `-pooler`; its pooler can accept up to 10,000 client connections, while active transactions and the underlying PostgreSQL connection limit are lower and depend on compute size. Use the pooler only for the app runtime. Keep Prisma migrations on the direct host. These values and billing may change; see [Neon pricing](https://neon.com/pricing), [Neon plan limits](https://neon.com/docs/introduction/plans), and [Neon pooling limits](https://neon.com/docs/connect/connection-pooling).

### Credentials and URL format

The app uses Prisma 6. `DATABASE_URL` is the runtime connection; `DIRECT_URL` is for Prisma CLI migrations. Use the provider-generated PostgreSQL URI format:

```text
postgresql://ROLE:PASSWORD@HOST:5432/DATABASE?sslmode=require&schema=public
```

Copy the actual values from the provider console. In Neon, use the pooled runtime hostname for `DATABASE_URL` and the direct hostname for `DIRECT_URL`. Create the runtime role while connected as the database owner. Grant it only `CONNECT`, schema `USAGE`, `INSERT` on submitted columns, and `SELECT(id)` on the two tables because Prisma uses `RETURNING id`:

```sql
GRANT CONNECT ON DATABASE hitam_wellbeing TO hitam_runtime;
GRANT USAGE ON SCHEMA public TO hitam_runtime;
GRANT INSERT ("fullName", email, department, "yearOfStudy", phone, "accessibilityRequest") ON TABLE "Registration" TO hitam_runtime;
GRANT SELECT (id) ON TABLE "Registration" TO hitam_runtime;
GRANT INSERT (message) ON TABLE "AnonymousThought" TO hitam_runtime;
GRANT SELECT (id) ON TABLE "AnonymousThought" TO hitam_runtime;
```

Replace the example database and role names with the actual names. Do not grant that role table-wide `SELECT`, `UPDATE`, `DELETE`, schema creation, or migration permissions. Keep the migration credential in a deployment secret available only to the migration job. Local development may use the same local owner role for both URLs after setting its actual password in `.env`.

Do not commit `.env`, provider URIs, passwords, or Redis credentials. Configure secrets in the app host's secret manager. `DATABASE_URL` and `DIRECT_URL` must both be set for Prisma 6 schema operations.

### First migration and PostgreSQL integration test

Use a fresh non-production database or isolated branch. Set `DATABASE_URL` to the runtime role's pooled URI and `DIRECT_URL` to the migration role's direct URI, then run:

```powershell
npm ci
npx prisma validate
npx prisma migrate deploy
```

For integration tests, set `TEST_RUNTIME_DATABASE_URL` to the least-privilege pooled runtime URI and `TEST_DATABASE_URL` to the direct owner URI for cleanup/schema inspection on that same disposable test database. Explicitly enable the suite:

```powershell
$env:TEST_DATABASE_URL = "<direct PostgreSQL URI for disposable test database>"
$env:TEST_RUNTIME_DATABASE_URL = "<pooled runtime URI for disposable test database>"
$env:RUN_DB_INTEGRATION = "true"
npm run test:db
Remove-Item Env:TEST_DATABASE_URL, Env:TEST_RUNTIME_DATABASE_URL, Env:RUN_DB_INTEGRATION
```

The integration suite writes synthetic test records, verifies that concurrent inserts hit the database unique constraint, checks thought-table columns, and deletes the rows it creates. Do not point it at production. Unit tests run without PostgreSQL and do not prove live persistence.

The initial migration at `prisma/migrations/20261018000000_init` matches the current schema: it creates `Registration`, `AnonymousThought`, and the unique registration email index. Anonymous thoughts contain only `id`, `message`, and `createdAt`; there is no foreign key or registration identifier. `prisma migrate deploy` applies committed migrations and does not generate new ones. For schema edits, use a disposable development database with `npx prisma migrate dev --name <change>`, review and commit the generated migration, then use `npx prisma migrate deploy` in deployment.

## Rate limiting and proxy setup

The included in-process limiter is a development/best-effort fallback. It keeps a client address in memory for up to one hour, is capped at 5,000 entries, and is not shared across instances; it does not provide production abuse protection. Before production, put the app behind a shared edge/WAF limiter. One concrete option is a Cloudflare zone rate-limiting rule per endpoint, matching `http.request.method eq "POST" and http.request.uri.path eq "/api/register"` (create a second rule for `/api/thoughts`), characteristic `ip.src`, threshold initially set to 5 requests in 3600 seconds, then action/mitigation configured for the plan. Test first in log mode if available and adjust thresholds to avoid blocking shared campus NATs. Cloudflare's available periods/actions and whether rule creation is included depend on the account plan; confirm availability before choosing it. Do not put student identifiers or message contents into rate-limit keys. The browser submission APIs remain unauthenticated and do not require student identification.

The first `x-forwarded-for` address is used only by the local fallback limiter. Configure the trusted reverse proxy to overwrite forwarded client-address and protocol headers, and block direct origin access. Never trust client-supplied forwarded headers when the request can bypass that proxy. Configure the host to redirect HTTP to HTTPS. HSTS is emitted by middleware only for production requests marked HTTPS by the trusted proxy; use a sanitized `x-forwarded-proto` value and verify it at the deployed edge.

## Data handling and privacy limits

Registration records and anonymous thoughts use separate PostgreSQL tables. Email is normalized and unique. Student ID is not requested. Anonymous thoughts have no registration relation or direct identifier fields. There are no public read endpoints or organizer dashboard. The runtime insert selects only the generated ID and does not read saved names, email addresses, or message bodies back. Submission errors are generic; handlers do not log request bodies, names, email addresses, messages, or database exceptions. No analytics or application logging integration is configured in this repository.

Thoughts are stored as plain text and are not sent to third-party AI services. The app does not intentionally persist IP addresses, but rate limiting temporarily processes connection metadata. Hosting, proxy, WAF, database, backup, and operator audit logs may retain technical metadata independently. Review their access and retention settings, and disable request-body capture for these routes. Keep organizer access to database consoles and backups limited. Anonymous submission does not mean absolute anonymity.

Choose a retention period with organizers before collecting data. The app currently has no automatic row deletion policy because the retention period has not been set. Once approved, automate deletion of expired registrations and thoughts in a restricted scheduled job and document backup expiry as well. Until then, an authorized operator must apply an approved retention policy manually.

The middleware adds a per-response CSP nonce, disallows `unsafe-eval`, restricts scripts/styles to the site and nonce, and sets frame, base, and form restrictions. Security headers also disable MIME sniffing and framing. Verify the final headers and form behavior on the deployed host. HSTS and HTTPS depend on correct edge TLS and proxy configuration. There is no verified counseling contact in the brief; add only a confirmed campus or professional resource URL. The form is not an emergency or crisis response service.

## Checks and deployment

Run `npm run lint`, `npm run typecheck`, `npm test`, `npx prisma validate`, and `npm run build` before release. `npm run test:db` only verifies PostgreSQL persistence when both `TEST_DATABASE_URL` and `RUN_DB_INTEGRATION=true` are set. Keep the runtime role restricted, migration role separate, backups and logs restricted, and shared rate limiting enabled at the edge before production.

## Event details

Edit `lib/event.ts` for date, time, venue, organizer, registration deadline, departments, and verified support details. Unconfirmed fields are explicitly marked as to be announced. Anyone in immediate danger should contact local emergency services or a trusted person who can help now.
