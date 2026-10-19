-- Extend the append-only history; preserve all records, grants and owner policies.
ALTER TABLE public.client_audit_runs DROP CONSTRAINT IF EXISTS client_audit_runs_channel_check;
ALTER TABLE public.client_audit_runs ADD CONSTRAINT client_audit_runs_channel_check
 CHECK (channel IN ('web','networks','search','ai','combined','plan','monthly','implementation'));
