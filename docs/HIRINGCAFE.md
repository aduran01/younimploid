# HiringCafe data contract

An unofficial, undocumented endpoint used for personal use. Treat all of it as fragile. Types are in `src/shared/hiringcafe/types.ts`; fixtures are in `tests/fixtures/hiringcafe/`. Observed 2026-10-31.

## Access

| Request | Result |
| --- | --- |
| Plain script request to `/classic` | 403 with a Cloudflare challenge (`cf-mitigated: challenge`) |
| Page loads in the user's Chrome, signed out | 200 |
| Fetch from the extension's service worker | **Untested** |

A challenge is never solved or worked around: stop and hand off to the user.

## Endpoint

```
GET https://hiringcafe.com/_next/data/{buildId}/classic.json?searchState=<encoded>[&page=N]
```

- **`buildId`:** read from the `__NEXT_DATA__` script tag on `/classic`. Value seen: `9jfApQmjZf4dJOgHX4nAt`. The spec says it changes on deploy and a stale one returns 404; neither has been observed directly.
- **`page`:** a separate parameter beside `searchState`, seen for N=1 to 9. The unpaged request reports `ssrPage: 0`.
- **Encoding:** form encoding, with spaces as `+`. Key order is kept as built.
- **Politeness:** the site's own page fired `page=1` to `page=9` in one burst while being scrolled. Our client must not copy this and only requests a page when the user asks for it.

## searchState keys

All keys are optional. `searchQuery` is from the spec; the rest were seen in the site's URLs.

| Key | Example values | UI filter |
| --- | --- | --- |
| `searchQuery` | `"unity developer"` | Job title or keyword |
| `locations[]` | Object with `id: "us-zip-55934"`, address and `geometry` | Location |
| `locations[].workplace_types` | `[]` (all), `["Onsite"]` | Workplace type, when a location is chosen |
| `locations[].options` | `radius: 80`, `radius_unit: "miles"`, `ignore_radius: false` | Radius |
| `workplaceTypes` | `["Remote"]` | Workplace type, when no location is chosen |
| `commitmentTypes` | `["Full Time"]` | Commitment |
| `restrictJobsToTransparentSalaries` | `true` | "Transparent salaries only"; turns on by itself when a minimum is entered |
| `departments` | `"Software Development"`, `"Data and Analytics"` | Departments |
| `calcFrequency` | `"Hourly"`; absent for Yearly | Salary "per" period |
| `maxCompensationLowEnd` | `"65000"` (a string) | Minimum salary |
| `seniorityLevel` | `"No Prior Experience Required"`, `"Entry Level"` | Experience |
| `securityClearances` | `["None"]` | Security Clearance: "No explicit reference to clearance" |

UI options seen but not captured in a URL: Hybrid and Field workplace types; Part Time, Contract, Internship, Temporary, Seasonal and Volunteer commitments; other salary periods.

**Minimum salary meaning:** `maxCompensationLowEnd` appears to filter on the top of a job's pay range. In 86 hits filtered at 65000, the lowest yearly maximum was 65000, while 28 yearly minimums were below it. Jobs that start under the minimum can still appear.

**No location:** the server adds a default to `initialSearchState`: `id: "user_country"` with `flexible_regions: ["anywhere_in_continent", "anywhere_in_world"]`. Seen as the United States; it may depend on where the request comes from.

## Response shape

`{ pageProps, __N_SSP }`, where `pageProps` includes:

| Field | Notes |
| --- | --- |
| `ssrHits` | Job objects. Count can exceed `ssrPageSize` (71 and 86 against 40) |
| `ssrTotalCount`, `ssrCompanyCount` | Totals for the search |
| `ssrPage`, `ssrPageSize`, `ssrIsLastPage` | Pagination; use `ssrIsLastPage` rather than counting hits |
| `ssrError` | Only ever null so far |
| `ssrSignedIn` | False in all captures |
| `initialSearchState` | The search as the server applied it |

Each hit has `id`, `objectID`, `source`, `board_token`, `source_and_board_token`, `apply_url`, `is_expired`, `job_information`, `v5_processed_job_data` and `enriched_company_data`, among others.

**Job cards:** no description field was found. Cards appear to use `company_tagline` and `requirements_summary`; `technical_tools` is the closest thing to keywords.

**Privacy:** `job_information.viewedByUsers`, `savedFromUsers`, `appliedFromUsers` and `hiddenFromUsers` hold what look like other users' IDs. They are emptied in fixtures, left out of our types, and must never be stored. The `num_*` counts are fine.

## `source` ATS ids seen

adhoc, adp, ashby, avature, bamboohr, breezy, dover, eightfold, governmentjobs, grnhse, gusto, hrsmart, icims2, lever, oraclecloud, oraclepeoplesoft, pageup, paradox, paycom, paycor, paylocity, phenompeople, recruitee, silkroad, smartrecruiters, ultipro, workable, workday

## Known unknowns

- Whether a service worker fetch gets past Cloudflare.
- The exact `__NEXT_DATA__` tag markup, since no `/classic` HTML has been saved.
- Why hit counts exceed `ssrPageSize`, and whether results overlap between pages.
- Whether `ssrPage` equals N for `page=N`.
- The key order of `searchQuery` among other keys in the site's own URLs.
- Hybrid-only and keyword-plus-filters URLs, and where full job descriptions come from.
- `/api/search-jobs` is out of scope and unexplored.
