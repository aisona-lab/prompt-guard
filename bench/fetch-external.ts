#!/usr/bin/env bun
// Fetches a public, third-party prompt-injection dataset and converts it to the
// prompt-guard benchmark format. This gives an *honest* out-of-distribution
// measurement: prompt-guard's rules are NOT tuned against these prompts.
//
//   bun bench/fetch-external.ts
//   bun bench/run.ts --file bench/external/deepset-prompt-injections.jsonl
//
// Source: deepset/prompt-injections (Apache-2.0) — label 1 = injection, 0 = legit.

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://datasets-server.huggingface.co/rows";
const DATASET = "deepset/prompt-injections";

interface Row {
  label: "unsafe" | "safe";
  category: string;
  prompt: string;
}

async function fetchSplit(split: string, length = 100): Promise<Row[]> {
  const url = `${BASE}?dataset=${encodeURIComponent(DATASET)}&config=default&split=${split}&offset=0&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HuggingFace API ${res.status} for split=${split}`);
  const json = await res.json();
  return (json.rows ?? [])
    .map((r: { row: { text: string; label: number } }) => r.row)
    .filter((r: { text?: string }) => typeof r.text === "string" && r.text.trim())
    .map((r: { text: string; label: number }) => ({
      label: r.label === 1 ? "unsafe" : "safe",
      category: "deepset",
      prompt: r.text.replace(/\s+/g, " ").trim(),
    }));
}

const rows = [...(await fetchSplit("train")), ...(await fetchSplit("test"))];
const seen = new Set<string>();
const unique = rows.filter((r) => {
  const k = r.prompt.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const outDir = join(__dirname, "external");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "deepset-prompt-injections.jsonl");
writeFileSync(outFile, unique.map((o) => JSON.stringify(o)).join("\n") + "\n");

const unsafe = unique.filter((r) => r.label === "unsafe").length;
console.log(`Wrote ${unique.length} rows to ${outFile} (unsafe=${unsafe}, safe=${unique.length - unsafe})`);
