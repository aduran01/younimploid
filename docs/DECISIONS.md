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

- **Date:** 2026-10-31
- **Decision:** For now, job cards and details use only HiringCafe's data, and the extension does not visit posting sites to collect job information. The Apply flow is unchanged: it still opens the ATS page and autofills there. "Scrape" here means reading the JSON data route in the spec, not parsing page HTML.
- **Rationale:** User's decision: the title, brief description and keywords already appear on HiringCafe's cards. The data route is simpler and less fragile than parsing HTML.
- **To verify:** The spec does not confirm that the data route includes a brief description and keywords. Check in Session 1.1.
- **Still open:** Content-script injection (static matches vs programmatic) is decided in Session 1.6.

## D-008: Chrome only, Node 22, npm

- **Date:** 2026-10-31
- **Decision:** Target Chrome only (latest stable). Develop with Node 22 and npm.
- **Rationale:** The spec targets a Chrome extension, and Node 22 is already installed on the user's machine.
