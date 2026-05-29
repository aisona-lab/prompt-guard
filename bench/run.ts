#!/usr/bin/env bun
// prompt-guard benchmark — measures detection quality against a labeled corpus.
//
//   bun bench/run.ts                 # human-readable report
//   bun bench/run.ts --threshold 50  # try a different threshold
//   bun bench/run.ts --json          # machine-readable metrics
//   bun bench/run.ts --file my.jsonl # run against your own dataset
//
// Dataset format: one JSON object per line: {"label":"unsafe"|"safe","prompt":"...","category":"..."}
// "unsafe" is the positive class (a prompt that should be blocked).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scan } from "../src/lib/prompt-guard";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Row {
  label: "unsafe" | "safe";
  prompt: string;
  category?: string;
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const tIdx = args.indexOf("--threshold");
const threshold = tIdx >= 0 ? Number(args[tIdx + 1]) : 30;
const fIdx = args.indexOf("--file");
const datasetPath = fIdx >= 0 ? args[fIdx + 1] : join(__dirname, "dataset.jsonl");

const rows: Row[] = readFileSync(datasetPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => JSON.parse(l));

let tp = 0,
  fp = 0,
  fn = 0,
  tn = 0;
const falsePositives: string[] = [];
const falseNegatives: string[] = [];
const perCategory: Record<string, { hit: number; total: number }> = {};

for (const row of rows) {
  const { risk_score } = scan({ prompt: row.prompt, threshold });
  const predictedUnsafe = risk_score >= threshold;
  const actuallyUnsafe = row.label === "unsafe";

  if (actuallyUnsafe) {
    const cat = row.category ?? "uncategorized";
    perCategory[cat] ??= { hit: 0, total: 0 };
    perCategory[cat].total++;
    if (predictedUnsafe) {
      perCategory[cat].hit++;
    }
  }

  if (predictedUnsafe && actuallyUnsafe) tp++;
  else if (predictedUnsafe && !actuallyUnsafe) {
    fp++;
    falsePositives.push(row.prompt);
  } else if (!predictedUnsafe && actuallyUnsafe) {
    fn++;
    falseNegatives.push(row.prompt);
  } else tn++;
}

const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
const accuracy = (tp + tn) / rows.length;

const pct = (n: number) => (n * 100).toFixed(1) + "%";

if (json) {
  console.log(
    JSON.stringify(
      {
        threshold,
        samples: rows.length,
        confusion: { tp, fp, fn, tn },
        precision,
        recall,
        f1,
        accuracy,
        per_category_recall: Object.fromEntries(
          Object.entries(perCategory).map(([k, v]) => [k, v.hit / v.total])
        ),
      },
      null,
      2
    )
  );
} else {
  console.log(`\nprompt-guard benchmark  (threshold=${threshold}, n=${rows.length})\n`);
  console.log(`  Precision  ${pct(precision)}   (of prompts we flagged, how many were truly unsafe)`);
  console.log(`  Recall     ${pct(recall)}   (of truly unsafe prompts, how many we caught)`);
  console.log(`  F1 score   ${pct(f1)}`);
  console.log(`  Accuracy   ${pct(accuracy)}`);
  console.log(`\n  Confusion:  TP=${tp}  FP=${fp}  FN=${fn}  TN=${tn}`);
  console.log(`\n  Recall by attack category:`);
  for (const [cat, v] of Object.entries(perCategory).sort()) {
    console.log(`    ${cat.padEnd(12)} ${pct(v.hit / v.total).padStart(6)}  (${v.hit}/${v.total})`);
  }
  if (falseNegatives.length) {
    console.log(`\n  Missed attacks (false negatives):`);
    for (const p of falseNegatives) console.log(`    - ${p.slice(0, 80)}`);
  }
  if (falsePositives.length) {
    console.log(`\n  Flagged benign prompts (false positives):`);
    for (const p of falsePositives) console.log(`    - ${p.slice(0, 80)}`);
  }
  console.log();
}

// Fail CI if quality regresses below the documented baseline.
if (args.includes("--check")) {
  const minF1 = 0.85;
  if (f1 < minF1) {
    console.error(`F1 ${pct(f1)} is below the required baseline ${pct(minF1)}`);
    process.exit(1);
  }
}
