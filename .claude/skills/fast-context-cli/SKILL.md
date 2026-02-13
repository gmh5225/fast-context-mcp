---
name: fast-context-cli
description: Use this skill for semantic codebase discovery, architecture mapping, fuzzy intent tracing, or unknown-file location. It uses the fast-context CLI (not MCP), installs globally only when missing, and returns file ranges plus follow-up grep keywords.
---

# Fast Context CLI Skill

## When to use

Use this skill first when:
- The user asks where/how logic is implemented.
- The target module/file is unknown.
- You need call-chain tracing (router -> service -> repository -> model).
- The request is conceptual rather than an exact symbol search.
- Cross-language intent (Chinese/English) may improve recall.

## Install policy (important)

- Do **not** reinstall on every run.
- First check whether the command already exists.
- Install globally only when command is missing or broken.
- Upgrade only when user asks, or when a known bug requires update.

### Check command availability

```bash
fast-context-mcp --version
```

### Install globally (only if missing)

```bash
npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"
```

### Verify installation

```bash
fast-context-mcp help
```

### Optional upgrade (on demand)

```bash
npm i -g "git+https://github.com/gmh5225/fast-context-mcp.git"
```

## Required workflow (every search task)

1. Build one primary semantic query and 2-4 short alternate queries.
2. Ensure CLI is available (check first, install only when needed).
3. Run CLI search once with the primary query.
4. If results are weak/noisy, rerun with the best alternate query.
5. Use returned grep keywords for precise follow-up grep/read.
6. In your answer, clearly separate confirmed evidence from inference.

## Query expansion rules

- Add naming variants and abbreviations (auth/authentication/login, ws/websocket, cfg/config).
- Add architecture anchors: router, controller, handler, service, repository, model, middleware, bootstrap.
- Add domain entities and lifecycle words: create/update/delete, event, queue, retry, cache, migration, config/env.
- If the original query is Chinese-only or English-only, include a bilingual paraphrase.
- Keep each query concise but information-dense. Avoid single keyword queries.

## CLI command profiles

```bash
fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 1 --max-turns 1 --max-results 5
```

```bash
fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 3 --max-turns 3 --max-results 10
```

```bash
fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 3 --max-turns 5 --max-results 20
```

```bash
fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --json
```

## Fallback path (no global command)

Use `npx` only when global command is unavailable:

```bash
npx -y fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --json
```

## Key handling policy

- Default key command:
  - `fast-context-mcp extract-key --json` (masked output)
- Do not use `--reveal` unless user explicitly requests full key display.
- Never paste full key into logs or normal replies.

## Retry policy

- Results too shallow: increase `max_turns` first, then `max_results`.
- Payload/size errors: reduce `tree_depth` (3 -> 2 -> 1).
- Too noisy: tighten query with concrete entity names (endpoint, event, table, class, env key).
- 401/403 auth errors: run `extract-key --json`, confirm env/config, retry.
- 429 rate-limit: wait and retry later with smaller scope.

## Output expectations

Your final answer should include:
- Top relevant files with line ranges.
- Why each file is relevant.
- A likely call chain (if applicable).
- 2-5 next grep/read targets based on returned keywords.
