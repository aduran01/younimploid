### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal
Phase 1 — pivot and companion foundation: a side-panel autofill companion to hiring.cafe. Built; waiting on the user's Chrome test. No autofill yet.

### Done
Sessions 1.2 and 1.3: docs realigned; validated, migrated storage.
Session 1.4: profile, resume, settings, tracker placeholder and backup tabs on the full-tab page.
Session 1.5: side panel following the active tab; manual sessions; activeTab answered (D-026).
Session 1.6: HiringCafe tab detection, sessions across redirects, read-only job context (D-027, D-029).

### Next
1. User runs the manual Chrome test, above all Apply click detection, which no unit test can prove.
2. User approves or changes D-028 (optional host permissions and injection), then Session 2.1.

### Open questions
1. Approve D-028? It decides what appears at install and first use.
2. Submission limits, if auto-submit is ever enabled.
3. What may count as HIGH confidence: EEO answers, resume upload, AI-written content?
4. AI providers: Anthropic, OpenAI, or both? (Settings allows either.)
5. Template format: .docx and/or structured? Is PDF output needed? (Decide once templates are provided.)
6. Audit log export and clearing. (Capped at 1,000 entries for now.)

### Noticed, not fixed
Never run in a loaded extension: the service worker, real IndexedDB, restart survival. The pages were only exercised on localhost with a stubbed chrome object.
Each Apply click creates an in_progress application, so clicking twice or abandoning a tab leaves extras. Tracker UI (2.6) should allow cleanup.
The build lists the content script's chunks as web_accessible_resources on HiringCafe (added by @crxjs), so that site could detect the extension.
Selects for EEO and work authorization use common wording; real forms vary, so 2.x must map them.
Git history still has the user's earlier location: commit fd143e8 contains Fort Washington. Check before making the repo public.
npm audit: 10 moderate findings, all through eslint/typescript-eslint (minimatch). Dev tooling only.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed.
Hook falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.

### Files to stage
See the end-of-session proposal; never node_modules/ or dist/.
