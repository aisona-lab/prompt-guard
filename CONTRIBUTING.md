# Contributing to prompt-guard

Thanks for your interest in improving prompt-guard! Contributions of all kinds
are welcome — new detection rules, bug fixes, docs, and ideas.

## Development setup

```bash
bun install
bun test          # run the test suite
bun run typecheck # type-check
bun run lint      # lint
bun run dev       # start the web UI on http://localhost:3000
```

## Adding a detection rule

Detection rules live in `src/lib/prompt-guard/detectors/`. Each detector owns a
typed `RuleDefinition[]` array. To add a rule:

1. Add an entry to the relevant `*_RULES` array with a unique `id`
   (e.g. `INJ-011`), a `pattern` (regex source string), `severity`, `category`,
   `description` and `remediation`.
2. Add a test in `tests/scanner.test.ts` covering both a **true positive**
   (the attack is caught) and, where relevant, a **true negative** (a benign
   look-alike is *not* flagged). Precision matters as much as recall.
3. Run `bun test`.

Guidelines:

- Prefer specific patterns over broad ones — a noisy rule that fires on benign
  prompts is worse than no rule.
- Match against the normalized prompt; the normalizer already handles base64,
  hex/unicode escapes, ROT13, leetspeak, homoglyphs and zero-width characters.
- Keep severities calibrated: `CRITICAL` = clear attack, `HIGH` = strong signal,
  `MEDIUM`/`LOW` = weak/contextual signal.

## Pull requests

- Keep PRs focused and include tests.
- Make sure `bun run lint`, `bun run typecheck`, `bun test` and `bun run build`
  all pass (CI runs these on every PR).

By contributing you agree that your contributions are licensed under the MIT
License.
