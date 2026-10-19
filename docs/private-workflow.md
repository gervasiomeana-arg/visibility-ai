# Private operator workflow

The owner workspace starts in Clientes, followed by Página web, Redes, Buscadores, IA and Historial. Other tools remain accessible from a collapsed complementary section. Clients receive PDF reports; they do not need app accounts. Removing the signup UI does not disable Supabase Auth signup globally.

Client briefs extend the existing client ledger payload. Legacy payments, invoices, report files and manual delivery timestamps remain intact. A client may reference multiple businesses. Only explicitly edited website/name/location fields update an existing single linked business, using a fresh profile read. Creating a business and saving its client are separate requests; errors retain the draft link for retry.

## Review and storage

New measurements stay in memory until Save history is selected. Changing the client, conditions or tab discards an unsaved result. Saved runs are isolated by workspace, client and business. History currently lists the newest 100 entries. Existing records remain under Registros anteriores; they are not silently converted into fresh measurements.

Apply `supabase/migrations/20261019191113_client_audit_runs.sql` before deploying the interface. It adds an append-only owner-scoped table, composite business/client foreign keys, and SELECT/INSERT permissions only. It does not rewrite existing client data. A fresh save, reload, reopen and PDF download must be checked after publication.

## Sources and limits

- Website audits measure the current initial HTML; previous dates use saved history.
- Public social metrics are current observations. The period filters available post evidence and stored captures, not an invented monthly follower history. Reach and views require actual source data.
- Search Console queries finalized data for the selected property and dates, up to 100 query rows. Empty data is not proof of no traffic.
- Other search engines and AI assistants accept explicitly manual evidence. Gemini automatic research is labeled with its real source/model and remains pending review; it does not measure ChatGPT or Claude.
- Compatible comparisons require matching scopes and sources. Combined reports preserve the original observations and dates.
- PDF download, local printing, PDF storage in the client fiche and manual delivery registration are separate choices. Opening WhatsApp does not attach or send a PDF automatically, and a recorded delivery is not a receipt confirmation.

## Validation

Lint, production build and 337 automated tests pass, including repeatable database migration, owner isolation, preservation of legacy ledger data and truthful comparisons. A local generated PDF fixture was rendered for layout inspection; it is not client evidence. Production Gemini quota, YouTube configuration and browser delivery require live checks after deployment. The public marketing website is a later phase.
