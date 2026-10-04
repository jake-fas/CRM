# Execution ledger — plan: outputs/10-phase1-implementation-plan.md

Research decision: Google Places API (New), final for first testers.
Design: outputs/09-phase1-decision-and-spec.md, includes user's CRM scope expansion.
Pre-flight: Task 1 acquisition result is consumed by Task 2 generateLeads; Task 2 bootstrap/generate/CRM/import interfaces consumed by Task 3 UI. No conflicts.
Ruling: Continue planning and implementation without another approval loop — user expressly requested both — risk is scope assumptions; written spec makes those visible.
Ruling: No Git checkout exists; use isolated outputs/phase1 package and ledger instead of Git worktree/scripts/commits — no version-control history, retain deliverables and ledger.
Ruling: CRM reminders are an in-app date queue; outbound notifications and route optimization deferred — no background phone notifications in this version.
Live deployment, Google API test, and actual iPhone acceptance pending account/key setup; do not substitute demo results for those checks.

Task 1: complete — core/provider tests passed 8/8 after initially failing for missing implementation.
Task 2: complete — auth, CRM/history/archive, literal storage, CSV preservation, quotas and preferences tests passed; no provider payload persisted.
Task 3: implemented — responsive UI and actual-code fictional demo; 1365px and 390px browser workflows passed.
Ruling: User added draggable industry inclusion/order; expand to six shared search requests, raw cap unchanged — maximum modeled gross acquisition cost $0.215; priority fill can let first industry consume all candidates.
Fresh review: phase1_review found delayed editor race, missing Sheet flush under lock, and geocoding before exhausted-search check.
Final: fixed exhausted-budget geocode — regression observed 1 fetch instead of 0, now 0; lock still releases.
Final: fixed editor-switch race — delayed browser RPC reproduced dialog closing during save; close/open/Escape blocked until request completes; desktop/mobile workflows rerun green.
Final: fixed buffered Sheet writes — regression observed no flush while locked; now flush precedes release with nested finally on failure.
Final: duplicate Google place IDs cannot create fragmented CRM history; UI opens existing linked records.
Final: public-policy deployment source included; lookup requires public HTTPS policy URLs. No private data or API credentials in that separate static project.
Native Sheet created and read back through connected Google Drive: (private Sheet ID configured outside GitHub), Start here/CRM/Activities/Exclusions, Denver timezone, frozen headers, private sharing. Script installation and account authorization are still pending.
Final verification: 16/16 automated tests passed; desktop 1365px and phone-sized 390px browser checks passed after fixes and policy setup changes. Native Sheet headers/style/privacy read back through connector. Live Google/deployment/iPhone checks remain pending.


## Repository and retention extension — October 2, 2026
Research: official Overture Places licenses and Boulder sample verified; strict converter produced 617 records / 601 phones. Rights support retention with notices; accuracy and manager contacts remain unverified.
Ruling: retain Overture catalog; keep Google Places preview ephemeral — resolves permanent source storage without assuming scraping grants rights; cost if wrong: re-evaluate license obligations before importing a newer source.
Ruling: keep daily catalog query geocoding temporary via Google, no external business discovery calls — simplest existing adapter; cost if wrong: replace geocoder, no permanent catalog depends on Google business fields.
Repository: dedicated clone of supplied empty GitHub repo; no unrelated checkout or extra worktree. Code-only tracking and ignored credentials/data.
Fixes: optimistic version guard, monotonic timestamps, duplicate ID update guard, activity draft preservation, paid partial results preserved through request budget cap. Regression RED→GREEN in unit/browser checks.
Retention: licensed JSON converter, provenance validation, Catalog import/refresh, local priority/distance selection, catalog-only CRM prefill, license bundles.
Deployment: clasp 3.4.1 pinned; opt-in main-only sequential workflow; six source files only; credential/config staging stays inside temporary root, respects clasp traversal guard. No Google credentials available, live deployment pending.
Fresh review: repository_review found Sheet grid capacity bug and README provider ambiguity. Fixed grid sizing with two tests RED→GREEN; clarified provider behavior.
Verification: npm test 30/30; desktop 1365px and mobile 390px browser checks passed for Google preview and retained catalog workflows; actual clasp file-status lists exactly six app files. No actual iPhone/live Sheets API test yet.
Published: initial commit b62f4ed pushed to https://github.com/jake-fas/CRM and verified against the remote main ref. GitHub tests started; Apps Script deployment correctly skipped until account setup and explicit enablement.

## Apify provider extension — October 2, 2026
User-directed change: Apify is the default; retain minimal public business facts in a separate private Sheet table. Do not claim the scraper grants underlying source rights. Overture remains a separately licensed local backup, checked during every search/ingestion; monthly territory refresh is a builder task, not a live per-query API.
Cost: $0.75 configured Apify batch ceiling divided among included industries, no add-ons or automatic paid retry; one geocode modeled at $0.005 outside free allowance. Pending/unknown starts never silently start replacements. Recent saved businesses can avoid a scrape; exclusions do not trigger top-ups.
Storage: source IDs, name/address/public phone and minimum ranking/provenance fields only. CRM history and rep-entered phones are separate. Reviews, images, personal enrichment and raw responses are discarded. Apify source license is explicitly rights-unverified. Starting center is temporary CacheService data.
Review: apify_review caught an interrupted transition replay window and missing address agreement in fallback. Added failing regressions, fixed with an advance checkpoint and full address/name/ZIP plus 50-meter unique matching. Reviewer verified both fixes, no remaining blocker.
Verification: 41 unit tests passed; desktop 1365px and mobile 390px browser workflows passed for Apify async/reload/resume/prefill, licensed catalog and Google/CRM regression. clasp selects exactly seven app files including Apify.gs. Live billing, Google account authorization and actual iPhone acceptance remain pending credentials.
Setup: docs/apify-setup.md covers token/key entry in Script Properties, private Sheet installation, Google deployment, first five-result live test, Overture import/refresh, quotas, backup, recovery and GitHub deployment secrets.

# Browser installation — 2026-10-02

- Created and named the bound Fieldbook CRM Apps Script project from the existing private pilot Sheet.
- Installed and read back all seven app source files through the editor; compared normalized text to local source. Updated manifest uses Denver time, V8, user execution and no Cloud exception logging.
- Saved nine Script Properties: access/Sheet binding, three quotas and four `NOT_CONFIGURED` placeholders. No keys or provider requests were created.
- Added the allowlist-protected `setupCRM` entry point because Google's function selector hides underscore helpers. Placeholder credentials remain disabled; initialization preserves existing settings.
- Linked the ignored local clasp config to the actual project; its upload list contains exactly seven files.
- Google authorization popup did not open in the in-app browser. User must authorize and run setup in a normal browser. Sheet initialization and web-app deployment remain unverified. Account identifiers and project bindings stay out of GitHub.
- Local validation: 45 tests pass, including unauthorized setup rejection and no-key initialization.

## Free geocoding and GitHub deployment — 2026-10-03

- Apify and retained Overture searches now use the free, keyless Census address API. Google preview remains optional and disabled by its quota. Ambiguous, missing or invalid Census matches stop before paid scraping, with no paid fallback.
- Removed the modeled Google geocode charge from Apify/Overture results; the configured Apify acquisition ceiling is $0.75. Updated setup and readiness messages so a Google key is not requested for the primary path.
- Live Census check matched the public Boulder library address. Local validation: 47 tests pass, including no-Google integration and failed-geocode/no-paid-actor checks.
- Owner authorized deployment-only clasp access and account-level Apps Script API activation. GitHub's encrypted credentials and project/deployment bindings are configured; main-branch auto-deployment is enabled. Provider keys and private identifiers remain outside Git.
- A deployment credential was inadvertently included in a form verification response. It was revoked and replaced before workflow activation. Subsequent verification reads saved secret names only.
- GitHub deployment for commit 93b55ac succeeded and updated the same existing app to version 3. The live page confirmed free Census lookup and recognized the configured Apify token.
- A five-candidate, one-industry test around the public Boulder library returned five businesses with public phones. Repeating it reused saved businesses with zero new acquisition requests and a zero charge ceiling. The initial ceiling was $0.75; actual billing and phone accuracy are not claimed verified. The pilot's one daily actor allowance was consumed by this test.

## Startup performance — 2026-10-03

- Authenticated initial CRM state now travels in the HTML response: zero startup google.script.run requests instead of two sequential calls. Activity history is loaded for the selected business only.
- Startup opens the bound Sheet once, reads three tables once each (previously eight full table reads across four tables), takes one lock and avoids flushing a read-only request. Headers remain validated. No Sheet records are cached persistently in the browser.
- My CRM shows its existing snapshot immediately while refreshing. Logging an activity inserts the server-confirmed event into history without reloading every CRM record and activity.
- Embedded JSON escapes HTML/script delimiters and preserves literal replacement sequences. Authorization happens before private data access, and concurrent-save/version protections remain intact.
- Verification: 52 automated tests pass. Fictional local browser checks passed for startup, saving a business, recording a call, reloading, and fetching the saved history on reopening. These checks made no paid provider requests. Google hosting latency remains variable; no precise live speedup percentage is claimed.

## Efficiency review — 2026-10-03

- Independent review identified full-table header validation, whole-table CRM saves, and a redundant full CRM reload after save. Also found a correctness bug: blank Sheet rows could cause the old compacting save to duplicate records at the uncleared tail.
- Header checks now read only row 1 and still reject unexpected columns. Saves retain physical row positions, update/append one row, and preserve concurrency checks, create idempotency, formula-safe values, and the 4,000-record guard.
- Save responses include the server-computed follow-up bucket; the client updates that business directly without a second server request. Other-device changes are still refreshed when entering My CRM.
- Startup counts use narrow blank-aware ranges: catalog IDs only, all four exclusion fields. Catalog count now appears before the first import. This avoids materializing full catalog facts just for a count.
- Verification: 55 automated tests passed, including observed failing regressions before fixes. Independent review found no blockers in the final diff. Local browser checks passed for create, call logging, due-today count, editing to current customer, and immediate removal from active reminders. No paid provider searches.
- Remaining larger optimization: history lookup still scans the activity table, and saves still read CRM to enforce uniqueness/versioning. Indexing these safely is a separate storage change; no speculative persistent cache was added.
