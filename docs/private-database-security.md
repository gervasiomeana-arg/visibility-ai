# Private database access

`20261020204231_restrict_private_database_api.sql` removes anonymous and inherited
PUBLIC grants from the 18 private application tables and the nine privileged
functions found during the launch review. It neither modifies rows nor removes
authenticated table permissions or RLS policies.

`get_visibility_schema_readiness` now uses SECURITY INVOKER: authenticated users
already have an explicit SELECT policy for its schema metadata. Trigger functions
are not executable directly by anon or authenticated; database triggers continue
to run normally.

Five SECURITY DEFINER functions remain intentionally executable by authenticated
users and therefore still appear in Supabase's authenticated-function advisor:

| Function | Authorization and reason |
| --- | --- |
| is_workspace_member | Checks only the caller's membership; avoids recursive membership RLS. |
| list_workspace_members | Returns members only for a workspace the caller belongs to. |
| get_workspace_usage_summary | Raises an access error unless the caller belongs to the workspace. |
| create_workspace_with_owner | Requires auth.uid(); the caller becomes the new workspace's owner. |
| accept_workspace_invite | Requires identity, matching JWT email and an unexpired unused invitation. |

These are bounded workspace operations, not proof of global admin-only access.
The private deployment also needs new signups disabled in Supabase Auth and a
review of existing users/memberships. Removing the signup interface does not
change Supabase Auth settings. Password protection and production backup/restore
are separate controls; this migration does not enable or verify them.

Verification: the integration test applies the actual baseline and subsequent
migrations in isolated PostgreSQL, applies hardening twice, compares client
payments/report payloads and timestamps unchanged, confirms owner access and
metadata/usage RPCs, rejects foreign-workspace access, and verifies that owner
protection and new-user triggers still work. No fixture is written to production.

References:
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
