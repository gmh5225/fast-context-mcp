---
name: fast-context-cli
description: Use this skill when tasks require semantic codebase discovery, architecture mapping, fuzzy intent tracing, or unknown-file location. It calls the fast-context CLI (not MCP) and returns file paths, ranges, and follow-up grep keywords.
---

# Fast Context CLI Skill

## When to use

Use this skill first when:
- The user asks where/how logic is implemented.
- The target module/file is unknown.
- You need call-chain tracing (router -> service -> repository -> model).
- The request is conceptual rather than an exact symbol search.
- Cross-language intent (Chinese/English) may improve recall.

## Required workflow

1. Build one primary semantic query and 2-4 short alternate queries.
2. Run CLI search once with the primary query.
3. If results are weak/noisy, rerun with the best alternate query.
4. Use returned grep keywords for precise follow-up grep/read.
5. In your answer, clearly separate confirmed evidence from inference.

## Query expansion rules

- Add naming variants and abbreviations (auth/authentication/login, ws/websocket, cfg/config).
- Add architecture anchors: router, controller, handler, service, repository, model, middleware, bootstrap.
- Add domain entities and lifecycle words: create/update/delete, event, queue, retry, cache, migration, config/env.
- If the original query is Chinese-only or English-only, include a bilingual paraphrase.
- Keep each query concise but information-dense. Avoid single keyword queries.

## CLI commands

### Balanced default

```bash
npx -y fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 3 --max-turns 3 --max-results 10
```

### Quick triage

```bash
npx -y fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 1 --max-turns 1 --max-results 5
```

### Deep tracing

```bash
npx -y fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --tree-depth 3 --max-turns 5 --max-results 20
```

### JSON mode (for machine-friendly post-processing)

```bash
npx -y fast-context-mcp search --query "<PRIMARY_QUERY>" --project-path "<REPO_ROOT>" --json
```

## Retry policy

- Results too shallow: increase `max_turns` first, then `max_results`.
- Payload/size errors: reduce `tree_depth` (3 -> 2 -> 1).
- Too noisy: tighten query with concrete entity names (endpoint, event, table, class, env key).

## Output expectations

Your final answer should include:
- Top relevant files with line ranges.
- Why each file is relevant.
- A likely call chain (if applicable).
- 2-5 next grep/read targets based on returned keywords.
