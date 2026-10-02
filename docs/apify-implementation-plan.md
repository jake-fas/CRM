# Apify primary discovery with retained Overture backup

Goal: Implement the user's requested Apify storage and provide exact account setup, without claiming that a scraper grants underlying storage rights.

Design: Apps Script calls Compass Google Maps Scraper asynchronously, one industry at a time in priority order. Every run requests only the remaining raw count. A $0.75 batch ceiling is divided across included industries and passed as maxTotalChargeUsd. No paid retry or exclusion top-up. Polling survives browser reloads. Fresh stored Apify records can satisfy subsequent searches without scraping. Overture is read locally on every search for fallback and conservative missing-phone matching; it is not a live per-query API. Google geocodes the entered starting address once, with the center held temporarily in CacheService.

Storage: Separate ApifyBusinesses and licensed Catalog tables, neither overwrites CRM. Store name, full address, public phone plus coordinates, industry, ZIP, stable ID, phone provenance and timestamps required for ranking/reuse. Do not store reviews, images, personal enrichment or raw provider responses. Apify records are labeled rights-unverified, not openly licensed. Existing Google API preview remains ephemeral.

Scope ruling: The user has expressly requested implementation and repository setup; execute this provider extension directly rather than add another approval loop. Use the existing dedicated checkout.

- [x] Test normalizing real documented output, exclusion identity across sources, conservative Overture phone fallback, request caps and secret-safe transport.
- [x] Implement async start/status orchestration, bounded paid runs, reuse, permanent minimal storage and fallback. Test authorization, reload/duplicate polling, sparse results and failure paths.
- [x] Add primary provider selection, progress/resume UI, CRM prefill and source labels; update seven-file clasp allowlist and fictional demo.
- [x] Document Google/Apify credentials, source-rights limitation, Overture refresh, cost bounds, private sharing and GitHub deployment. Run tests and browser checks, review, commit and push.

Live Apify and Google acceptance require credentials not available in this session. Test doubles do not establish real phone accuracy or actor billing. Cap behavior and actual costs must be checked in the first account-backed run before enabling broader usage.

Verification before publication: 41/41 unit tests, all six desktop/mobile browser workflows (Apify, catalog, Google preview) passed. clasp file-status includes exactly seven app files. Independent review found an interrupted-run replay window and insufficient address agreement in phone fallback; both were reproduced and fixed through RED→GREEN tests. Final review found no remaining blocker.

Published implementation commit acd7f70 to the supplied GitHub repository and verified remote main. Live Apps Script deployment remains disabled until the account setup is complete.
