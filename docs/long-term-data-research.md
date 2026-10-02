# Retainable business leads for a single-user CRM

Researched and sampled October 2, 2026. Recommendation: use an Overture Places regional download as the retained business catalog, then add manager names from the rep's own calls and visits. It meets the requested data-license cost of less than $1 per 50 records: the underlying open dataset has no per-record license fee. Download, processing, hosting and human verification costs are separate. Open data does not guarantee that every business has a current phone or complete address.

## Source comparison

| Source | Long-term retention | Cost relevant to 50 results | Main limitation |
|---|---|---|---|
| Overture Places | Permissive source licenses support retaining and modifying data, with license/notice obligations when sharing | No data-license fee; local processing and hosting separate | Optional contact fields; stale/closed records and duplicate entities remain possible |
| Geoapify Places / OSM | Documentation expressly permits caching/storing without limits; ODbL permits permanent reproduction | Free plan includes 3,000 credits/day; 50 places is approximately 3 credits | ODbL obligations if publicly used/shared; phone enrichment may require details requests |
| Foursquare Open Source Places | Apache 2.0 dataset, a viable retained-data alternative | Free underlying data | A separate product from the paid Places API; quality still needs sampling |
| Foursquare self-service Places API | Permanent CRM retention not established by the reviewed current documentation | Do not select on price until retention is confirmed | EULA incorporates account-specific caching rules; linked guideline page did not expose substantive rules during verification |
| Apify Google Maps actors | Apify does not supply permission to retain the target site's data | Actor pricing alone cannot establish licensed cost | Customer remains responsible for target-site terms and legal compliance |

## Overture licensing and notices

Overture states that its Places theme contains no OpenStreetMap data and has no ODbL share-alike obligations. Current category fields are `taxonomy` and `basic_category`; the old `categories` field was removed in September 2026. This makes Places a practical starting point for an independent retained catalog. Do not assume this licensing applies to every other Overture theme. [Places guide](https://docs.overturemaps.org/guides/places/)

The source list licenses Meta, Microsoft, PinMeTo, Krick, RenderSEO, DAC and BrightQuery under CDLA Permissive 2.0; Foursquare under Apache 2.0; AllThePlaces under CC0. Preserve release/source metadata so the appropriate terms can accompany exports. [Overture licensing](https://docs.overturemaps.org/attribution/)

CDLA Permissive 2.0 permits use, modification and sharing. Section 2.1 requires making the license text available with shared data; section 3 has a separate exception for computational Results. A CRM export containing source records should conservatively include the license rather than relying on that exception. [CDLA license](https://cdla.dev/permissive-2-0/)

Apache 2.0 redistribution requires the license, notices of modifications, relevant attribution/copyright notices and any applicable NOTICE text. Bundle both license texts and the full Foursquare notice with any catalog export containing Foursquare contributions; add a notice explaining normalization/filtering. An app's data-source information can link these files. [Apache license](https://www.apache.org/licenses/LICENSE-2.0.html), [Foursquare dataset notice](https://opensource.foursquare.com/places-notice-txt/)

## Executable import approach

Use the official Python client to make a regional file once, then search/filter the retained catalog locally. The CLI reads cloud-hosted GeoParquet, automatically targets the latest release through STAC, supports bounding boxes ordered west/south/east/north and streams results. It requires no paid Places API account. [Official client documentation](https://docs.overturemaps.org/getting-data/overturemaps-py/)

```powershell
python -m pip install overturemaps
overturemaps download --bbox=-105.30,39.99,-105.20,40.06 -f geojson --type=place -o boulder-places.geojson
```

That exact bounding box was tested with client 1.0.2 and automatically resolved release `2026-09-23.1`. For reproducible refreshes, retain the companion `.state` release metadata and import date. Use `Feature.id` as the source ID; the GeoJSON exporter puts it at the feature's top level, not inside `properties`. Keep IDs and user-entered notes separate so a refreshed catalog cannot overwrite manager names, contact history or follow-up dates.

Actual sampled field shape, abbreviated to relevant fields:

```json
{
  "type": "Feature",
  "id": "28d78ab5-e495-4988-8b70-a237d04ed5ec",
  "geometry": {
    "type": "Point",
    "coordinates": [-105.28188045855157, 40.05733960208479]
  },
  "properties": {
    "names": {"primary": "Tierra y Fuego Taqueria", "common": null, "rules": null},
    "basic_category": "restaurant",
    "taxonomy": {
      "primary": "mexican_restaurant",
      "hierarchy": ["food_and_drink", "restaurant", "latin_american_restaurant", "mexican_restaurant"],
      "alternates": null
    },
    "phones": ["+17204545475"],
    "addresses": [{"freeform": "4550 Broadway", "locality": "Boulder", "postcode": "80304", "region": "CO", "country": "US"}]
  }
}
```

The schema makes names, addresses, phones, websites, emails, operating status, confidence and sources optional. It contains no owner or manager contact-person field. Read category hierarchy as well as primary category, so a search for restaurants includes Mexican restaurants. Preserve all phones/addresses in provenance even if the CRM selects a preferred display value. Phone formats vary, including parentheses and numbers without a country prefix. [Place schema](https://docs.overturemaps.org/schema/reference/places/place/)

Recommended import behavior: preview matches; exclude `permanently_closed`; present unknown status honestly; let the user choose confidence thresholds; keep source release, source ID, license and timestamps; deduplicate on stable ID plus normalized address/phone where appropriate; preserve independently collected notes and contacts during refresh. Treat a count of 50 returned records as 50 candidates, not 50 verified purchasing decision-makers.

## Boulder quality measurement

This was an actual download, not an estimate. The box covers Boulder and some nearby area; it is not the exact municipal boundary. Presence checks do not validate whether records are distinct, current or suitable for Cintas.

| Presence check | Count | Share |
|---|---:|---:|
| All downloaded records | 11,587 | 100% |
| Name present | 11,587 | 100% |
| Any phone present | 9,548 | 82.4% |
| Any address object present | 11,587 | 100% |
| Street/freeform + city + state + ZIP present | 11,380 | 98.2% |
| Website present | 9,868 | 85.2% |
| Marked permanently closed | 739 | 6.4% |

Applying `operating_status != permanently_closed` and `confidence >= 0.8` yielded 7,086 candidates; 5,736 had both a phone and full address components (80.9% of that filtered set). The confidence threshold is a practical example, not a certified accuracy threshold. The data includes professionals, offices and other places beyond straightforward storefront leads. A few source records have old underlying update timestamps even when the release is new. Before making a coverage promise, manually verify a random sample of target-category businesses and measure duplicates, reachability and location accuracy.

Target-category matching checks `taxonomy.hierarchy`, `taxonomy.primary` and `basic_category`, using exact category values:

| Target | Values matched | All matches | Not closed, confidence >= 0.8 | Also phone + full address |
|---|---|---:|---:|---:|
| Restaurants and cafes | restaurant, cafe, coffee_shop | 636 | 526 | 418 |
| Auto repair | automotive_repair | 86 | 63 | 57 |
| Hotels | hotel | 25 | 20 | 20 |
| Gyms and studios | gym, fitness_studio | 140 | 102 | 97 |
| Dentists | dental_clinic | 107 | 83 | 83 |
| Schools | school | 80 | 57 | 55 |

The union contains 730 source IDs with phone and full address. Sorting by great-circle distance from latitude 40.015, longitude -105.27 produces 50 candidates within 0.610 km. This remains a candidate list: inspection shows potential rebrands/duplicates such as Locale Boulder/Pizzeria Alberico sharing normalized phone 3034423003, and Rincon Del Sol/El Rincon sharing 3034420541. A school category can also include an event associated with a school. Filter by industry before interpreting phone coverage, and deduplicate on normalized identity evidence before promising 50 distinct businesses. Auto-repair records may have `basic_category=automotive_service`, so matching only the basic category would miss them.

Observed dataset labels for a source allowlist are `Overture`, `Overture-signals`, `BrightQuery`, `meta`, `Microsoft`, `Foursquare`, `AllThePlaces`, `DAC`, `RenderSEO`, and `PinMeTo`. The first two label generated confidence/status signals rather than independent business listings. This is an observed sample, not an exhaustive guarantee about future releases. Reject or flag unfamiliar source licenses during import instead of silently assuming their terms.

## Geoapify: viable low-cost fallback

Its Places documentation explicitly states that the service uses OSM and permits caching/storing without limits. Searches support a radius, city or bounding box. The main search output documents name, address, coordinates, category and a place ID; contact details are handled by the separate Place Details API, so do not promise every basic search includes a phone. [Places documentation](https://apidocs.geoapify.com/docs/places/)

The current pricing page expressly allows commercial production on the free plan with required attribution. It includes 3,000 credits/day and a 5-request/second limit. Fifty returned places costs about three search credits under the published credit examples; extra detail calls add usage. Paid API 10 starts at $59/month, so that minimum subscription is uneconomical if only 50 total leads are needed. [Pricing](https://www.geoapify.com/pricing/), [Places credit examples](https://www.geoapify.com/places-api/)

The older February 2024 terms say free commercial production has unspecified limitations and always require OSM attribution, plus Geoapify attribution on the free plan. Read the current plan and endpoint restrictions together rather than promising unlimited production usage. [Terms](https://www.geoapify.com/terms-and-conditions/)

ODbL section 3.1 expressly permits permanent reproductions; 4.5(c) says internal organization use of a derived database is not public and does not trigger 4.4 share-alike. Public sharing/use of a derivative database or its produced work can trigger attribution and database-access obligations. A private rep CRM therefore has a useful internal-use route, but expanding into a publicly served directory needs a fresh assessment. Keep OSM-derived enrichment identifiable and preserve source attribution. [ODbL legal text](https://opendatacommons.org/licenses/odbl/1-0/)

## Foursquare distinction and Apify limitations

Foursquare Open Source Places is an Apache 2.0 dataset with names, addresses, categories, telephone, website, organization email and refresh/closure dates. It can be downloaded as open data; no manager field is documented. It is a credible alternative or separately sampled supplement. [Dataset schema](https://docs.foursquare.com/data-products/docs/places-os-data-schema), [Access guide](https://docs.foursquare.com/data-products/docs/access-fsq-os-places)

The self-service Places API is governed by a different EULA: section 2.1 incorporates account-specific caching limits, and section 2.2 requires branded credit. The referenced usage-guideline page returned a title and navigation without substantive retention rules when opened. Therefore this review cannot establish the API's present retention duration. Do not apply older Personalization API limits to the new Places API or treat Apache licensing of the open dataset as permission for API responses. Obtain explicit terms for indefinite CRM storage before choosing the API for that role. [Places API EULA](https://foursquare.com/legal/terms/apilicenseagreement/), [Linked usage guidelines](https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines)

Apify explicitly leaves compliance with laws, target-site terms and data-protection rules to customers. Paying for an actor changes the means of retrieval, not the target data's license. A Google Maps scraping actor is consequently not a verified licensing workaround for building a permanent business catalog. [Apify shared responsibility](https://docs.apify.com/security/shared-responsibility)

No researched source supports a guarantee of 50 accurate manager names with permanent retention rights for under $1. Use the open catalog for business identity and main phone, then collect decision-maker names through calls, visits, user imports or a provider whose agreement expressly permits retained contact enrichment.
