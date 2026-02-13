#!/usr/bin/env node
/**
 * fast-context CLI
 *
 * Usage:
 *   fast-context-mcp search --query "where is auth" [--project-path /repo] [--json]
 *   fast-context-mcp extract-key [--json]
 */

import { cwd, exit } from "node:process";
import { readFileSync } from "node:fs";
import { search, searchWithContent, extractKeyInfo } from "./core.mjs";

const pkgVersion = (() => {
  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf-8");
    return JSON.parse(raw).version || "unknown";
  } catch {
    return "unknown";
  }
})();

function printHelp() {
  process.stdout.write(
    `fast-context-mcp CLI

Commands:
  search       Semantic code search via Windsurf
  extract-key  Extract Windsurf API key from local installation
  help         Show this help
  --version    Show CLI version

Examples:
  fast-context-mcp search --query "where is auth handled"
  fast-context-mcp search --query "router to service flow" --project-path /path/to/repo --tree-depth 3 --max-turns 3
  fast-context-mcp search --query "login flow" --json
  fast-context-mcp extract-key --json

Options (search):
  --query, -q              Natural language query (required)
  --project-path           Project root (default: current working directory)
  --tree-depth             Repo map depth 1-6 (default: 3)
  --max-turns              Search rounds 1-5 (default: 3)
  --max-results            Max files 1-30 (default: 10)
  --max-commands           Max local commands per round (default: 8)
  --timeout-ms             Request timeout in ms (default: 30000)
  --json                   Output raw JSON

Options (extract-key):
  --json                   Output JSON (api_key masked by default)
  --reveal                 Include full api_key in JSON output
`
  );
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) {
      out._.push(t);
      continue;
    }

    const eq = t.indexOf("=");
    if (eq > 0) {
      out[t.slice(2, eq)] = t.slice(eq + 1);
      continue;
    }

    const key = t.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function readInt(value, defaultValue, { min = null, max = null } = {}) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  let v = parsed;
  if (typeof min === "number") v = Math.max(min, v);
  if (typeof max === "number") v = Math.min(max, v);
  return v;
}

function maskApiKey(key) {
  if (!key || typeof key !== "string") return key;
  if (key.length <= 16) return `${key.slice(0, 4)}...${key.slice(-4)}`;
  return `${key.slice(0, 12)}...${key.slice(-8)}`;
}

async function runSearch(args) {
  const query = args.query || args.q || "";
  if (!query.trim()) {
    process.stderr.write("Error: --query is required for search\n\n");
    printHelp();
    exit(2);
  }

  const projectRoot = args["project-path"] || cwd();
  const treeDepth = readInt(args["tree-depth"], 3, { min: 1, max: 6 });
  const maxTurns = readInt(args["max-turns"], 3, { min: 1, max: 5 });
  const maxResults = readInt(args["max-results"], 10, { min: 1, max: 30 });
  const maxCommands = readInt(args["max-commands"], 8, { min: 1, max: 20 });
  const timeoutMs = readInt(args["timeout-ms"], 30000, { min: 1000, max: 300000 });
  const asJson = Boolean(args.json);

  if (asJson) {
    const result = await search({
      query,
      projectRoot,
      maxTurns,
      maxCommands,
      maxResults,
      treeDepth,
      timeoutMs,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const text = await searchWithContent({
    query,
    projectRoot,
    maxTurns,
    maxCommands,
    maxResults,
    treeDepth,
    timeoutMs,
  });
  process.stdout.write(`${text}\n`);
}

function runExtractKey(args) {
  const result = extractKeyInfo();
  if (args.json) {
    const reveal = Boolean(args.reveal);
    if (result.api_key && !reveal) {
      const safe = { ...result, api_key: maskApiKey(result.api_key) };
      process.stdout.write(`${JSON.stringify(safe, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (result.error) {
    process.stderr.write(`Error: ${result.error}\n`);
    if (result.hint) process.stderr.write(`${result.hint}\n`);
    if (result.db_path) process.stderr.write(`DB path: ${result.db_path}\n`);
    exit(1);
  }

  process.stdout.write(
    `Windsurf API key extracted\n` +
      `Key: ${result.api_key.slice(0, 30)}...${result.api_key.slice(-10)}\n` +
      `Length: ${result.api_key.length}\n` +
      `Source: ${result.db_path}\n`
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] || "help";
  const args = parseArgs(argv.slice(1));

  if (command === "--version" || command === "-v" || command === "version") {
    process.stdout.write(`${pkgVersion}\n`);
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "search") {
    await runSearch(args);
    return;
  }

  if (command === "extract-key") {
    runExtractKey(args);
    return;
  }

  process.stderr.write(`Unknown command: ${command}\n\n`);
  printHelp();
  exit(2);
}

main().catch((e) => {
  process.stderr.write(`Fatal error: ${e.message}\n`);
  exit(1);
});
