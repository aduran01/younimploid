### Handoff

Updated at the end of every Claude Code session. Keep under 40 lines.

### Current goal
Phase 0 — harness and scaffold. Session 0.1 (docs) is complete; Session 0.2 (scaffold that builds and loads) is next.

### Done
Guardrails: .claude/settings.json (git-write deny rules) and .claude/hooks/block-git-writes.mjs (PreToolUse hook).
Session 0.1: moved SPEC.md and HANDOFF.md into docs/; adjusted CLAUDE.md; added docs/ARCHITECTURE.md, docs/DECISIONS.md, tests/fixtures/README.md.

### Next
Session 0.2: MV3 + Vite + React + TS + Tailwind + Vitest scaffold; dashboard opens from toolbar icon; PING/pong round-trip. Choose the Vite extension tooling (D-006).
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
Current branch is master (pushed to origin/master), but the main branch is reported as main.
Hook misses some git writes: git branch -D, rm, mv, pull, update-ref are allowed.
Hook falsely blocks read-only commands containing a keyword, e.g. git diff -- src/add.js.
Edit/Write deny rules for .claude/ were removed from settings.json, so only CLAUDE.md protects that folder.

### Files to stage
CLAUDE.md, docs/, tests/fixtures/README.md, and the removal of root SPEC.md and HANDOFF.md (moved to docs/)
