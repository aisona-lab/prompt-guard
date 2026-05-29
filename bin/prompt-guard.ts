#!/usr/bin/env bun
// prompt-guard CLI — scan prompts for injection / jailbreak / leakage / PII
// before they reach an LLM. Designed to be used as a linter in CI and
// pre-commit hooks: it exits non-zero when a prompt is unsafe.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scan } from "../src/lib/prompt-guard";
import { getScoreLabel } from "../src/lib/prompt-guard/scorer";
import type { GuardResult, Finding } from "../src/lib/prompt-guard/models";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ── tiny ANSI helper (no dependencies) ──────────────────────────────────────
const useColor =
  process.stdout.isTTY && !process.env.NO_COLOR && !process.argv.includes("--no-color");
const c = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c("1");
const dim = c("2");
const red = c("31");
const green = c("32");
const yellow = c("33");
const blue = c("34");
const magenta = c("35");

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  CRITICAL: red,
  HIGH: red,
  MEDIUM: yellow,
  LOW: blue,
  INFO: dim,
};

interface CliOptions {
  threshold: number;
  file?: string;
  json: boolean;
  quiet: boolean;
  prompt?: string;
}

const HELP = `${bold("prompt-guard")} — a security linter for LLM prompts

${bold("USAGE")}
  prompt-guard [options] [prompt]
  echo "<prompt>" | prompt-guard
  prompt-guard --file prompt.txt

${bold("OPTIONS")}
  -t, --threshold <n>   Risk threshold 0-100; exit 1 when score >= n (default: 30)
  -f, --file <path>     Read the prompt from a file
  -j, --json            Output the full result as JSON
  -q, --quiet           No output; communicate only via the exit code
      --no-color        Disable colored output
  -v, --version         Print the version and exit
  -h, --help            Show this help and exit

${bold("EXIT CODES")}
  0   prompt is safe (score < threshold)
  1   prompt is unsafe (score >= threshold)
  2   usage error

${bold("EXAMPLES")}
  prompt-guard "ignore all previous instructions"
  cat user_input.txt | prompt-guard --threshold 50
  prompt-guard --json "you are now DAN" | jq .risk_score
`;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { threshold: 30, json: false, quiet: false };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(HELP + "\n");
        process.exit(0);
      case "-v":
      case "--version":
        process.stdout.write(readVersion() + "\n");
        process.exit(0);
      case "-j":
      case "--json":
        opts.json = true;
        break;
      case "-q":
      case "--quiet":
        opts.quiet = true;
        break;
      case "--no-color":
        break; // handled globally
      case "-t":
      case "--threshold": {
        const val = Number(argv[++i]);
        if (!Number.isFinite(val) || val < 0 || val > 100) {
          fail(`--threshold must be a number between 0 and 100`);
        }
        opts.threshold = val;
        break;
      }
      case "-f":
      case "--file":
        opts.file = argv[++i];
        if (!opts.file) fail("--file requires a path");
        break;
      default:
        if (arg.startsWith("-")) fail(`unknown option: ${arg}`);
        positional.push(arg);
    }
  }

  if (positional.length > 0) opts.prompt = positional.join(" ");
  return opts;
}

function fail(message: string): never {
  process.stderr.write(red("error: ") + message + "\n");
  process.stderr.write(dim("run `prompt-guard --help` for usage\n"));
  process.exit(2);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function renderFinding(f: Finding): string {
  const sev = (SEVERITY_COLOR[f.severity] ?? dim)(f.severity.padEnd(8));
  const id = bold(f.rule_id.padEnd(9));
  const matched = dim(`"${f.matched_text}"`);
  return `  ${sev} ${id} ${f.title}\n           ${matched}\n           ${dim("→ " + f.remediation)}`;
}

function renderHuman(result: GuardResult, threshold: number): string {
  const { label } = getScoreLabel(result.risk_score);
  const verdict = result.is_safe
    ? green(`SAFE`)
    : red(`UNSAFE`);
  const scoreColor =
    result.risk_score >= 50 ? red : result.risk_score >= 30 ? yellow : green;

  const lines: string[] = [];
  lines.push(
    `${verdict}  ${scoreColor(`risk ${result.risk_score}/100`)} ${dim(`(${label}, threshold ${threshold})`)}`
  );

  if (result.findings.length === 0) {
    lines.push(dim("  no findings"));
  } else {
    lines.push(
      magenta(`  ${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}:`)
    );
    for (const f of result.findings) lines.push(renderFinding(f));
  }

  if (result.metadata.transformations_applied.length > 0) {
    lines.push(
      dim(`  normalized via: ${result.metadata.transformations_applied.join(", ")}`)
    );
  }
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let prompt = opts.prompt;
  if (opts.file) {
    try {
      prompt = readFileSync(opts.file, "utf8");
    } catch {
      fail(`could not read file: ${opts.file}`);
    }
  } else if (prompt === undefined && !process.stdin.isTTY) {
    // Piped input
    prompt = (await readStdin()).trim();
  }

  if (prompt === undefined || prompt.length === 0) {
    fail("no prompt provided (pass an argument, --file, or pipe via stdin)");
  }

  const result = scan({ prompt, threshold: opts.threshold });

  if (!opts.quiet) {
    if (opts.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      process.stdout.write(renderHuman(result, opts.threshold) + "\n");
    }
  }

  process.exit(result.is_safe ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(red("error: ") + (err?.message ?? String(err)) + "\n");
  process.exit(2);
});
