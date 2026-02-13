# Fast Context MCP

AI-driven semantic code search powered by Windsurf's reverse-engineered SWE-grep protocol.

You can use it in two ways:
- **MCP mode** (for MCP-compatible clients)
- **CLI mode** (recommended for global command + `SKILL.md`, no MCP binding required)

All tools are bundled via npm — **no system-level dependencies** needed (ripgrep via `@vscode/ripgrep`, tree via `tree-node-cli`). Works on macOS, Windows, and Linux.

## How It Works

```
You: "where is the authentication logic?"
         │
         ▼
┌─────────────────────────┐
│  Fast Context MCP       │
│  (local MCP server)     │
│                         │
│  1. Maps project → /codebase
│  2. Sends query to Windsurf Devstral API
│  3. AI generates rg/readfile/tree commands
│  4. Executes commands locally (built-in rg)
│  5. Returns results to AI
│  6. Repeats for N rounds
│  7. Returns file paths + line ranges
│     + suggested search keywords
└─────────────────────────┘
         │
         ▼
Found 3 relevant files.
  [1/3] /project/src/auth/handler.py (L10-60)
  [2/3] /project/src/middleware/jwt.py (L1-40)
  [3/3] /project/src/models/user.py (L20-80)

Suggested search keywords:
  authenticate, jwt.*verify, session.*token
```

## Prerequisites

- **Node.js** >= 18
- **Windsurf account** — free tier works (needed for API key)

No need to install ripgrep — it's bundled via `@vscode/ripgrep`.

## Installation

```bash
git clone https://github.com/gmh5225/fast-context-mcp.git
cd fast-context-mcp
npm install
```

## Setup

### 1. Get Your Windsurf API Key

The server auto-extracts the API key from your local Windsurf installation. You can also use the `extract_windsurf_key` MCP tool after setup, or set `WINDSURF_API_KEY` manually.

Key is stored in Windsurf's local SQLite database:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Windsurf/User/globalStorage/state.vscdb` |
| Windows | `%APPDATA%/Windsurf/User/globalStorage/state.vscdb` |
| Linux | `~/.config/Windsurf/User/globalStorage/state.vscdb` |

### 2. Configure MCP Client

#### Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "fast-context": {
    "command": "node",
    "args": ["/absolute/path/to/fast-context-mcp/src/server.mjs"],
    "env": {
      "WINDSURF_API_KEY": "sk-ws-01-xxxxx"
    }
  }
}
```

#### Claude Desktop

Add to `claude_desktop_config.json` under `mcpServers`:

```json
{
  "fast-context": {
    "command": "node",
    "args": ["/absolute/path/to/fast-context-mcp/src/server.mjs"],
    "env": {
      "WINDSURF_API_KEY": "sk-ws-01-xxxxx"
    }
  }
}
```

> If `WINDSURF_API_KEY` is omitted, the server auto-discovers it from your local Windsurf installation.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WINDSURF_API_KEY` | *(auto-discover)* | Windsurf API key |
| `FC_MAX_TURNS` | `3` | Search rounds per query (more = deeper but slower) |
| `FC_MAX_COMMANDS` | `8` | Max parallel commands per round |
| `FC_TIMEOUT_MS` | `30000` | Connect-Timeout-Ms for streaming requests |
| `FC_ALLOW_INSECURE_TLS_FALLBACK` | `0` | Set to `1` to allow retry with disabled TLS certificate verification (not recommended) |
| `FC_RESULT_MAX_LINES` | `50` | Max lines per command output (truncation) |
| `FC_LINE_MAX_CHARS` | `250` | Max characters per output line (truncation) |
| `WS_MODEL` | `MODEL_SWE_1_6_FAST` | Windsurf model name |
| `WS_APP_VER` | `1.48.2` | Windsurf app version (protocol metadata) |
| `WS_LS_VER` | `1.9544.35` | Windsurf language server version (protocol metadata) |

## Available Models

The model can be changed by setting `WS_MODEL` (see environment variables above).

![Available Models](docs/models.png)

Default: `MODEL_SWE_1_6_FAST` — fastest speed, richest grep keywords, finest location granularity.

## MCP Tools

### `fast_context_search`

AI-driven semantic code search with tunable parameters.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Natural language search query |
| `project_path` | string | No | cwd | Absolute path to project root |
| `tree_depth` | integer | No | `3` | Directory tree depth for repo map (1-6). Higher = more context but larger payload. Auto falls back to lower depth if tree exceeds 250KB. Use 1-2 for huge monorepos (>5000 files), 3 for most projects, 4-6 for small projects. |
| `max_turns` | integer | No | `3` | Search rounds (1-5). More = deeper search but slower. Use 1-2 for simple lookups, 3 for most queries, 4-5 for complex analysis. |
| `max_results` | integer | No | `10` | Maximum number of files to return (1-30). Smaller = more focused, larger = broader exploration. |

Returns:
1. **Relevant files** with line ranges
2. **Suggested search keywords** (rg patterns used during AI search)
3. **Diagnostic metadata** (`[config]` line showing actual tree_depth used, tree size, and whether fallback occurred)

Example output:
```
Found 3 relevant files.

  [1/3] /project/src/auth/handler.py (L10-60, L120-180)
  [2/3] /project/src/middleware/jwt.py (L1-40)
  [3/3] /project/src/models/user.py (L20-80)

grep keywords: authenticate, jwt.*verify, session.*token

[config] tree_depth=3, tree_size=12.5KB, max_turns=3
```

Error output includes status-specific hints:
```
Error: Request failed: HTTP 403

[hint] 403 Forbidden: Authentication failed. The API key may be expired or revoked.
Try re-extracting with extract_windsurf_key, or set a fresh WINDSURF_API_KEY env var.
```

```
Error: Request failed: HTTP 413

[diagnostic] tree_depth_used=3, tree_size=280.0KB (auto fell back from requested depth)
[hint] If the error is payload-related, try a lower tree_depth value.
```

### `extract_windsurf_key`

Extract Windsurf API Key from local installation. No parameters.

## CLI + Skill.md Workflow (No MCP)

If you prefer not to use MCP tools, use the CLI directly and let your assistant call it through `SKILL.md`.

### 1) Install once globally (from GitHub)

```bash
npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"
```

Smart install (skip reinstall if already present, bash/zsh):

```bash
fast-context-mcp --version >/dev/null 2>&1 || npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"
```

Check if already installed:

```bash
fast-context-mcp --version
```

If this command works, skip reinstall.

Optional upgrade:

```bash
npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"
```

> Short form also works: `npm i -g github:gmh5225/fast-context-mcp`

### 2) CLI usage

Run directly after global install:

```bash
fast-context-mcp search --query "where is auth flow implemented" --project-path "/absolute/repo/path"
```

Alias command also works:

```bash
fast-context search --query "where is auth flow implemented" --project-path "/absolute/repo/path"
```

Short flags are also supported:

```bash
fast-context-mcp search -q "where is auth flow implemented" -p "/absolute/repo/path" -d 3 -t 3 -r 10
```

Quick self-check:

```bash
fast-context-mcp --version
fast-context-mcp help
```

JSON output:

```bash
fast-context-mcp search --query "router to service call chain" --project-path "/absolute/repo/path" --json
```

Extract Windsurf key:

```bash
fast-context-mcp extract-key --json
```

Show full key explicitly (use with care):

```bash
fast-context-mcp extract-key --json --reveal
```

If you do not want global install, fallback is still available:

```bash
npx -y fast-context-mcp <command>
```

If `fast-context-mcp` is not found after global install, ensure npm global bin is in your `PATH`.

### 3) Skill file location

This repo includes a ready-to-use skill:

- `.claude/skills/fast-context-cli/SKILL.md`

When your agent supports filesystem skills, it can load this skill and call the CLI automatically.

### 4) Recommended Skill prompt template

Use this template if you want to customize your own `SKILL.md`:

```markdown
### fast-context CLI — Semantic Code Discovery (L2)

When a task requires codebase understanding (unknown module, architecture mapping, call-chain tracing, behavior location, fuzzy intent), use fast-context CLI first.

#### Install policy
- Do not reinstall on every run.
- Check availability first:
  - `fast-context-mcp --version`
- Install globally only when missing:
  - `npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"`
- Optional bash/zsh one-liner:
  - `fast-context-mcp --version >/dev/null 2>&1 || npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"`
- Use `npx -y fast-context-mcp ...` only as fallback when global command is unavailable.

#### Mandatory workflow
1. Build `1` primary query + `2-4` alternate queries + `2-6` grep seed terms.
2. Run CLI search once with the primary query:
   - `fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 3 --max-turns 3 --max-results 10`
3. Use returned file ranges + grep keywords for precision grep/read.
4. If needed, rerun with best alternate query.

#### Query expansion rules
- Add aliases/abbreviations and architecture anchors.
- Add domain entities and lifecycle terms.
- Add bilingual (Chinese/English) paraphrase when useful.
- Keep queries concise and avoid single-token queries.

#### Tuning presets
- Quick triage: `tree_depth=1, max_turns=1, max_results=5`
- Balanced: `tree_depth=3, max_turns=3, max_results=10`
- Deep tracing: `tree_depth=3-4, max_turns=5, max_results=15-20`

#### Retry strategy
- Too shallow: increase `max_turns`, then `max_results`.
- Payload issue: reduce `tree_depth` (`3 -> 2 -> 1`).
- Too noisy: tighten query with concrete endpoint/event/table/class names.
- 401/403: refresh credentials (`fast-context-mcp extract-key --json`) and retry.
- 429: wait and retry with narrower scope.

#### Key safety
- Default to `fast-context-mcp extract-key --json` (masked output).
- Use `--reveal` only when user explicitly requests full key output.
```

## Project Structure

```
fast-context-mcp/
├── package.json
├── .claude/
│   └── skills/
│       └── fast-context-cli/
│           └── SKILL.md      # CLI skill template for agents
├── src/
│   ├── server.mjs        # MCP server entry point
│   ├── cli.mjs           # CLI entry point (global command / npx / skill-based workflow)
│   ├── core.mjs          # Auth, message building, streaming, search loop
│   ├── executor.mjs      # Tool executor: rg, readfile, tree, ls, glob
│   ├── extract-key.mjs   # Windsurf API Key extraction (SQLite)
│   └── protobuf.mjs      # Protobuf encoder/decoder + Connect-RPC frames
├── README.md
└── LICENSE
```

## How the Search Works

1. Project directory is mapped to virtual `/codebase` path
2. Directory tree generated at requested depth (default L=3), with **automatic fallback** to lower depth if tree exceeds 250KB
3. Query + directory tree sent to Windsurf's Devstral model via Connect-RPC/Protobuf
4. Devstral generates tool commands (ripgrep, file reads, tree, ls, glob)
5. Commands executed locally in parallel (up to `FC_MAX_COMMANDS` per round)
6. Results sent back to Devstral for the next round
7. After `max_turns` rounds, Devstral returns file paths + line ranges
8. All rg patterns used during search are collected as suggested keywords
9. Diagnostic metadata appended to help the calling AI tune parameters

## Technical Details

- **Protocol**: Connect-RPC over HTTP/1.1, Protobuf encoding, gzip compression
- **Model**: Devstral (`MODEL_SWE_1_6_FAST`, configurable)
- **Local tools**: `rg` (bundled via @vscode/ripgrep), `readfile` (Node.js fs), `tree` (tree-node-cli), `ls` (Node.js fs), `glob` (Node.js fs)
- **Auth**: API Key → JWT (auto-fetched per session)
- **Runtime**: Node.js >= 18 (ESM)

### Security Notes

- Tool paths are sandboxed to the configured project root (`/codebase` mapping), preventing reads outside the target repo.
- TLS certificate verification remains enabled by default. Insecure fallback is opt-in via `FC_ALLOW_INSECURE_TLS_FALLBACK=1`.

### Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server framework |
| `@vscode/ripgrep` | Bundled ripgrep binary (cross-platform) |
| `tree-node-cli` | Cross-platform directory tree (replaces system `tree`) |
| `better-sqlite3` | Read Windsurf's local SQLite DB |
| `zod` | Schema validation (MCP SDK requirement) |

## License

MIT
