#!/usr/bin/env node
// Blocks git/gh write operations from Claude Code.
// Exit code 2 = block the tool call; stderr is shown to Claude.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = JSON.parse(input)?.tool_input?.command ?? '';
  } catch {
    process.exit(0); // deny rules in settings.json still apply
  }
  const gitWrite =
    /\bgit\b[^;&|\n]*\b(add|commit|push|merge|rebase|reset|restore|checkout|switch|stash|clean|tag|remote|config|cherry-pick|revert|am|apply)\b/;
  const otherWrite = /(^|[\s;&|])(gh\s|npx\s+gh-pages|npm\s+publish)/;
  if (gitWrite.test(cmd) || otherWrite.test(cmd)) {
    console.error(
      'BLOCKED by project policy: Claude Code may not stage, commit, push, ' +
        'switch branches, or rewrite git state. Stop and tell the user what to commit.'
    );
    process.exit(2);
  }
  process.exit(0);
});
