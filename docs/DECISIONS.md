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
