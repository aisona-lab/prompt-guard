# Benchmarks

Two datasets measure detection quality from different angles.

## `dataset.jsonl` — curated regression corpus

71 hand-written prompts (40 attacks across all 6 categories, 31 benign including
adversarial look-alikes). The rules **are** tuned against this set, so it works
as a **regression guard**, not an accuracy claim. CI fails if F1 drops below 85%
(`bun bench/run.ts --check`).

```
threshold 30:  Precision 100%  Recall 100%  F1 100%
```

## `external/` — out-of-distribution validation

A third-party dataset prompt-guard's rules were **not** tuned against, fetched
with [`fetch-external.ts`](./fetch-external.ts):

```bash
bun bench/fetch-external.ts
bun bench/run.ts --file bench/external/deepset-prompt-injections.jsonl
```

Source: [`deepset/prompt-injections`](https://huggingface.co/datasets/deepset/prompt-injections)
(Apache-2.0). ~200 prompts, partly German, with subtle social-engineering and
role-play injections.

```
threshold 30:  Precision ~92%  Recall ~20%  F1 ~33%
```

### What this tells you (honestly)

The regex engine is **high-precision, modest-recall** on diverse, real-world,
multilingual traffic. It reliably catches the common English imperative attacks
("ignore previous instructions", DAN, leak attempts) with very few false alarms,
but it misses:

- non-English attacks (no multilingual rules yet),
- ambiguous role-play ("act as a …") that overlaps with legitimate requests,
- novel social-engineering framings.

That gap is exactly why prompt-guard ships an **optional LLM classifier**
(`/api/scan/llm`) and **custom rules** — use regex as a fast, cheap first line of
defense and layer an LLM on top for recall. Don't treat the curated 100% as a
universal number; measure on *your* traffic with `--file`.
