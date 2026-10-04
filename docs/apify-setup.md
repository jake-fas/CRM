# Set up the single-user CRM

The default provider is now **Apify**, with **Overture** as the saved fallback. The code is ready; account-backed installation, billing and actual phone accuracy remain to be tested.

## 1. Create accounts and credentials

1. Sign into [Apify Console](https://console.apify.com/). Open [Compass Google Maps Scraper](https://apify.com/compass/crawler-google-places) and allow access to this actor. Check the current event prices in your account; the public page advertises **from $1.50 / 1,000 places**, not a guaranteed all-in rate for every plan. Basic public branch phone output is documented. This integration does not enable website contacts, personal lead enrichment, reviews or images.
2. In Apify account settings, create/copy an API token. Keep it private. Apify authorization is sent in a server-side header, never in the browser or URL.
3. No Google Cloud project, billing account or Google key is needed for Apify/Overture searches. Starting addresses use the free U.S. Census geocoder. Enter a full U.S. street address, city, state and ZIP. Locations are approximate street-range matches; ambiguous or unmatched addresses stop before any paid Apify run. Google credentials are optional and only used by the separate Google Places preview.

## 2. Connect the Sheet and source code

Create a private Google Sheet under the account that will operate the CRM. Open **Extensions → Apps Script**. Follow [GitHub/clasp setup](github-deployment.md) to upload the repository from your computer:

```powershell
npm ci
npm run clasp -- login
Copy-Item .clasp.example.json .clasp.json
```

Replace the placeholder in local `.clasp.json` with the Apps Script **Script ID** from Project Settings. Enable the Apps Script API at https://script.google.com/home/usersettings. Then:

```powershell
npm run clasp -- show-file-status
npm test
npm run clasp -- push
```

The upload must contain **seven files**: `appsscript.json`, `Core.gs`, `Provider.gs`, `Catalog.gs`, `Apify.gs`, `Code.gs`, `Index.html`.

## 3. Add Script Properties

Apps Script → **Project Settings → Script Properties → Add script property**:

| Property | Value |
|---|---|
| `ALLOWED_EMAILS` | Your signed-in Google email; later the rep's email, comma-separated |
| `APIFY_TOKEN` | Your private Apify API token |
| `GOOGLE_MAPS_API_KEY` | Leave `NOT_CONFIGURED`; optional Google preview only |
| `PRIVACY_URL` | Public HTTPS privacy page; required for optional Google preview |
| `TERMS_URL` | Public HTTPS terms page; required for optional Google preview |
| `DAILY_APIFY_RUN_LIMIT` | Start with `1` for one-industry testing; default is `6` |
| `DAILY_GEOCODE_LIMIT` | Start with `3`; default is `10` |
| `DAILY_SEARCH_LIMIT` | Set `0` if Google Places preview should be disabled |

Publish the supplied `public-policy` as a **separate standalone static Apps Script project**, set its `POLICY_CONTACT`, and deploy to anyone. Its `/exec` URL is privacy; `/exec?page=terms` is terms. Test both while signed out. Alternatively publish these policies on your existing website. Never upload that project into the CRM script.

Run `setupCRM` from the CRM editor and authorize access. It creates/checks `CRM`, `Activities`, `Exclusions`, `Catalog` and `ApifyBusinesses` tabs, and records the Sheet ID. Do not rename table headers. Keys stay in Script Properties, never Sheet cells or GitHub.

You can run setup before obtaining any keys. `initializeProperties_`, called by `setupCRM`, adds missing configuration names with empty `APIFY_TOKEN`, `GOOGLE_MAPS_API_KEY`, `PRIVACY_URL` and `TERMS_URL` values. It seeds the current signed-in email only if `ALLOWED_EMAILS` is absent, and uses pilot quotas of one Apify run, three geocodes and zero Google Places requests. Existing values, including deliberately empty settings, are preserved. It does not create credentials or make provider calls. Complete the blank values later in Project Settings → Script Properties; discovery stays disabled until configured.

Google's property editor requires a value when adding names manually. Use `NOT_CONFIGURED` for the four blank fields above; the code treats credential placeholders as missing, and setup converts those four placeholders to empty strings. Configure `ALLOWED_EMAILS` before selecting the public `setupCRM` entry point: it checks the allowlist before any writes. The underscore helpers are hidden in the editor's function selector.

## 4. Deploy and test on both devices

Deploy → New deployment → Web app → **Execute as user accessing the web app**. Allow signed-in accounts as offered by your account; server access still requires `ALLOWED_EMAILS`. Each allowed account needs Sheet edit permission. Avoid anonymous access. Bound Sheet/script editors can inspect the source and properties, so only trusted operators should have edit access.

Open the `/exec` URL on desktop and iPhone Safari using the allowed Google account. Bookmark it; adding a Safari home-screen shortcut is optional, and Google sign-in may work more reliably in a normal Safari tab. No App Store installation is needed.

First live test: include **one industry**, request **5 businesses**, enter a known address and ZIP, and generate. Check names, addresses and phones manually against actual businesses. In Apify Console inspect the input, dataset and billed events. Confirm the requested count and charge cap were honored. Create a CRM record, log an OSV, set a follow-up, reload, and repeat the search: recent saved businesses should avoid a new scrape. Test an exclusion and a denied Google account. Phone-sized browser checks have passed locally, but this actual iPhone/account test is still pending.

## 5. Load the free Overture backup

Overture provides freely downloadable Places data, not a hosted per-query Places endpoint. The CRM reads your private imported `Catalog` on each Apify search and when ingesting results. No paid Overture call is made. Download and convert the territory periodically—monthly is a reasonable starting cadence—then use **Update territory catalog** in the app. See [catalog instructions](retained-catalog.md). The builder's local Boulder test catalog has 617 filtered records / 601 phone fields; it is intentionally excluded from GitHub.

The catalog can supply fallback results when Apify fails or returns no usable records. It does not add replacements after exclusions. A missing Apify phone may use an Overture phone only when normalized full name, full address and ZIP agree, coordinates are within 50 meters, and exactly one candidate matches. Numbers remain unverified branch contacts; owner/manager contacts come from the rep's conversations. No automatic territory download/refresh service is installed in this phase.

## Cost and storage behavior

- Prioritized mode searches industries one at a time in your saved order and requests only the remaining raw count. The first industry may fill the entire list. General mode makes one mixed area collection, filters returned categories against included industries, then sorts the eligible pool by distance. General does not guarantee it found every nearby place. Both modes apply distance/radius/ZIP checks to the collected pool.
- A **$0.75 Apify batch cap** is divided across at most six planned industry runs, limited further by the remaining daily allowance, and passed as `maxTotalChargeUsd` on each run. Runs request a 300-second timeout and disable restart on error. No enrichment add-ons or automatic paid retry. A small per-industry allocation may yield partial results or fail if the actor's minimum price exceeds it. Actual billing must be checked in Console; UI displays a ceiling, not a claimed invoice.
- Starting-address geocoding is free through Census and needs no key. The acquisition ceiling is at most **$0.75**, excluding taxes and separate subscription/other account usage. Default six daily actor runs cap this app's requested actor budgets at no more than $4.50/day; the pilot uses one daily run. Each industry consumes a run, including failed starts. Quotas are shared by the script and reset by Denver date.
- If enough fresh matching Apify rows exist (within 30 days), use them without a new scrape. Rows are retained indefinitely; 30 days is a reuse freshness threshold, not a deletion policy. Old data can remain inaccurate. Excluded rows are still stored, so they can become eligible later without immediate reacquisition. Up to 4,000 Apify source records and 4,000 Overture records are supported separately.
- Automatically retain every acquired dataset item in `ApifyPulls`, before normalization or exclusions, using stable run/item/chunk IDs and JSON chunks of at most 32,000 characters. Normalized business name, address, public phone, matching and provenance fields remain in `ApifyBusinesses`. Reviews, images and personal enrichment are not requested. Refreshing source rows does not overwrite CRM phones, notes or activity history. Raw storage stops with a clear error at 10,000 archive rows; normalized storage retains its 4,000-row limit. Full name/address formatting differences can prevent cross-source exclusions; confirm imported exclusions against displayed branches.

- The optional CRM lookup checks saved records first. Only the explicit Apify lookup button starts a new run: up to three candidates, a $0.10 ceiling, and the same daily run allowance as nearby discovery. Closing the editor does not stop polling; a pending lookup resumes on page load. Lookup results are saved automatically but do not create CRM records or overwrite rep-confirmed contacts by themselves.
- The starting coordinate is held temporarily in CacheService for up to one hour, never in the permanent business tables. Eviction can happen earlier. Pending job IDs and settings support reload/resume; do not close the app indefinitely during a paid run. If location/result cache expires, the app asks for recovery rather than starting another paid job automatically.

## Recovery, backup and GitHub deployment

If a start request loses its response or returns an ambiguous server error, another run is blocked. Inspect Apify Console, stop any unresolved run and retrieve results if needed, then run the editor-only `resetApifySearch_`. Known running jobs are aborted by that helper before the local marker is cleared. It cannot find a run whose start response was lost, which is why Console inspection matters. Dataset/API read errors leave the same run resumable; they do not pay for a replacement.

Keep Sheet sharing restricted. Make a private **File → Make a copy** backup regularly and before bulk imports or direct edits. Google version history is useful but does not replace an independent backup. The code does not yet schedule automatic backups. GitHub stores source and fictional tests only; credentials, real exports and downloaded catalog files are ignored.

After the first successful live test, configure the three GitHub deployment secrets and enablement variable in [deployment setup](github-deployment.md). Subsequent `main` pushes test and update the same Apps Script deployment URL. Routine edits happen locally and are committed to GitHub; Apps Script is the runtime, not a live GitHub-linked editor.

## What technical storage does—and does not—establish

This implementation retains Apify output at the user's explicit request. **Apify's Google Maps scraper does not establish permission to retain Google's source data indefinitely.** Likelihood of enforcement does not change those rights. Source rows are labeled `rights-unverified`, not falsely licensed as Overture. Keeping just name/address/phone does not itself resolve this question. Overture is the separately licensed fallback; independently obtained rep contact facts remain separate. [Apify shared responsibility](https://docs.apify.com/security/shared-responsibility), [actor output/input](https://apify.com/compass/crawler-google-places), [Apify run API caps](https://docs.apify.com/api/v2/actors-runs-post), [Overture attribution/licenses](https://docs.overturemaps.org/attribution/).
