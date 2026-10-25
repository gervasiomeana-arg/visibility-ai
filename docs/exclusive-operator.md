# Private operator access — 2026-10-25

Visibility is operated exclusively by the existing verified user ID b4a19328-4566-4e76-96c3-bcc793346f88. The ID is not a secret. Email, role claims and editable user metadata do not authorize another account. Changing operators requires an intentional migration and matching shared configuration; deleting/recreating the operator is not an account recovery method.

The API entry gate validates the Supabase identity and rejects other valid accounts before reaching any provider. Already verified request identity is reused by downstream middleware. Health and anonymous OAuth configuration status remain public; Google callbacks still require their existing signed/encrypted state and additionally require the approved operator. Public /web redirects and customer contact forms remain public.

The UI accepts only the operator session, fails closed if Auth is absent and disables its signup method. The database enforces 18 restrictive operator policies in addition to existing business/workspace scope policies. Existing RPCs that create workspaces, accept invitations or return membership-dependent data also enforce the operator. The private PDF bucket has an additional restrictive operator policy.

An INSERT-only trigger on auth.users rejects new accounts; existing sign-in, token refresh and password recovery update the current account and are not blocked. It is independent of the dashboard's allow-signups setting. The trigger does not change passwords or revoke the operator's sessions. No new user, service key, provider token or authentication bypass was created.

Validation: local PostgreSQL tests preserve complete client records, payment/report payloads and dates, allow owner PDF access, and block outsider rows, PDFs, RPCs and registration, including forged metadata. Live transaction tests validated owner access, rejected outsider reads and workspace creation, and rejected a test registration without retaining any row. The live database retains 1 user, 4 clients, 18 saved audit reports, 22 web audits and 1 Search Console connection. Client and report fingerprints were identical before and after migration.

Database changes are already applied. The API/UI changes require syncing main into AI Studio and Publish. After publication, verify the existing operator login and routes once; no paid provider invocation is needed for this check. Password leak protection, recovery/backup proof and other launch checks are separate tasks.
