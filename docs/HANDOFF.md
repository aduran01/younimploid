### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal
Phase 1 — pivot and companion foundation: a side-panel autofill companion to hiring.cafe. No autofill yet.

### Done
Session 1.2: docs, CLAUDE.md and scaffold realigned; src/options/ is the full-tab page; searchState.ts shelved.
Session 1.3: typed, validated, migrated storage in src/shared/storage/, with backup and subscriptions.

### Next
Session 1.4 onward: profile page, side panel, detection of tabs opened from hiring.cafe. Prompts not received yet; the user supplies them.

### Open questions
1. Submission limits, if auto-submit is ever enabled.
2. What may count as HIGH confidence: EEO answers, resume upload, AI-written content?
3. AI providers: Anthropic, OpenAI, or both? (Settings allows either.)
4. Template format: .docx and/or structured? Is PDF output needed? (Decide once templates are provided.)
5. Audit log export and clearing. (Capped at 1,000 entries for now.)
6. Content-script injection: static matches vs programmatic with optional host permissions. Needed soon for auto-start.

### Noticed, not fixed
Earlier captures in docs/HIRINGCAFE.md were at hiringcafe.com, while D-019 says hiring.cafe. Tab detection must confirm against the real site.
Git history still has the user's earlier location: commit fd143e8 contains Fort Washington. Check before making the repo public.
Toolbar icon still opens the full-tab page until the side panel session changes it.
Resume storage is only unit tested with an in-memory store; real IndexedDB needs a manual check once the profile page uses it.
npm audit: 10 moderate findings, all through eslint/typescript-eslint (minimatch). Dev tooling only.
Branch is master (pushed to origin/master), but the main branch is reported as main.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed.
Hook falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.

### Files to stage
See the end-of-session proposal; never node_modules/ or dist/.
