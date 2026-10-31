# younimploid: product spec

A personal Chrome extension (Manifest V3) that works alongside hiring.cafe. The user browses and filters jobs on hiring.cafe. The extension runs in a Chrome side panel and autofills applications, including attaching the resume, on the employer's own site. The original reasoning is in [research/direction-change.md](research/direction-change.md).

## Workflow

1. The user browses and filters jobs on hiring.cafe with the side panel open.
2. The user clicks "Apply Now", and hiring.cafe opens the job posting in a new tab.
3. If that tab came from hiring.cafe and the site is supported, the extension starts automatically.
4. If the page shows only the job description, the site's adapter tries to get to the application form.
5. The extension fills the fields from the profile and attaches the resume.
6. The side panel shows what was filled, what's missing and what needs an answer.
7. The user reviews and submits.
8. The application is recorded in the extension's tracker.

On any other tab, a "Fill this application" button starts the same process, so nothing fills without the user asking.

## Sign-in handoff

1. The extension detects a sign-in or create-account page and pauses.
2. The side panel asks the user to sign in or create the account, and the tracker marks the job as waiting on the user.
3. The user handles everything on those pages, including passwords, email verification and CAPTCHAs. The extension types nothing there, not even a name or email.
4. When an application form appears, filling resumes automatically. An "I'm signed in, continue" button covers cases where it doesn't notice.
5. If it can't tell a sign-up page from an application form, it pauses and asks.
6. Values a site pre-fills are never overwritten. Any that differ from the profile are flagged.

Progress is saved per tab so it survives redirects. If a verification link opens in a different tab, the user uses the "Fill this application" button there, and the tracker entry may need linking by hand.

## Decisions

| Decision | Choice |
| --- | --- |
| Interface | Chrome side panel, because a popup closes when the user clicks the page |
| Starting autofill | Automatic on tabs opened from hiring.cafe, including the resume, with a button everywhere else |
| Submitting | Manual. Optional auto-submit is a later, opt-in feature that is off by default |
| Tracker | Our own |
| Profile and settings | A full-tab page, since the panel is narrow |
| Job context | Read from the hiring.cafe page on a best-effort basis, with the application page as the fallback. Autofill never depends on it |

## Requirements

### Autofill engine

- A shared generic field matcher (label text, name, id, autocomplete and aria attributes mapped to profile fields), plus small per-ATS adapters that override only what it gets wrong (multi-step flows, custom widgets, file uploads, login walls).
- Adding an adapter is a small, documented unit of work.
- Greenhouse, Lever and Ashby come first, then coverage expands.

Adapter registry seed. Verify each before use:

| ATS (`source`) | Domains |
| --- | --- |
| greenhouse (grnhse) | boards.greenhouse.io, job-boards.greenhouse.io |
| lever | jobs.lever.co |
| ashby | jobs.ashbyhq.com |
| workday | *.myworkdayjobs.com |
| smartrecruiters | jobs.smartrecruiters.com |
| icims (icims2) | *.icims.com |
| taleo | *.taleo.net |
| brassring | sjobs.brassring.com |
| jazzhr | *.applytojob.com |
| ultipro/UKG | *.ultipro.com |
| dayforce | *.dayforcehcm.com |
| eightfold | *.eightfold.ai |
| dover | app.dover.com |
| adp | workforcenow.adp.com, myjobs.adp.com |
| rippling | ats.rippling.com |
| jobvite | jobs.jobvite.com |

### Review, confidence and submission

- After autofill, compute a confidence score. Any unfilled required field, custom free-text question, unusual widget, failed upload, or login or CAPTCHA wall means LOW confidence.
- LOW confidence never submits. The review panel highlights what was filled, what's missing and what needs a human answer.
- HIGH confidence (all standard fields filled, no custom questions) may auto-submit only if the user enabled it. It is off by default.
- Always show a pre-submit summary. Keep an audit log of what was filled and sent, which the user can inspect.
- Never mass-fire submissions.

### Application materials

- One saved profile: name, contact, address, links, work history, education, work authorization and EEO answers, and a resume file. Stored locally.
- AI drafts for custom screening questions, tunable in settings through an editable system prompt, and always shown for review before use.
- AI-tailored cover letters and resumes from the user's own templates. Templates are an immutable layout: only content may change. Every generated document is shown for review and approval, with a clear before and after, before it is attached or submitted.
- The user's own AI API key (Anthropic and/or OpenAI), stored in `chrome.storage.local` and entered in settings. No hardcoded keys and no third-party proxy.

### Safety

- Never solve or bypass CAPTCHAs or bot detection. On detecting one, stop, mark the application as needing manual completion, and hand off.
- Never fill payment, SSN or government ID fields. Leave them blank and flag them.
- Never create accounts or type passwords.
- Pacing is for page stability only, never to imitate a human or evade detection.

### Deliverables

- Extension source, loadable unpacked, and a build script.
- A README with install and usage, and a clear note that ATS Terms of Service risks apply, misuse can get accounts banned, and this is a personal-use tool.
- The adapter registry and a guide for adding adapters.

### Inputs from the user

- Resume and cover-letter templates.
- Profile details and EEO and work-authorization answers.
- Their own AI API key, entered in the extension and never committed.

Ask before making assumptions about ATS form behavior. Prefer small, testable adapters over broad, brittle ones.

## Known limits

- **Coverage:** some forms will fill completely, some partly and some not at all.
- **Resume upload:** some sites upload or read the resume as soon as it's attached, before submit, and a few may overwrite fields already filled.
- **Harder sites:** custom dropdowns, drag-and-drop uploads, forms embedded on company domains, and multi-step systems like Workday.
- **Job details for the tracker:** reading them from hiring.cafe could break if the site is redesigned.
- **Untested:** none of this has been tried on a real application form yet.

## Removed from the original direction

The job search dashboard (search, filters, job cards, detail views), the HiringCafe fetch client, and the optional GitHub Pages shell.

---

# Superseded direction (2026-10-31)

Kept as history. This is not the current spec.

Project: "younimploid" — a HiringCafe-style job browser + auto-apply browser extension
What I'm building

A Chrome extension (Manifest V3) that reproduces HiringCafe's job-browsing experience in its own dashboard, and adds a one-click "Apply" that autofills (and, when safe, submits) the application on the job's real external application site. Viewing the original posting must always remain an option.

A browser EXTENSION is the core, not a plain website, for two hard reasons I've already verified and that you must design around — do not try to work past them:

CORS blocks a static site from even reading the jobs. HiringCafe's data endpoint returns no Access-Control-Allow-Origin header, so a page served from *.github.io cannot fetch it from the browser. An extension CAN, because host_permissions exempt extension fetches from CORS.
No universal "apply." A single 93-job search spans ~27 different applicant tracking systems (ATSes), each a different domain with a different form and anti-bot setup. A web page on one origin cannot fill/submit a form on another origin. Only a content script injected into the actual ATS page can do the autofill. That is why this is an extension.

A companion dashboard MAY also be published to GitHub Pages for browsing, but all fetching and all autofill must run inside the extension (background service worker for fetch, content scripts for autofill). Treat GitHub Pages as an optional shell, not the engine.

Tech stack
Manifest V3 Chrome extension. TypeScript. React + Vite for the dashboard UI (popup or a full-tab dashboard page). Tailwind is fine.
Background service worker: all network calls (job fetch, AI calls).
Content scripts: per-ATS autofill, injected by URL match patterns.
Storage: chrome.storage.local for the user profile, saved/applied jobs, settings, and the user's own AI API key. No remote backend, no telemetry. Everything stays on the user's machine.
Data layer — how to get jobs from HiringCafe (verified)
Jobs come from a Next.js server data route: GET https://hiringcafe.com/_next/data/{buildId}/classic.json?searchState=<URL-encoded JSON>
{buildId} changes on every HiringCafe deploy. Read it dynamically: fetch https://hiringcafe.com/classic, parse the __NEXT_DATA__ script tag, take .buildId. Cache it; if a data fetch 404s, re-read the buildId and retry.
searchState is a JSON object. Minimal form: {"searchQuery":"unity developer"}. It also encodes location, filters, and pagination. Reverse-engineer the full schema by toggling filters on hiringcafe.com/classic and watching the ?searchState= param in the URL change — mirror those keys exactly.
Response shape (pageProps):
ssrHits: array of job objects (~93/page)
ssrTotalCount, ssrPage, ssrPageSize, ssrIsLastPage for pagination
Each job object includes (confirm/extend by inspection):
apply_url — the external application link
source — the ATS id (e.g. grnhse, workday, lever, ashby, icims2, taleo_careersection, smartrecruiters, brassring, jazzhr, ultipro, dayforce, phenompeople, eightfold, dover, rippling, adp)
board_token, source_and_board_token
v5_processed_job_data — rich structured fields: compensation (hourly/monthly/annual min/max), workplace_type, security_clearance, education/experience requirements, language requirements, company data, etc.
job_information, enriched_company_data, id, objectID
There is also a POST https://hiringcafe.com/api/search-jobs route (it exists but returned 405 to a naive POST — the body/method shape needs reverse- engineering). The _next/data route above is the simpler, working path; prefer it. Only fall back to /api/search-jobs if the data route proves insufficient.
Be a polite client: cache results, debounce searches, rate-limit, set a sane delay between page fetches. Do not hammer the endpoint.
Dashboard features (HiringCafe parity)
Keyword search + the filters HiringCafe exposes (location/remote-hybrid-onsite, pay, job type, etc.), infinite scroll / pagination over ssrHits.
Job cards + detail view rendering the rich v5_processed_job_data (comp, requirements, workplace type, company info).
Every job shows BOTH: an "Apply" button (the autofill flow) and an "Open original posting" link to apply_url.
Saved / Applied / Dismissed states persisted locally; an application tracker (status, date, which job, link) — this doubles as the user's job-search log.
The Apply flow — autofill engine
Clicking Apply opens the job's apply_url in a new tab; a content script matched to that ATS domain runs and fills the form from the saved profile.
Architecture: a shared generic field-matcher (match by label text, name, id, autocomplete attrs, aria-labels → map to profile fields) PLUS per-ATS adapters that override the generic logic for that system's quirks (multi-step flows, custom widgets, file-upload handling, login walls).
Build adapters for as many ATSes as feasible, prioritizing coverage. Seed the adapter registry with this source → domain mapping (verify each):
greenhouse (grnhse) → boards.greenhouse.io / job-boards.greenhouse.io
lever → jobs.lever.co
ashby → jobs.ashbyhq.com
workday → *.myworkdayjobs.com
smartrecruiters → jobs.smartrecruiters.com
icims (icims2) → *.icims.com
taleo → *.taleo.net
brassring → sjobs.brassring.com
jazzhr → *.applytojob.com
ultipro/UKG → *.ultipro.com
dayforce → *.dayforcehcm.com
eightfold → *.eightfold.ai
dover → app.dover.com
adp → workforcenow.adp.com / myjobs.adp.com
rippling → ats.rippling.com
jobvite → jobs.jobvite.com Start with Greenhouse, Lever, and Ashby (cleanest forms, best for proving the pattern), then expand. Make adding a new adapter a small, well-documented unit so coverage can grow easily.
Submission behavior — "mix by confidence"
After autofill, compute a confidence score for the filled form: did every required field get a confident mapping? Any unfilled required fields, custom free-text/essay questions, unusual widgets, file uploads that failed, or a detected login/CAPTCHA wall → LOW confidence.
HIGH confidence (all standard fields filled, no custom questions): may auto-submit, but only if the user has enabled auto-submit in settings (default this OFF; see safety).
LOW confidence: do NOT submit. Surface a clear review panel highlighting what was filled, what's missing, and anything that needs a human answer, and let the user finish + submit manually.
Always show a pre-submit summary and require the Apply flow to be auditable (log what was filled and what was sent).
Application materials
Profile autofill: one saved profile — name, contact, address, work authorization / EEO answers (user-provided), work history, links, and a resume file to upload. Stored locally.
AI screening-question answers: when a posting has custom free-text questions, draft answers from the profile. The user must be able to tune the behavior (tone/length/instructions in settings via an editable system prompt). Always shown for review before use.
AI-tailored cover letters AND resumes — format-locked:
The user will provide their own resume template and cover-letter template (I'll supply the files — expect them as inputs; support .docx and/or a structured format). These templates define a FIXED layout/format.
The AI may only adjust CONTENT to fit a job; it must NOT change the template's structure, formatting, sections, or styling. Treat the template as immutable layout, content as the only variable.
Every AI-generated cover letter and tailored resume must be shown to ME for review/edit/approval BEFORE it is attached or submitted. Show a clear before/after of what changed. Nothing AI-generated goes out unreviewed.
AI integration: use the user's OWN API key (support Anthropic and/or OpenAI), stored in chrome.storage.local, entered in settings. No hardcoded keys, no proxying through a third party.
Safety / correctness requirements (hard rules)
Default to review-before-submit; auto-submit is opt-in and never the default.
NEVER attempt to solve or bypass CAPTCHAs or bot-detection. On detecting one, stop, mark the application as needing manual completion, and hand control to the user.
Never fill or submit a payment field, SSN, or government ID. For sensitive identity fields, leave blank and flag for manual entry.
Do not create accounts or enter passwords on the user's behalf; if an ATS requires login, pause and let the user authenticate.
Rate-limit everything; add human-like delays; never mass-fire submissions.
Keep an application audit log the user can inspect.
Include a clear README note on ATS Terms-of-Service risk and that misuse can get accounts banned — this is a personal-use tool.
Build in phases
MVP: dynamic buildId + job fetch, dashboard with search/filter/detail, local profile, "Open original" link, and autofill (review-only, no auto-submit) for Greenhouse + Lever + Ashby. Application tracker.
Confidence scoring + opt-in auto-submit for high-confidence forms.
AI screening answers + format-locked cover letter/resume generation with review gates.
Expand ATS adapter coverage (Workday, iCIMS, SmartRecruiters, Taleo, JazzHR, UltiPro, Dayforce, ADP, …).
Deliverables
The extension source (loadable unpacked), a build script, a README with install + usage, the adapter registry + a guide for adding new adapters, and (optionally) a GitHub Pages build of the dashboard shell.
What I'll provide as inputs
My resume template and cover-letter template files (format-locked).
My profile details and EEO/work-authorization answers.
My own AI API key (entered in the extension, not committed to the repo).

Ask me before making assumptions on anything ambiguous in the ATS form behavior; prefer small, testable adapters over broad brittle ones.