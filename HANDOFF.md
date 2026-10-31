### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal

Phase 0 — harness and scaffold. Next session: 0.1 (review CLAUDE.md, write ARCHITECTURE.md and DECISIONS.md, resolve open decisions), then 0.2 (scaffold that builds and loads).

### Done
Repo created and guardrails added by the user: .claude/settings.json (git-write deny rules) and .claude/hooks/block-git-writes.mjs (PreToolUse hook).
docs/SPEC.md, CLAUDE.md, docs/HANDOFF.md added.
### Next
Session 0.1: confirm/adjust CLAUDE.md; create docs/ARCHITECTURE.md, docs/DECISIONS.md, tests/fixtures/README.md; log the decisions below.
Session 0.2: MV3 + Vite + React + TS + Tailwind + Vitest scaffold; dashboard opens from toolbar icon; PING/pong round-trip.
Open questions (for the user)
Dashboard: full-tab page (assumed) or popup?
Resume/template file storage: IndexedDB or chrome.storage.local with unlimitedStorage?
Vite extension build approach (decide in 0.2 after comparing options).
Content-script injection: static matches vs programmatic injection with optional host permissions (decide in 1.6).
### Noticed, not fixed
(none yet)
### Files to stage
(proposed by Claude at the end of each session)