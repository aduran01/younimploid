# HiringCafe capture notes (Session 1.1, in progress)

Raw findings to move into `docs/HIRINGCAFE.md` when Session 1.1 resumes.

## Access

- A plain script request to `/classic` returned 403 with a Cloudflare challenge.
- Page loads in the user's Chrome returned 200.
- A fetch from the extension's service worker is untested.

## Request

- `buildId` seen: `9jfApQmjZf4dJOgHX4nAt` (changes on deploy).
- Pagination is a separate `&page=N` parameter beside `searchState`, seen for N=1..9. The unpaged request reports `ssrPage` 0.
- The site's own UI fired `page=1..9` in one burst. Our client must only request a page when the user asks for it.

## searchState keys beyond the samples

Observed with no explicit location, in this order:

```json
{"workplaceTypes":["Remote"],"commitmentTypes":["Full Time"],"restrictJobsToTransparentSalaries":true,"calcFrequency":"Hourly","maxCompensationLowEnd":"30"}
```

- `workplaceTypes` is top-level with no explicit location; with one, it is `locations[].workplace_types`. The UI offers Remote, Hybrid, Onsite and Field.
- `commitmentTypes` UI values: Full Time, Part Time, Contract, Internship, Temporary, Seasonal, Volunteer.
- `calcFrequency` UI values: Hourly, Daily, Weekly, Bi-Weekly, Monthly, Yearly. Only Hourly was captured in a URL.
- `restrictJobsToTransparentSalaries` is the "Transparent salaries only" toggle. It turns on by itself when a minimum salary is entered.
- `maxCompensationLowEnd` appears to filter on the top of a job's pay range: in 86 filtered hits at 65000, the lowest yearly maximum was 65000, while 28 yearly minimums were below it.

## Response

- With no location, the server adds `id: "user_country"` with `flexible_regions: ["anywhere_in_continent", "anywhere_in_world"]` to `initialSearchState`.
- Hits returned can exceed `ssrPageSize` (71 and 86 against 40). Cause unknown.
- No description field was found. Cards appear to use `company_tagline` and `requirements_summary`; `technical_tools` is the closest thing to keywords.
- `job_information` holds lists of what look like other users' IDs (`viewedByUsers`, `savedFromUsers`, `appliedFromUsers`, `hiddenFromUsers`). They are emptied in fixtures and must stay out of our types.
- `source` ids seen but not in the spec: bamboohr, breezy, adhoc, workable, gusto, paycom, recruitee, hrsmart, avature, paycor, oraclepeoplesoft, oraclecloud, paylocity, governmentjobs, paradox, pageup, silkroad.

## Not captured

Hybrid-only and keyword plus filters.
