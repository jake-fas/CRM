# Results table and bulk CRM transfer implementation plan

**Goal:** Replace per-business discovery cards with the supplied table design, fast filtering, bulk transfer, and an optional distance-only discovery mode.

**Architecture:** Keep Apps Script, Sheets, source archives, and the existing deployment. Table filtering and sorting are local; transfer resolves selected IDs from saved source facts server-side. General discovery uses one bounded mixed-area Apify run, then filters included industries and sorts by distance. Prioritized discovery retains its existing fill order.

**Constraints:** Keep industry pick list unchanged. No extra enrichment calls, no quota increase, no personal-phone dial buttons, no overwrites of existing CRM history, no new credentials. Unknown rating/review/contact fields stay blank. Retain source provenance internally while removing the requested source badge from results.

- [x] Remove per-result Create CRM record and storage-rights badges.
- [x] Implement table views matching the reference and reuse already acquired metadata.
- [x] Add local search, industry/contact/website/rating/reviews/distance filters and sortable headers.
- [x] Add Transfer to CRM, select all by default, deselect controls, common fields, and replay-safe server bulk import.
- [x] Add General/Prioritized mode; General ignores ranking without changing the industry picker.
- [ ] Run regression and local UI checks, update docs, push and verify deployment.
