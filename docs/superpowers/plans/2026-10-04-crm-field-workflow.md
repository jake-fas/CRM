# CRM field workflow implementation plan

The authorized scope is automatic storage of every Apify result, broader industry controls, optional lookup by phone/address/name, and a fast call/outcome/reminder flow. Keep the existing Sheet/project/deployment, avoid extra setup, retain current daily Apify allowance, and use the existing token. No paid searches are needed for verification.

- [x] Parent: retain every acquired Apify item automatically in a separate chunked ApifyPulls table; make persistence replay-safe and retain normalized branch facts independently of CRM notes. Implement local-first optional lookup plus a capped asynchronous Apify lookup.
- [x] Industry agent: expand supported categories and group metadata, retaining legacy IDs and quotas. Backend merges saved priorities with newly available categories; UI adds search, include-all, clear-all and existing drag controls.
- [x] Backend agent: preserve CRM schema; add Reminders table and global settings (3 days, optional 7 days, both from activity date). Version-aware, idempotent call completion records outcome/history/reminders together with replay recovery. Add per-business overrides and reminder completion.
- [x] UI agent: concise call dialog, global defaults at top, per-business overrides, due lists, and optional lookup choices without paid typing requests.
- [x] Parent: integrate RPC/demo contracts and update legacy expectations for automatic table creation. Run regression tests, validate mobile/desktop save/log/reminder/lookup flows with fictional data, and resolve review findings.
- [ ] Release: push and verify existing GitHub deployment and live initial load.

Data ownership: provider listings/raw pulls are separate from rep-confirmed CRM contacts and activities; automatic acquisition storage never overwrites those records or calls. Source provenance stays explicit. Reminders appear in-app; no push/email service is silently installed.
