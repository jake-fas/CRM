# Phase 1: Google Places decision and specification

Final first-tester decision, October 2, 2026: **Google Places API (New)**. The previous hybrid research is a later enrichment roadmap, not a requirement to buy three providers for Phase 1.

## Final comparison

| First test | Google Places | Apify Compass |
|---|---|---|
| 50 basic businesses, public branch phones, websites | Three Enterprise Text Search pages: $0 within the 1,000-request monthly allowance; $0.105 afterward | About $0.20 at Free-plan event rates, before start event; monthly $5 credit can cover a test |
| Address resolution | One geocoding call: $0 within allowance, $0.005 afterward | Actor geographic input; not a demonstrated exact address-to-nearest-50 guarantee |
| Website contact add-on | No built-in manager lookup | About $0.10 for 50 company-contact events; different from person/direct-phone enrichment |
| Person enrichment | Not provided | $5 for 50 returned people at Free-plan rate; Starter lowers usage rate but adds a $19/month commitment |
| Core information | Name, physical address, public phone, website, hours, business status, category, Maps link | Similar core information, optional scraping/enrichment |
| Implementation | Direct synchronous HTTP pages; explicit masks and quotas | Actor start, run completion, dataset retrieval, event configuration |
| Accuracy evidence | Official Business Profile ecosystem, but no measured territorial phone accuracy yet | No independently measured territorial phone accuracy yet; scraper does not establish direct-manager identity |
| Permanent storage | Restricted; IDs have explicit storage exception | Scraping availability does not grant unrestricted underlying data rights |

For the first test, choose Google: it is inexpensive even outside its allowance, gives the necessary information without 50 detail calls, and avoids a scraper job dependency. Request hours in the same Enterprise tier to help the rep plan calls. Do not request reviews, photos, summaries, or Atmosphere fields. No automatic Apify enrichment. Branch phone is labeled as branch phone; manager/direct phone fields remain user-entered.

Sources checked: [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [Text Search fields and pagination](https://developers.google.com/maps/documentation/places/web-service/text-search), [Google storage/attribution policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Apify actor pricing](https://apify.com/compass/crawler-google-places/pricing), [Apify input schema](https://apify.com/compass/crawler-google-places/input-schema), [Apify plans](https://apify.com/pricing). These are published prices, not actual API test charges. Both require account setup; Google requires billing even within its allowances.

## Intended outcome and scope

A Cintas rep uses one private responsive website on iPhone or desktop to enter a street address, choose ordered included industries and 1–60 raw candidates (default 50), and optionally restrict results to her ZIP codes. She imports her own customer/exclusion CSV, generates candidates, calls or opens websites/Maps, and manages the CRM described below. Each API query uses one industry; a generation can progress through the included industries in priority order. Industries are restaurants, auto repair, hotels, gyms, dentists, and schools. Balanced mixed-industry quotas, routing, outbound reminder notifications, enrichment, and bulk permanent Google result export are later phases.

### CRM scope added by the user

Persist rep-entered business name, address, branch/contact phone, contact name and role, competitor, status, next plan, and follow-up date. A record optionally links to a Google place ID without copying Google's display data. Statuses: prospect, attempting_contact, appointment, not_interested, current_customer, archived, do_not_contact. Current customers, archived records, and do-not-contact records automatically exclude exact matching locations from discovery. A not-interested record may have a later follow-up and is not automatically blocked forever.

Append dated activities: call, OSV, appointment, decision_maker_meeting, card_left, not_interested, note. Keep all history when archiving; restore by changing status. Display overdue/today/upcoming follow-ups in the CRM, suppressing current-customer/archived/do-not-contact reminders. Reminders are an in-app due queue, not push notifications or scheduled emails. Activity date and notes are independently editable input before appending; each submission has an idempotency token to avoid duplicate history from retries. No physical deletion of records in Phase 1.

Use CRM and Activities tabs instead of the earlier minimal Notes tab. CRM rows have stable generated IDs; UI passes those IDs for updates and refuses unknown IDs. Activity data is append-only. Require a user-entered business label for durable records; instructions explicitly discourage copying restricted provider fields. Support editing lead details, viewing chronological history, and recording the plan to revisit an owner at another time.

Results are nearby candidates, not an exhaustive nearest-50 census. Google DISTANCE ranking is requested for supported categorical queries; hotel search uses relevance and says so. No independently computed distances or polygon analytics on Google Places data. A radius is a location bias, not a strict geographic boundary. ZIP filtering is local and reduces the returned count without replacement searches. Missing-phone candidates remain useful for visits.

## Components and flow

- `Core.gs`: validation, CSV parsing, exact exclusion matching by ID or normalized name plus full address, ZIP filtering, duplicate removal, bounded paging/cost accounting. No network or Google services in these functions.
- `Provider.gs`: geocoding and Enterprise Text Search through UrlFetchApp; minimal allowlisted field mask, no retries, at most six search requests per generation, final page limited to remaining raw count.
- `Code.gs`: private web entry point, initialization, search locking, server-side daily request caps, exclusions and CRM/activity persistence, entry validation, spreadsheet formula-injection protection.
- `Index.html`: accessible responsive forms and results, request-in-flight disabling, call/site/Maps links, CSV upload, record notes/status/follow-up, Google/third-party attribution, demo labeling.
- `appsscript.json`: V8 runtime and minimum scopes for bound spreadsheet and external HTTP.
- `tests/phase1.test.cjs`: dependency-free Node tests running the actual Apps Script code with service doubles.
- `tools/demo-server.cjs`: local-only preview with fictional fixtures, never a real prospect list.

Google results stay in browser memory, without localStorage, CacheService, persisted payloads, or result rows. Sheet tabs retain uploaded exclusions, place IDs, rep-entered contact information, status, notes, and dates. User-uploaded data is not Google-acquired content. Notes updates never copy live name/address/phone into persistent fields. The rep can independently enter verified contact facts. Saving a note does not claim independent verification of Google facts.

## Limits, security, and errors

Maximum six paid search requests across ordered industries per generation, one geocode request. A sufficiently populated single industry normally takes three pages for 50 results; sparse industries can consume extra queries within the six-request cap. Gross first-band ceiling is $0.215 per generation, excluding taxes. Count is 1–60, radius bias 100–50,000 meters. Hard server daily caps default 30 search requests and 10 geocodes; preflight both, then reserve attempts before fetch and count failures conservatively. UI reports request count and gross cost estimate (ignores free allowance) so the builder sees economics. No wildcards, detail calls, retry waterfall, API key in browser, or paid fallback.

Included industries have persistent drag-and-arrow priority ordering. Search the highest included industry first and move to the next only if the raw limit remains unfilled. Stop at the shared raw limit or six-request cap. No replacement acquisition after exclusions, ZIP filters, missing phones, or deduplication. Results across industries follow industry priority, not a globally nearest order.

Setup stores GOOGLE_MAPS_API_KEY in Script Properties, and sets an explicit allowed tester email. Deploy as user accessing the app, limited to yourself for personal testing; each permitted account must be a Sheet editor. Server functions check the active email against the configured allowlist. Never deploy anonymously. No credentials should be pasted into chat or source files.

Serialize generation and writes with ScriptLock, reject another active generation, flush Sheet changes before unlocking, and release lock on failure. Prevent editor switching while a save or activity request is pending. Google error bodies and API keys never reach the browser. Invalid input causes no API calls. Keep previous visible results if a new search fails. No automatic retries after a partial failure; tell the user an attempt may have been charged. Public privacy and terms URLs are required before enabling Google lookup; a separate static policy deployment is included and has no access to CRM data or API keys.

CSV accepts `place_id,name,address,reason` (ID or both name/address required), quoted commas/newlines, UTF-8 BOM, and normalized headers. Reject malformed CSV before updating the Sheet; cap 2,000 records and 1 MB. Match conservatively; a name alone or branch-wide phone is not enough. Duplicate uploads merge by stable exclusion key. Sheet strings must remain literal even when starting with formula characters.

## Acceptance and deployment boundary

Automated proof: 50 raw results cause page sizes 20,20,10; no top-ups after exclusion, ZIP filtering, duplicates, or missing phones; hotel ranking is correct; invalid values and repeated page tokens stop; malicious CSV or HTML does not execute; notes preserve stable IDs and never persist provider fields; unauthorized calls and exhausted request budgets make no network requests; Google errors release locks without revealing provider error text.

Local demo works without accounts and is visibly fictional. Live acceptance requires a Google account, API key with Places API (New) and Geocoding enabled, billing/quota setup, bound Sheet deployment, actual starting address, and iPhone check. These account-dependent checks cannot be called complete from local mocks. Deliver a ready-to-install package and exact setup steps; identify live verification as pending until credentials/deployment exist.
