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
Research: official Overture Places licenses and Boulder sample verified; strict converter produced617records/601phones. Rights support retention with notices; accuracy and manager contacts remain unverified.
Ruling: retain Overture catalog; keep Google Places preview ephemeral — resolves permanent source storage without assuming scraping grants rights; cost if wrong: re-evaluate license obligations before importing a newer source.
Ruling: keep daily catalog query geocoding temporary via Google, no external business discovery calls — simplest existing adapter; cost if wrong: replace geocoder, no permanent catalog depends on Google business fields.
Repository: dedicated clone of supplied empty GitHub repo; no unrelated checkout or extra worktree. Code-only tracking and ignored credentials/data.
Fixes: optimistic version guard, monotonic timestamps, duplicate ID update guard, activity draft preservation, paid partial results preserved through requestbudget cap. Regression RED→GREEN in unit/browser checks.
Retention: licensed JSON converter, provenance validation, Catalog import/refresh, local priority/distance selection, catalog-only CRM prefill, license bundles.
Deployment: clasp3.4.1 pinned; opt-in main-only sequential workflow; six source files only; credential/config staging stays inside temporary root, respects clasp traversal guard. No Google credentials available, live deployment pending.
Fresh review: repository_review found Sheetgrid capacity bug and README provider ambiguity. Fixedgrid sizing with two tests RED→GREEN; clarified provider behavior.
Verification: npm test30/30; desktop1365 and mobile390 browser checks passed for Googlepreview and retainedcatalog workflows; actual clasp file-status lists exactlysix appfiles. No actualiPhone/liveSheetsAPItest yet.
