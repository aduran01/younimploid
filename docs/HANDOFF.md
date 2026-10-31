### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.
### Current goal
Phase 2 — autofill. Greenhouse, Lever and the tracker are built. Ashby is blocked on a fixture.
### Done
Session 2.1 and 2.2: generic engine, classifier, sign-in handoff.
Greenhouse and Lever adapters, with fixture tests. Verified in the registry, so auto-start is on for them (D-039).
Session 2.6: tracker tab, panel summary, "Mark as submitted", audit view with masked values, linking entries.
### Next
1. User saves the Ashby pages (below), then build that adapter. Rendered form seen: two file inputs, the first for "Autofill from resume", the second `_systemfield_resume`; Location is a combobox.
2. User runs one real posting from hiring.cafe on Greenhouse and on Lever, stopping before submit. Neither adapter has filled a live form.
3. Find out why the user's Apply click test failed (below).
### Open: Ashby fixture needed
Ashby renders on the client, and its CSP stopped a snapshot being posted to localhost. Open the page, wait for it to render, use DevTools to copy the `html` element's outerHTML, and save it in tests/fixtures/ats/ashby/. Needed: a description page and an /application page, ideally from two companies, without typing anything into the form.
### Open: user's Apply click test failed
The user clicked Apply and did not see "Opened from HiringCafe". Could not reproduce it in a throwaway profile. Not yet ruled out: the extension not reloaded after a rebuild, being signed in to HiringCafe, a different Apply flow on other jobs. Need from the user: what the panel showed, and whether they were signed in.
### Open questions
1. Submission limits, if auto-submit is ever enabled.
2. What may count as HIGH confidence: EEO answers, resume upload, AI-written content?
3. AI providers: Anthropic, OpenAI, or both? (Settings allows either.)
4. Template format: .docx and/or structured? Is PDF output needed? (Decide once templates are provided.)
5. Audit log export and clearing. (Capped at 1,000 entries for now.)
### Noticed, not fixed
Lever parses the resume on attach. Filling waits only for the page to go quiet, so a slow parse may overwrite fields after the re-read and go unflagged.
Greenhouse's own "Autofill my application" and Lever's EEO survey radios are left alone. Greenhouse dropdowns all need the user (D-038).
No sign-in fixtures: none of these public pages showed one. Embedded Greenhouse forms on company domains aren't reached, since the engine runs in the top frame only.
Filling runs once per page. A multi-step form that swaps steps without navigating isn't filled past step one until adapters add nextStep.
Each Apply click creates an in_progress application. Linking merges extras; there is no delete.
The build lists the hiring.cafe script's chunks as web_accessible_resources on HiringCafe (added by @crxjs), so that site could detect the extension. The built manifest also lists src/content/atsEngine.js as web-accessible on all http(s) sites, which an earlier note here said wasn't so. Worth removing, since any page could use it to detect the extension.
Git history still has the user's earlier location: commit fd143e8 contains Fort Washington. Check before making the repo public.
npm audit: 10 moderate severity vulnerabilities. Dev tooling only.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed. It falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.
### Files to stage
See the end-of-session proposal; never node_modules/ or dist/.
