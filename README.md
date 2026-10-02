# Fieldbook CRM

Apps Script + Google Sheets is the selected architecture, developed locally and versioned in GitHub. **Overture Places is the retained-data provider**; Google Places is an optional temporary preview. The default discovery mode searches an imported licensed territory catalog. Public names, addresses and available branch phones can be saved from that catalog. Manager contacts come from the rep's own work. This package includes CRM, ordered industries, exclusions, follow-ups and a fictional demo; no native app or reminder notifications.

Start with [GitHub deployment setup](docs/github-deployment.md), [retained catalog setup](docs/retained-catalog.md), and [provider research and Boulder measurements](docs/long-term-data-research.md). These supersede the original Google-only provider decision in `docs/decision-and-spec.md`.

## What the rep can do

- Enter a starting address and request 1–60 raw candidates, default 50.
- Include industries and drag them into priority order. Arrow controls also work on phones and keyboards. Save the order for the next session.
- See public branch phones, websites, address, opening hours when available, and Maps links. Calls use `tel:` links in the live app.
- Import a CSV of existing customers/exclusions. Current-customer, archived, and do-not-contact CRM records also exclude matching locations automatically.
- Add a business record, contact/role/phone, competitor, next plan, status, and follow-up date.
- Log calls, OSVs, card drops, appointments, decision-maker meetings, not-interested outcomes, and notes with dates.
- See due/overdue follow-ups. Archive and restore businesses without losing history.

Industry order is a fill priority: the first included industry may supply all 50 candidates. **Retained catalog:** local selection uses industry priority then distance, a hard radius and zero Places requests. **Google preview:** later industries are searched only when earlier ones leave the raw limit unfilled, with at most six search requests; its radius is a bias. Neither mode acquires replacements after exclusions, or guarantees an exhaustive globally nearest list. ZIP filters can reduce results.

## Account-free local demo

Requires Node 22 or newer. From this directory:

```powershell
node tools/demo-server.cjs
```

Open http://127.0.0.1:4173. Everything is fictional and visibly labeled. Demo calls are disabled, websites use example.com, and changes live in server memory only. Stop with Ctrl+C. The demo binds only to this computer, so its URL will not work on an actual iPhone; the deployed Google URL will.

## Install in Google Sheets

Use your private native CRM Sheet. The original pilot created a Sheet with Start here, CRM, Activities and Exclusions tabs, frozen headers and America/Denver timezone. Its Apps Script project still needs installation below; setup adds the Catalog tab. Sheet IDs and credentials are configured outside GitHub. Installation does not require an Apps Script paid plan.

1. Open the Sheet, then **Extensions → Apps Script**.
2. Preferred: follow the clasp setup linked above to upload the local code. Manual alternative: add Script files `Core`, `Provider`, `Catalog`, and `Code`, and HTML file `Index`. Do not upload tests, demo tools, or the separate public-policy script to this project.
3. In Project Settings, enable viewing `appsscript.json`, then replace it with the supplied manifest.
4. Add Script Property `ALLOWED_EMAILS` containing your own Google email initially. Later add the rep's email separated by a comma. These accounts must also be permitted Sheet editors because the web app executes as the accessing user. Treat bound script editors as trusted administrators: they can inspect code/properties, including the API key.
5. Run `setup_` from the editor and authorize the requested permissions. It records the bound Sheet ID and creates/checks CRM, Activities, Exclusions and Catalog tabs. Do not rename headers. Literal text prevents formula execution and date round-trip differences.
6. Deploy → New deployment → Web app. **Execute as: user accessing the web app.** For the owner-only first test, restrict access to yourself if that combination is offered. For additional testers choose signed-in Google accounts or your Workspace domain as offered; the server still checks `ALLOWED_EMAILS`. Never allow anonymous access or deploy the CRM as the owner for external users. Account UI options vary; verify deployment identity and denial of unlisted accounts.
7. Open the `/exec` URL and grant the requested scopes. The CRM works before discovery is configured. If Google reports an unverified app or employer restrictions, resolve the account/OAuth configuration rather than relaxing app access checks.

Do not put secrets in source files, spreadsheet cells, browser code, or chat. After any script edit, update the deployment to a new version; saving code alone does not update a versioned `/exec` deployment.

## Configure Google discovery

1. Create/select a Google Cloud project with billing. Enable **Geocoding API** for the retained catalog's starting-address lookup. Enable **Places API (New)** only if you also want the temporary Google preview.
2. Create an API key restricted to those two APIs. Requests originate on Google's Apps Script servers; a browser HTTP-referrer restriction does not apply to server UrlFetch calls. Keep the key in Script Properties; use API quotas and the app's request caps. Configure a billing budget alert, remembering alerts are not a hard spending cap.
3. Add Script Property `GOOGLE_MAPS_API_KEY` with the key. Do not paste it into this README.
4. Publish public privacy/terms pages before enabling discovery. A separate `public-policy` Apps Script project is included: create a standalone project, paste its `Code.gs` and `Policy.html`, set `POLICY_CONTACT` to the operator's contact, and deploy that static project to anyone. It contains no CRM access, API key, or private business data. Its `/exec` URL is the privacy URL; `/exec?page=terms` is the terms URL. Test both without sign-in. Alternatively host those policies on your own public website. If your account forbids public deployment, use your website.
5. Set `PRIVACY_URL` and `TERMS_URL` in the private CRM project's Script Properties to those HTTPS URLs. Google lookup remains disabled until both are configured.
6. Optional Script Properties: `DAILY_SEARCH_LIMIT` (default 30), `DAILY_GEOCODE_LIMIT` (default 10). They are shared daily limits for the entire script, reset by Denver calendar date, and count failed attempts. No automatic network retries. A zero limit disables that operation before any network call.

Search requests use explicit Enterprise fields including phone, website, hours, and source attribution. A normal 50-result single-industry run is three pages, modeled at $0.105 plus $0.005 geocoding after free allowances. The app permits at most six search requests for sparse/multiple industries: **$0.215 gross first-band maximum per generation**, excluding taxes, with no enrichment addons. During applicable free allowances the usage can cost $0. Free allocations are per SKU and shared across projects on the billing account; verify actual billing in Cloud Console.

Source: https://developers.google.com/maps/billing-and-pricing/pricing

## Storage and exclusions

Live Google result names, addresses, phones, hours, websites and responses are not persisted. Google preview creates a blank CRM form linked by place ID; typing a Google field into that form is still copying restricted data. Overture catalog results can prefill business name, address and branch phone because they come from a separately licensed retained source. Source IDs use `overture:` namespaces and link to catalog provenance. Independently obtained CRM facts and activities are retained. Retention rights do not certify data accuracy.

Exclusion CSV accepts `place_id,name,address,reason`, with optional unknown columns ignored. Each row needs an ID or both name and full address. Quoted commas/newlines and BOMs are supported. Uploads merge; malformed input leaves previous data intact. The cap is 2,000 exclusions. Name-only or phone-only matching is deliberately avoided because branches can share them. Name/address matching normalizes punctuation and case, but does not infer that `Street` and `St` are identical. IDs are the reliable match path.

The app refuses duplicate linked place IDs to keep history together. Businesses added without place IDs can still duplicate; review your own entries. Archive by status; physical deletion is an operator action in the Sheet and should include associated Activities rows. Direct Sheet edits can bypass app validation, so use the app for routine work. Backup by making a private copy of the Sheet.

## Tests and evidence

```powershell
node --test tests/phase1.test.cjs
```

Browser checks require Playwright and installed Microsoft Edge. With the demo server running:

```powershell
$env:NODE_PATH = 'path/to/node_modules/containing/playwright'
node tests/browser-check.cjs
```

The browser checks exercise 1365px desktop and 390px phone-sized layouts, industry drag/arrows, discovery, create/edit, OSV history, archive/restore, due queue, delayed-save race protection, safe text rendering, and horizontal overflow. Chromium at a phone viewport is not an actual iPhone Safari test.

## Live acceptance still required

- Verify allowed/denied Google accounts and scopes in the actual deployment.
- Enter your own starting address and priorities; audit location/phone/hours accuracy.
- Check the actual request counts and billable SKU in Cloud Console.
- Confirm no provider payloads or secrets appear in Sheet cells, browser storage, or logs.
- Test CRM save/reload, date strings, formula-looking text, concurrent sessions, activity retries, and archive exclusions in the actual Google Sheet.
- Open `/exec` in iPhone Safari: reorder by touch, call a real business, open Maps, log an OSV, and check due follow-ups. Add the website to Home Screen if desired.
- Confirm both public policy URLs work without signing in.

No live Google lookup or cloud script deployment has been performed with this package yet. Local tests and the demo use service doubles. The native Sheet, when created, is infrastructure only until its Apps Script project is installed/configured.
