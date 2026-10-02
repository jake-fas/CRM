# Current provider note

Apify is now the default discovery source at the user's request. This document describes the separate openly licensed Overture backup and catalog-only mode. Apify rows never enter the licensed Catalog table; see [Apify setup](apify-setup.md).

# Permanent prospect data

Use **Overture Places** as the retained catalog. Google supplies only the temporary starting-address geocode for this mode. Apify's Google Maps scraper is not used as a data-license workaround. This choice allows reuse of names, addresses, public branch phones and coordinates under the applicable open licenses, while keeping the app in Apps Script/Sheets.

## What is stored

`Catalog` holds the source ID, business facts, coordinates, industry, ZIP, release, source datasets, licenses, import timestamp, confidence and reported operating status. `CRM` contains selected businesses plus the rep's independent contacts, competitor observations, statuses, plans and dates. `Activities` retains her dated history. All three are private Sheet tabs. Refreshing Catalog does not overwrite CRM or Activities.

Overture IDs are saved as `overture:<source ID>`. Google place IDs remain separate. A catalog-linked CRM record retains its ID if it later disappears from a refreshed catalog; the source audit can then use the prior private Sheet backup. Keep a dated private backup before a refresh if historical provenance matters. No client data, downloads or exports are committed to GitHub.

## Initial territory download

Builder preparation runs on your computer, not her phone. Install the official Python client in a workspace virtual environment: `python -m pip install overturemaps`. Use a bounding box enclosing her eight ZIPs. This downloads public open data, not a Google Places scrape.

Example Boulder test (not her final territory):

```text
overturemaps download --bbox=-105.30,39.99,-105.20,40.06 -f geojson --type=place -o data/boulder-places.geojson
npm run catalog:convert -- data/boulder-places.geojson data/territory.json 2026-09-23.1 80301,80302,80303,80304,80305
```

The CLI downloads its currently selected release; check and record that exact release before conversion. Do not label a later download as September 2026. Converter requires current `taxonomy`/`basic_category`, US full addresses/ZIPs, confidence ≥0.8, recognized source licenses and one of the six CRM industries. It excludes marked permanent closures, unfamiliar licenses and unrelated categories. Phones are optional; it selects the first listed public phone. No names or direct numbers of managers are fabricated.

In the website, expand **Update territory catalog**, select the converted JSON, and click **Import territory catalog**. It replaces the entire Catalog with the validated snapshot, including removal of obsolete trailing rows; it does not merge territory fragments. Include all eight ZIPs in the same snapshot. Maximum 4,000 records / 5 MB. Invalid/empty snapshots are rejected before writes. An unfamiliar new release/schema/source must be reviewed by the builder.

## Daily use and cost

Choose **Saved territory catalog**, enter a street address, select industries and their priority, then a candidate limit (default 50). One address-geocode request locates the starting point. Business selection itself performs zero external API calls. It ranks by industry priority, then straight-line distance, and imposes a hard radius. ZIP filtering happens locally. Exclusions are applied after the raw count limit, with no replacement acquisition.

This is the closest set within the imported catalog and chosen priorities, not a guarantee that it contains every real business nearby. If the first industry has enough entries, it fills the count before lower-priority industries. Missing phones remain visit prospects. Possible rebrands and duplicate upstream identities require rep review; source IDs alone do not guarantee distinct businesses.

Overture has no per-record data-license charge. A 50-candidate selection costs only its address geocode: modeled at $0.005 outside Google's applicable free allowance, excluding taxes. Downloads, local processing and human verification are separate costs. No paid contact enrichment is enabled. Geocoding is still subject to Google billing/account setup and terms.

## Refresh, notices and privacy

Refresh the complete territory snapshot monthly or before a major prospecting session. Snapshot release age is visible on candidate cards. Treat a public branch number as unverified until the rep reaches the business; an existence-confidence score does not certify phone accuracy.

Preserve [third-party notices](../THIRD_PARTY_NOTICES.md) and the bundled license texts when sharing/exporting catalog data. The conversion command copies these beside its output. License labels are not permission to relabel Google/Apify exports as Overture: download from the official Overture release and keep its original provenance. Current license checks reject unknown datasets/licenses; they cannot prove that a manually forged JSON file came from Overture.

Keep manager/contact data independently sourced and record how it was obtained in an activity note. Respect do-not-contact statuses. Keep the Sheet private and authorize only the operator/rep. Archive preserves history; deletion and revocation are operator actions. No outgoing messages or reminder notifications are sent by this version.

## What the Boulder test actually showed

The official regional sample contained 11,587 records. Broad category analysis found about 730 relevant IDs with a phone and full address after confidence/closure filtering. The implemented converter is stricter about source metadata, postal codes and normalization: **617 catalog records, 601 with phones**, in this test box. Neither count measures verified active unique businesses or manager availability. See [research](long-term-data-research.md) for methods, duplicate examples and sources.
