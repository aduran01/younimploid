### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal
Session 1.2: job fetch client in the background service worker. Plan proposed, awaiting approval.

### Done
Session 0.1: planning docs. Session 0.2: MV3 + Vite + React + TS + Tailwind + Vitest scaffold; toolbar icon opens the dashboard; PING/pong round-trip.
Session 1.1: docs/HIRINGCAFE.md, src/shared/hiringcafe/ (types, searchState), fixtures and tests.

### Next
Session 1.2: implement the approved plan. Its dev button is the first real test of whether an extension fetch gets past Cloudflare. If challenged: stop and hand off.
The user supplies later phases in increments (D-003).

### Open questions
Unanswered; no recommendation has been adopted. Settle 1 and 3 before any auto-submit work.
1. "Human-like delays": rate limiting only, or anything more? (Must not become bot-detection evasion.)
2. Rate-limit numbers for HiringCafe requests and auto-submits.
3. What may count as HIGH confidence: EEO answers, resume upload, AI-written content?
4. AI providers: Anthropic, OpenAI, or both?
5. Template format: .docx and/or structured? Is PDF output needed? (Decide once templates are provided.)
6. Audit log retention, export and clearing.
7. GitHub Pages dashboard shell: keep as an optional later item?
8. Content-script injection: static matches vs programmatic with optional host permissions (decide in 1.6).

### Noticed, not fixed
Sample location is now the placeholder Eyota, MN 55934 (user's choice, coordinates approximate). The earlier address and coordinates may remain in git history; check before making the repo public.
Session 1.1 went over the approved request budget: scrolling /classic fired classic.json page=1..9 plus prefetches in one burst. Do not drive the live site UI again without a new limit.
npm audit: 10 moderate findings, all through eslint/typescript-eslint (minimatch). Dev tooling only, not in the built extension.
Branch is master (pushed to origin/master), but the main branch is reported as main.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed.
Hook falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.

### Files to stage
See the end-of-session proposal; never node_modules/ or dist/.
