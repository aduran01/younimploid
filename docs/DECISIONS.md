# Decisions

Check this log before re-deciding anything. Add new entries at the bottom. Unanswered questions live in [HANDOFF.md](HANDOFF.md).

## D-001: Product name is younimploid

- **Date:** 2026-10-31
- **Decision:** The product is called younimploid. The name "OneClick Apply" in the Session 0.1 prompt is not used.
- **Rationale:** User's decision. It matches the spec and the repo.

## D-002: Adjust CLAUDE.md rather than rewrite it

- **Date:** 2026-10-31
- **Decision:** The existing `CLAUDE.md` is kept and extended, including rules stricter than the Session 0.1 NEVER list.
- **Rationale:** User's decision. The existing file already covers the full list.

## D-003: Phases are supplied in increments

- **Date:** 2026-10-31
- **Decision:** `ARCHITECTURE.md` lists only Phase 0 for now. The user adds later phases incrementally, in place of the Phases 0-5 plan in the Session 0.1 prompt.
- **Rationale:** User's decision.

## D-004: Dashboard is a full-tab page

- **Status:** Superseded by D-012 and D-016. There is no dashboard.
- **Date:** 2026-10-31
- **Decision:** The dashboard is a full-tab page opened from the toolbar icon, not a popup.
- **Rationale:** A popup closes when it loses focus and is too small for search plus job detail.

## D-005: Files in IndexedDB, everything else in chrome.storage.local

- **Date:** 2026-10-31
- **Decision:** Resume and template files live in IndexedDB in the extension's origin. Profile, job states, settings and the API key live in `chrome.storage.local`. Content scripts receive files through the background.
- **Rationale:** `chrome.storage.local` has a 10 MB default quota unless `unlimitedStorage` is requested, and it cannot hold binary files without encoding them. Content scripts cannot read the extension's IndexedDB directly.

## D-006: Vite extension tooling deferred to Session 0.2

- **Date:** 2026-10-31
- **Decision:** The choice between `@crxjs/vite-plugin`, `vite-plugin-web-extension`, WXT and plain multi-entry Vite is made in Session 0.2.
- **Rationale:** It is a dependency choice, and Session 0.1 adds no dependencies.

## D-007: Job data comes only from HiringCafe

- **Status:** Superseded by D-017. The extension does not fetch job data.
- **Date:** 2026-10-31
- **Decision:** For now, job cards and details use only HiringCafe's data, and the extension does not visit posting sites to collect job information. The Apply flow is unchanged: it still opens the ATS page and autofills there. "Scrape" here means reading the JSON data route in the spec, not parsing page HTML.
- **Rationale:** User's decision: the title, brief description and keywords already appear on HiringCafe's cards. The data route is simpler and less fragile than parsing HTML.
- **To verify:** The spec does not confirm that the data route includes a brief description and keywords. Check in Session 1.1.
- **Still open:** Content-script injection (static matches vs programmatic) is decided in Session 1.6.

## D-008: Chrome only, Node 22, npm

- **Date:** 2026-10-31
- **Decision:** Target Chrome only (latest stable). Develop with Node 22 and npm.
- **Rationale:** The spec targets a Chrome extension, and Node 22 is already installed on the user's machine.

## D-009: Build with @crxjs/vite-plugin

- **Date:** 2026-10-31
- **Decision:** Use `@crxjs/vite-plugin` 3.0.0 with Vite 8. This resolves D-006.
- **Rationale:** It reads the manifest directly and handles content scripts and service workers without custom build code. Plain Vite needs more setup, and WXT is a whole framework.

## D-010: TypeScript stays on 6.0.x for now

- **Date:** 2026-10-31
- **Decision:** Pin `typescript` 6.0.3 rather than the latest 7.x.
- **Rationale:** `typescript-eslint` 8.72.1 requires TypeScript below 6.1.

## D-011: No runtime validation library for HiringCafe responses yet

- **Date:** 2026-10-31
- **Decision:** Use plain TypeScript types, with no `zod`. Any response checks are small hand-written guards.
- **Rationale:** No dependency is added without a clear need, and most fields are only displayed. Revisit if malformed data causes real problems.

## D-012: The interface is a Chrome side panel

- **Date:** 2026-10-31
- **Decision:** The extension's main interface is a side panel used alongside hiring.cafe.
- **Rationale:** A popup closes when the user clicks the page. The user prefers browsing on hiring.cafe itself, and dropping the job dashboard removes the Cloudflare and unofficial-endpoint risks.

## D-013: Autofill starts automatically on tabs opened from hiring.cafe

- **Date:** 2026-10-31
- **Decision:** On supported sites in tabs opened from hiring.cafe, filling starts automatically and includes attaching the resume. Any other tab uses a "Fill this application" button.
- **Rationale:** The user wants this automated, and limiting it to those tabs stops it firing on forms they didn't mean to fill. Some sites upload the resume on attach, and the user accepted that.

## D-014: Submitting is manual

- **Date:** 2026-10-31
- **Decision:** The user submits every application. Optional auto-submit stays a later feature, off by default.
- **Rationale:** Review-first is the product's core promise.

## D-015: Keep our own tracker

- **Date:** 2026-10-31
- **Decision:** The extension keeps its own application tracker.
- **Rationale:** It can record what was actually filled and sent, and needs no HiringCafe account.

## D-016: Profile and settings live on a full-tab page

- **Date:** 2026-10-31
- **Decision:** The scaffold's full-tab page becomes the profile and settings screen, in `src/options/`.
- **Rationale:** These forms are too large for a narrow panel.

## D-017: Job context is best-effort

- **Date:** 2026-10-31
- **Decision:** Job details for the tracker are read from the hiring.cafe page when possible, with the application page as the fallback. Autofill never depends on them.
- **Rationale:** Reading another site's page breaks if it is redesigned, and that must not break the core feature.

## D-018: No HiringCafe network access or host permissions

- **Date:** 2026-10-31
- **Decision:** No code fetches HiringCafe, and the manifest has no HiringCafe host permission. The original fetch client was never built, so nothing had to be removed. `searchState.ts` moved to `shelved/`.
- **Rationale:** Nothing uses them. Reading the page for job context will add its own access when that session arrives.

## D-019: The HiringCafe domain is hiring.cafe

- **Status:** Partly superseded by D-022.
- **Date:** 2026-10-31
- **Decision:** The extension recognizes `hiring.cafe` only.
- **Rationale:** User's decision. Earlier captures in `docs/HIRINGCAFE.md` went to `hiringcafe.com`, so tab detection must confirm this against the real site.

## D-020: Pacing is a single fixed delay, for page stability only

- **Date:** 2026-10-31
- **Decision:** `Settings.fieldDelayMs` is one fixed value, not a random range. This answers the open question about "human-like delays".
- **Rationale:** Randomized timing would imitate a human, which is too close to evading bot detection. This changes the Session 1.3 prompt, which asked for a range.

## D-021: Storage shape

- **Date:** 2026-10-31
- **Decision:** One module per entity in `src/shared/storage/`, with hand-written validators (per D-011) on every read and ordered migrations. Values failing validation fall back to defaults or are dropped. `autoSubmit` is typed as `false` and forced to false by the validator, including on backup import.
- **Rationale:** Validators that copy only known fields also mean sensitive or unknown fields can't enter the profile. Auto-submit can't be turned on until a later session deliberately changes the type.

## D-022: HiringCafe is recognized on both of its domains

- **Date:** 2026-10-31
- **Decision:** The extension recognizes `hiring.cafe` and `hiringcafe.com`, with or without `www`. This supersedes the "`hiring.cafe` only" part of D-019.
- **Rationale:** Checked in Chrome: `https://hiring.cafe/` redirects to `https://hiringcafe.com/`, so matching only `hiring.cafe` would never see a real Apply click.

## D-023: Pacing setting stays a single value

- **Date:** 2026-10-31
- **Decision:** The Settings tab shows one delay value, not the "field delay range" in the Session 1.4 prompt.
- **Rationale:** D-020 already rejected a range, because randomized timing is too close to imitating a human.

## D-024: Toolbar icon opens the side panel

- **Date:** 2026-10-31
- **Decision:** Clicking the toolbar icon toggles the side panel, through `setPanelBehavior({ openPanelOnActionClick: true })`. The profile and settings page opens from a link in the panel and from "Options" in the icon's right-click menu (`options_page`). This differs from Session 1.4 requirement 7, which had the icon open the page.
- **Rationale:** One click can't do both, and the panel is the main interface (D-012). [sidePanel docs](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

## D-025: One global side panel that follows the active tab

- **Date:** 2026-10-31
- **Decision:** The manifest sets one `side_panel.default_path`, with no per-tab `setOptions`. The panel asks for the active tab with `tabs.query` and re-reads on `tabs.onActivated` and on storage changes.
- **Rationale:** The docs say a panel set for a specific `tabId` is a different instance from the default, and that a panel is hidden on tabs where it isn't enabled. The workflow needs it to stay open across tabs. `tabs.query` needs no permission here, since only the tab ID is read. [sidePanel docs](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

## D-026: A click in the side panel does not grant activeTab

- **Date:** 2026-10-31
- **Decision:** "Fill this application" will not rely on `activeTab`. Proposed for Session 2.1: on click, call `chrome.permissions.request` for that tab's origin, with `https://*/*` under `optional_host_permissions`, then inject with `chrome.scripting`.
- **Rationale:** The [activeTab docs](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) list exactly four invocations: executing an action, a context menu item, a `commands` keyboard shortcut, and accepting an omnibox suggestion. A click inside a side panel isn't listed. The [permissions docs](https://developer.chrome.com/docs/extensions/reference/api/permissions) require a user gesture and describe this `optional_host_permissions` pattern for hosts found at runtime.
- **Tested in real Chrome, Session 2.1:** a real click on the panel button called `permissions.request` for the right origin with no gesture error, and the call stayed pending, as expected while a prompt is open. The prompt itself and accepting it were not automated, so the user's manual test covers those.

## D-027: Detect HiringCafe tabs with webNavigation.onCreatedNavigationTarget

- **Date:** 2026-10-31
- **Decision:** A tab counts as opened from HiringCafe when `webNavigation.onCreatedNavigationTarget` fires and `webNavigation.getFrame` shows the source frame is on HiringCafe. The session and application start when that tab first commits a non-HiringCafe http(s) page. Every later main-frame commit updates the session. A user-driven transition (typed, bookmark, omnibox search) or a return to HiringCafe ends it; the application is kept.
- **Options compared:**

| Option | Permission | Problem |
| --- | --- | --- |
| `tabs.onCreated` + `openerTabId` | None for the ID; `tabs` or host access for the opener's URL | From memory of Chromium's tab strip, Ctrl+T can set an opener too, which would break "a tab I open myself never counts". Unverified, and not stated in the docs |
| `webNavigation.onCreatedNavigationTarget` (**chosen**) | `webNavigation`; `getFrame` then gives the source URL, so `tabs` isn't needed | Install warning about browsing history |
| `document.referrer` or `window.opener` in the new page | Needs injection into the new page | Unavailable with `noreferrer` or `noopener` |

- **Observed on the real site:** the job page's Apply button is a `<button>` that calls `window.open('about:blank', '_blank')`, gets a window back, then points that tab at the ATS. So the tab starts blank and `noopener` doesn't apply to it. Job card links are `target="_blank" rel="noopener noreferrer"` but go to `/job/...` on HiringCafe, which is why no session starts until the tab leaves the site.
- **noopener:** the docs for both events say nothing about it, and it is untested, since the Apply button doesn't use it.
- **Tested in real Chrome, Session 2.1:** in a throwaway profile, signed out, on one job page, with the panel open and the worker stopped before the click, Apply produced "Opened from HiringCafe" with the job title and company. The user's own earlier test did not show that, and the cause is not yet known. See HANDOFF.

## D-028: How content scripts reach ATS tabs

- **Date:** 2026-10-31
- **Status:** Approved by the user and built in Session 2.1.
- **Decision:** Add `scripting`, and list the supported ATS domains under `optional_host_permissions`. Settings gets an "Enable autofill on supported sites" control that calls `permissions.request`. The background then injects with `chrome.scripting.executeScript` when a tracked tab commits on a granted site.
- **What the user sees:** at install, warnings for the required permissions only (browsing history, and data on the HiringCafe sites). At first use, one Chrome prompt from Settings listing the ATS sites. On an ungranted site, the panel explains and offers to request that one.
- **Rationale:** Static `content_scripts` would demand every ATS domain at install. `executeScript` needs `scripting` plus host access, per the [scripting docs](https://developer.chrome.com/docs/extensions/reference/api/scripting). `permissions.request` needs a user gesture, so it can't fire by itself when a tab opens, hence the up-front step in Settings. `activeTab` doesn't help (D-026).

## D-029: Job context comes from the page's JobPosting data

- **Date:** 2026-10-31
- **Decision:** The read-only content script listens for clicks on Apply controls and reads `JobPosting` JSON-LD (`title`, `hiringOrganization.name`), falling back to the `h1` and the element after it on `/job/` pages. It keeps title, company and the URL without its query string. The context is used once, and only within 60 seconds of the click.
- **Rationale:** The page's class names are generated utilities, so structured data is likely to outlast them. This keeps D-017's best-effort rule: on any failure the application has `detailsSource: 'application_page'`.

## D-030: The options page uses storage modules directly

- **Date:** 2026-10-31
- **Decision:** The full-tab page calls `src/shared/storage/` directly for profile, resume, settings and backup. The side panel and content scripts go through typed messages.
- **Rationale:** The page is a trusted extension context with direct access to storage and IndexedDB, and resume blobs don't pass cleanly through runtime messages. This narrows the CLAUDE.md line saying the full-tab page talks to the background via messages.

## D-031: No DOM test library

- **Date:** 2026-10-31
- **Decision:** UI tests use `react-dom/server` and pure functions, with no jsdom or Testing Library.
- **Status:** Superseded by D-033.
- **Rationale:** No dependency without asking. These cover state rendering and the import confirmation; clicks are covered by the manual steps.

## D-032: Date of birth is stored and filled

- **Date:** 2026-10-31
- **Decision:** The profile has an optional `dateOfBirth`, and matching fields are filled. It is not on the sensitive denylist.
- **Rationale:** User's decision, asked in Session 2.1. The fields on the denylist stay as they are.

## D-033: jsdom and coverage for engine tests

- **Date:** 2026-10-31
- **Decision:** Add `jsdom` 29.1.1 and `@vitest/coverage-v8` 5.0.5 as dev dependencies, both approved by the user. Tests opt in per file with a `@vitest-environment jsdom` comment.
- **Rationale:** The engine needs a real DOM and a React-controlled input. The user approved jsdom 30.1.3, but it requires Node ^22.22.2 and this machine has 22.21.0, so 29.1.1 is used instead.

## D-034: Engine shape and pacing

- **Date:** 2026-10-31
- **Decision:** The adapter interface is the one in the Session 2.1 prompt, in `src/content/adapters/types.ts`, with no submit method. Pacing stays the one fixed `fieldDelayMs`, not the random delay that prompt asked for.
- **Rationale:** D-020 and CLAUDE.md rule out timing that imitates a human.

## D-035: Auto-start waits for a supported adapter

- **Date:** 2026-10-31
- **Decision:** Every site in `src/shared/atsSites.ts` is `planned`, and auto-start needs `supported`. So nothing starts by itself until an adapter ships. "Fill this application" runs the generic engine on any site the user allows.
- **Rationale:** This follows the Session 2.1 prompt literally, and the generic engine hasn't been tried on a real application form.

## D-036: Conservative page classification

- **Date:** 2026-10-31
- **Decision:** The classifier reads only headings and controls for wording, never body text. "Yes, this is the form" answers an ambiguous page and can't override a clear wall. No checkbox is ever ticked. Invisible reCAPTCHA doesn't count as a challenge. A visible one is detected from selectors and the iframe's `src` attribute, and nothing inside it is read or touched.
- **Rationale:** Job descriptions contain words like "log in". Invisible reCAPTCHA sits on many ordinary forms and isn't asking the user anything, so stopping on it would block them for no reason.
