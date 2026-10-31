### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal
Phase 2 — autofill. The generic engine and sign-in handoff are built. No site adapters yet, so nothing auto-starts (D-035).

### Done
Session 2.1: generic matcher, sensitive denylist, fill, resume attach, results in panel and audit log, optional host permissions (D-028).
Session 2.2: page classifier, pause and resume, "Is this the application form?", linking a tab to a tracker entry.

### Next
1. Find out why the user's Apply click test failed (below).
2. User runs the manual test on a real application form. The engine has only filled local test pages.
3. Site adapters, starting with Greenhouse, Lever and Ashby. Prompts come from the user.

### Open: user's Apply click test failed
The user clicked Apply and did not see "Opened from HiringCafe". Could not reproduce it: in real Chrome (throwaway profile, signed out, one job page, panel open, worker stopped first) it worked. Not yet ruled out: the extension not reloaded after a rebuild, being signed in to HiringCafe, a different Apply flow on other jobs. Need from the user: what the panel showed, and whether they were signed in.

### Open questions
1. Submission limits, if auto-submit is ever enabled.
2. What may count as HIGH confidence: EEO answers, resume upload, AI-written content?
3. AI providers: Anthropic, OpenAI, or both? (Settings allows either.)
4. Template format: .docx and/or structured? Is PDF output needed? (Decide once templates are provided.)
5. Audit log export and clearing. (Capped at 1,000 entries for now.)

### Noticed, not fixed
Forms inside iframes aren't reached: the engine runs in the top frame only.
A confirmation page marks the application submitted from wording alone. A false match is possible; tracker UI (2.6) should allow correcting it.
Filling runs once per page. A multi-step form that swaps steps without navigating isn't filled past step one until adapters add nextStep.
Each Apply click creates an in_progress application, so repeats leave extras. Tracker UI should allow cleanup.
The build lists the hiring.cafe script's chunks as web_accessible_resources on HiringCafe (added by @crxjs), so that site could detect the extension. The ATS engine is a single file and has none.
Git history still has the user's earlier location: commit fd143e8 contains Fort Washington. Check before making the repo public.
npm audit: 10 moderate severity vulnerabilities Dev tooling only.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed.
Hook falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.

### Files to stage
See the end-of-session proposal; never node_modules/ or dist/.
