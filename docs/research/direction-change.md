# Direction change: from job dashboard to autofill companion

Agreed with the user on 2026-10-31.

**Before:** the extension rebuilt HiringCafe's job search in its own full-tab dashboard, fetching jobs from HiringCafe's unofficial data route.

**Now:** the user browses and filters on hiring.cafe itself. The extension runs alongside it in a Chrome side panel, and its main job is autofilling applications and attaching the resume on the employer's site.

## Workflow

1. The user browses and filters jobs on hiring.cafe with the side panel open.
2. The user clicks "Apply Now", and HiringCafe opens the job posting in a new tab.
3. If that tab came from HiringCafe and the site is supported, the extension starts automatically.
4. If the page shows only the job description, the site's adapter tries to get to the application form.
5. The extension fills the fields from the profile and attaches the resume.
6. The side panel shows what was filled, what's missing and what needs an answer.
7. The user reviews and submits.
8. The application is recorded in the extension's tracker.

On any other tab, a "Fill this application" button starts the same process, so nothing fills without the user asking.

## Account and sign-in handoff

1. The extension detects a sign-in or create-account page and pauses.
2. The side panel asks the user to sign in or create the account, and the tracker marks the job as waiting on the user.
3. The user handles everything on those pages, including passwords, email verification and CAPTCHAs. The extension types nothing there, not even a name or email.
4. When an application form appears, filling resumes automatically. An "I'm signed in, continue" button covers cases where it doesn't notice.
5. If it can't tell a sign-up page from an application form, it pauses and asks.
6. Details the site pre-fills from the account are left in place, and any that differ from the profile are flagged.

Progress is saved for each tab so it survives redirects. If a verification link opens in a different tab, the user uses the "Fill this application" button there, and the tracker entry may need linking by hand.

## Decisions

| Decision | Choice |
| --- | --- |
| Interface | Chrome side panel, because a popup closes when the user clicks the page |
| Starting autofill | Automatic on tabs opened from HiringCafe, including the resume, with a button everywhere else |
| Submitting | Stays manual |
| Tracker | Keep our own |
| Profile and settings | A full-tab page, since the panel is narrow |

## What's removed or changes

- **Removed:** the job search dashboard, including search, filters, job cards and detail views.
- **Dropped:** the original Session 1.2 (fetch client, `buildId`, rate limiter and cache).
- **Shelved:** `searchState.ts`. `types.ts`, the fixtures and `docs/HIRINGCAFE.md` stay as a reference for job data.
- **Replaced:** D-004 (full-tab dashboard) and D-007 (job data from the JSON route).
- **Repurposed:** the scaffold's full-tab page becomes the profile and settings screen.

## What stays the same

- Greenhouse, Lever and Ashby come first, with more systems added one adapter at a time.
- Optional auto-submit stays off by default and is planned for later.
- AI drafts use the user's own API key, keep the template layout and invent nothing, and nothing is used until the user approves it.
- Data stays on the user's machine, with no backend or telemetry.
- The extension never solves CAPTCHAs, creates accounts or types passwords.
- SSN, payment and government ID fields stay blank and are flagged, and legal consent boxes are never checked.

## Known limits

- **Coverage:** some forms will fill completely, some partly and some not at all.
- **Resume upload:** some sites upload or read the resume as soon as it's attached, before submit, and a few may overwrite fields already filled.
- **Harder sites:** custom dropdowns, drag-and-drop uploads, forms embedded on company domains, and multi-step systems like Workday.
- **Job details for the tracker:** reading them from HiringCafe's page could break if the site is redesigned. So that's a bonus, with the application page as the fallback, and autofill never depends on it.
- **Untested:** none of this has been tried on a real application form yet.
